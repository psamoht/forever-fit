
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, SkipForward, CheckCircle2, ChevronLeft, Shuffle, Volume2, Sparkles } from "lucide-react";
import { MOCK_WORKOUT, ALTERNATIVE_EXERCISES, Exercise } from "@/lib/workout-data";
import { Navbar } from "@/components/navbar";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "@/lib/sound-manager";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useProfile } from "@/components/profile-provider";
import { calculateExerciseScore, EXERCISE_SCORING_DICTIONARY, DEFAULT_SCORING, MuscleGroup } from "@/lib/scoring-system";

export default function WorkoutPlayerPage() {
    const router = useRouter();
    const [workoutQueue, setWorkoutQueue] = useState<Exercise[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [isRpePromptVisible, setIsRpePromptVisible] = useState(false);
    const [currentSet, setCurrentSet] = useState(1); // Track current set (1-indexed)
    const [loading, setLoading] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [summaryText, setSummaryText] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryAudioBase64, setSummaryAudioBase64] = useState<string | null>(null);
    const [generatingImage, setGeneratingImage] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [earnedPoints, setEarnedPoints] = useState<number | null>(null);

    // --- Audio Pre-buffering States ---
    const [prefetchedAudio, setPrefetchedAudio] = useState<Record<number, string>>({});
    const [prefetchedImages, setPrefetchedImages] = useState<Record<number, string>>({});
    const [prefetchedSummary, setPrefetchedSummary] = useState<{ audio: string, text: string } | null>(null);

    const { profile: globalProfile, userName, refreshProfile } = useProfile();

    const currentExercise = workoutQueue[currentIndex];
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (!hasFetched.current) {
            hasFetched.current = true;
            fetchWorkout();
        }
    }, []);

    const fetchWorkout = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Determine Theme from Schedule
            let workoutTheme = 'mobility';
            let activityTitle = 'Workout';

            if (user) {
                const days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
                const todayName = days[new Date().getDay()];

                const { data: schedule } = await supabase
                    .from("weekly_schedules")
                    .select("theme, activity_title")
                    .eq("user_id", user.id)
                    .eq("day_of_week", todayName)
                    .single();

                if (schedule?.theme) {
                    workoutTheme = schedule.theme;
                }
                if (schedule?.activity_title) {
                    activityTitle = schedule.activity_title;
                }
            }

            // 2. Fetch User Profile & Equipment for AI Context
            let userProfile = globalProfile || {};
            let userEquipment: string[] = [];

            if (user) {

                const { data: eqData } = await supabase
                    .from("user_equipment")
                    .select("equipment_id")
                    .eq("user_id", user.id);

                if (eqData) {
                    userEquipment = eqData.map(e => e.equipment_id);
                }
            }

            // 3. Generate Custom Workout via AI
            let baseExercises: Exercise[] = [];

            try {
                const res = await fetch('/api/generate-workout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        theme: workoutTheme,
                        activityTitle: activityTitle,
                        profile: userProfile,
                        equipment: userEquipment
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.exercises && data.exercises.length > 0) {
                        baseExercises = data.exercises;
                    }
                } else {
                    console.error("AI Workout Generation failed, status:", res.status);
                }
            } catch (err) {
                console.error("AI Workout Generation error:", err);
            }

            // Fallback if AI fails (e.g. timeout or no keys)
            if (baseExercises.length === 0) {
                const { STRENGTH_EXERCISES } = await import("@/lib/workout-data");
                baseExercises = STRENGTH_EXERCISES.slice(0, 3); // Safe fallback
            }

            let finalExercises: Exercise[] = baseExercises;

            if (user) {
                // 4. Fetch personalized settings (merged) if applicable
                // Note: AI generates reps/duration already, but we keep this for consistency if needed.
                const { data: settings } = await supabase
                    .from('user_exercise_settings')
                    .select('*')
                    .eq('user_id', user.id);

                if (settings && settings.length > 0) {
                    finalExercises = baseExercises.map((ex) => {
                        const userSetting = settings.find(s => s.exercise_id === ex.id);
                        return {
                            ...ex,
                            reps: userSetting?.current_reps || ex.reps,
                            duration: userSetting?.current_duration || ex.duration
                        };
                    });
                }
            }

            setWorkoutQueue(finalExercises);

            // Init first timer if needed
            if (finalExercises.length > 0 && finalExercises[0].mode === 'timer') {
                setTimeLeft(finalExercises[0].duration || 60);
            }

            // Trigger pre-fetch for the first exercise immediately if audio is enabled
            if (isAudioEnabled && finalExercises.length > 0 && userName && userName !== "Du") {
                // Background fetch, don't await
                fetchAudioForIndex(0, finalExercises);
            }

            // Pre-fetch image for the first exercise
            if (finalExercises.length > 0) {
                fetchImageForIndex(0, finalExercises);
            }

        } catch (error) {
            console.error("Error loading workout:", error);
            setWorkoutQueue(MOCK_WORKOUT);
        } finally {
            setLoading(false);
        }
    };

    // Timer Logic - Updates when index changes
    useEffect(() => {
        if (!currentExercise) return;

        setCurrentImageUrl(currentExercise.videoUrl || prefetchedImages[currentIndex] || null);

        if (currentExercise.mode === 'timer') {
            setTimeLeft(currentExercise.duration || 60);
            setIsActive(false); // Valid modification: don't auto-start
        }

        // Reset set counter when changing exercises
        setCurrentSet(1);

        // Auto-play audio if enabled
        if (isAudioEnabled && !isFinished && !loading && userName) {
            fetchAndPlayCoachScript();

            // Pre-fetch next exercise while current is reading/playing
            if (currentIndex < workoutQueue.length - 1) {
                fetchAudioForIndex(currentIndex + 1, workoutQueue);
            } else if (currentIndex === workoutQueue.length - 1) {
                // Pre-fetch summary during the last exercise
                fetchWorkoutSummaryAudio(workoutQueue);
            }
        }

        // Pre-fetch next image independently of audio being enabled
        if (currentIndex < workoutQueue.length - 1) {
            fetchImageForIndex(currentIndex + 1, workoutQueue);
        }

    }, [currentIndex, currentExercise, isFinished, loading, userName, isAudioEnabled]);

    // Timer Interval
    useEffect(() => {
        if (isActive && currentExercise?.mode === 'timer' && timeLeft > 0) {
            if (timeLeft <= 3) {
                playSound('timer');
            }
            timerRef.current = setTimeout(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive && currentExercise?.mode === 'timer') {
            handleNext(); // handleNext already calls playSound('success')
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isActive, timeLeft, currentExercise]);

    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
            audioRef.current = null;
        }
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    const playBase64Audio = (base64String: string) => {
        stopAudio();
        setIsSpeaking(true);
        const audio = new Audio("data:audio/wav;base64," + base64String);
        audioRef.current = audio;
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);

        audio.play().catch(e => {
            if (e.name === 'NotAllowedError') {
                console.warn("Autoplay prevented by browser. User interaction needed first.");
            } else {
                console.warn("Audio playback error:", e);
            }
            setIsSpeaking(false);
        });
    };

    const fetchAudioForIndex = async (index: number, exercises: Exercise[]) => {
        const exercise = exercises[index];
        if (!exercise || prefetchedAudio[index]) return; // Already fetched or invalid

        try {
            console.log(`Pre-fetching audio for index ${index}...`);
            const res = await fetch("/api/coach-script", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    exerciseName: exercise.name,
                    exerciseDescription: exercise.description,
                    isNext: index > 0,
                    userName: userName, // Global context
                    isFirst: index === 0,
                    isLast: index === exercises.length - 1,
                    sets: exercise.sets || 1,
                    reps: exercise.reps || null,
                    duration: exercise.duration || null,
                    mode: exercise.mode || 'reps',
                    muscleGroup: exercise.muscleGroup || null
                })
            });

            const data = await res.json();
            if (data.success && data.audio) {
                setPrefetchedAudio(prev => ({ ...prev, [index]: data.audio }));
                console.log(`Successfully pre-fetched audio for index ${index}.`);
            }
        } catch (error) {
            console.error(`Error pre-fetching audio for index ${index}:`, error);
        }
    };

    const fetchImageForIndex = async (index: number, exercises: Exercise[]) => {
        const exercise = exercises[index];
        if (!exercise || exercise.videoUrl || prefetchedImages[index]) return; // Already fetched or invalid

        try {
            console.log(`Pre-fetching image for index ${index}...`);
            const res = await fetch('/api/generate-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exerciseId: exercise.id,
                    exerciseName: exercise.name,
                    description: exercise.description,
                    gender: globalProfile?.gender,
                    age: globalProfile?.birth_year ? new Date().getFullYear() - globalProfile.birth_year : null
                })
            });
            const data = await res.json();
            if (data.success && data.url) {
                const finalUrl = data.url + "?t=" + Date.now();
                setPrefetchedImages(prev => ({ ...prev, [index]: finalUrl }));
                console.log(`Successfully pre-fetched image for index ${index}.`);
                // Also optionally update workoutQueue directly so it flows naturally
                exercise.videoUrl = finalUrl;
            }
        } catch (error) {
            console.error(`Error pre-fetching image for index ${index}:`, error);
        }
    };

    const fetchWorkoutSummaryAudio = async (exercises: Exercise[]) => {
        if (prefetchedSummary) return; // Already fetched

        try {
            console.log(`Pre-fetching workout summary...`);
            const stats = exercises.map(ex => `${ex.name} (${ex.mode === 'reps' ? ex.reps + ' Wdh.' : ex.duration + ' Sek.'})`).join(", ");
            // We don't have true points yet, but we can estimate base points or just pass 0 for the TTS prompt to ignore.
            const estimatedPoints = exercises.length * 15;

            const res = await fetch("/api/workout-summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userName,
                    currentWorkoutStats: stats,
                    previousWorkoutStats: null,
                    rpeScore: null, // Critical: RPE is pending!
                    totalPoints: estimatedPoints
                })
            });

            const data = await res.json();
            if (data.success && data.audio && data.text) {
                setPrefetchedSummary({ audio: data.audio, text: data.text });
                console.log(`Successfully pre-fetched workout summary.`);
            }
        } catch (error) {
            console.error(`Error pre-fetching summary:`, error);
        }
    };

    const fetchAndPlayCoachScript = async () => {
        if (!currentExercise) return;

        // 1. Play Pre-fetched Audio if available
        if (prefetchedAudio[currentIndex]) {
            console.log(`Playing pre-fetched audio for index ${currentIndex}`);
            playBase64Audio(prefetchedAudio[currentIndex]);
            return;
        }

        // 2. Fallback to live fetch
        try {
            setIsSpeaking(true); // Start loading state visually
            console.log(`Live-fetching audio for index ${currentIndex}...`);
            const res = await fetch("/api/coach-script", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    exerciseName: currentExercise.name,
                    exerciseDescription: currentExercise.description,
                    isNext: currentIndex > 0,
                    userName: userName,
                    isFirst: currentIndex === 0,
                    isLast: currentIndex === workoutQueue.length - 1,
                    sets: currentExercise.sets || 1,
                    reps: currentExercise.reps || null,
                    duration: currentExercise.duration || null,
                    mode: currentExercise.mode || 'reps',
                    muscleGroup: currentExercise.muscleGroup || null
                })
            });

            const data = await res.json();
            if (data.success && data.audio) {
                // Save it to cache just in case we repeat it, then play it
                setPrefetchedAudio(prev => ({ ...prev, [currentIndex]: data.audio }));
                playBase64Audio(data.audio);
            } else {
                setIsSpeaking(false);
            }
        } catch (error) {
            console.error("Error live-fetching coach script:", error);
            setIsSpeaking(false);
        }
    };

    const readDescriptionAloud = () => {
        if (isSpeaking) {
            stopAudio();
        } else {
            fetchAndPlayCoachScript();
        }
    };

    // Auto-generate missing image if URL is completely empty
    useEffect(() => {
        if (currentExercise && !currentExercise.videoUrl && !currentImageUrl && !generatingImage) {
            handleImageError();
        }
    }, [currentExercise, currentImageUrl, generatingImage]);

    const handleImageError = async () => {
        if (generatingImage || !currentExercise) return;
        setGeneratingImage(true);
        try {
            const res = await fetch('/api/generate-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exerciseId: currentExercise.id,
                    exerciseName: currentExercise.name,
                    description: currentExercise.description,
                    gender: globalProfile?.gender,
                    age: globalProfile?.birth_year ? new Date().getFullYear() - globalProfile.birth_year : null
                })
            });
            const data = await res.json();
            if (data.success && data.url) {
                // cache busting to force reload the new image
                const finalUrl = data.url + "?t=" + Date.now();
                setCurrentImageUrl(finalUrl);
                currentExercise.videoUrl = finalUrl;
            } else {
                console.error("API returned failure:", data);
                // Set fallback or clear so it doesn't spin forever without trying again
                setCurrentImageUrl(null);
            }
        } catch (e) {
            console.error("Failed to generate image:", e);
            setCurrentImageUrl(null);
        } finally {
            setGeneratingImage(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center text-white bg-slate-900">Training wird geladen...</div>;
    if (!currentExercise) return null; // Safety

    // Helper functions
    const handleNext = () => {
        stopAudio();
        playSound('success');

        const totalSets = currentExercise?.sets || 1;

        if (currentSet < totalSets) {
            // Advance to next set of the same exercise
            setCurrentSet((prev) => prev + 1);
            if (currentExercise?.mode === 'timer') {
                setTimeLeft(currentExercise.duration || 60);
                setIsActive(false); // Wait for user to start next set
            }
        } else if (currentIndex < workoutQueue.length - 1) {
            // Advance to next exercise
            setCurrentIndex((prev) => prev + 1);
            const nextEx = workoutQueue[currentIndex + 1];
            if (nextEx.mode === 'timer') {
                setTimeLeft(nextEx.duration || 60);
                setIsActive(true);
            } else {
                setIsActive(false); // For reps, we wait for user.
            }
        } else {
            // Workout complete
            stopAudio();
            setIsActive(false);
            setIsRpePromptVisible(true);
        }
    };

    const handleSkip = () => {
        stopAudio();
        // Find an alternative that isn't already in the queue (simple version: just pick first available)
        const alt = ALTERNATIVE_EXERCISES.find(a => !workoutQueue.some(w => w.id === a.id));

        if (alt) {
            const newQueue = [...workoutQueue];
            newQueue[currentIndex] = alt; // Replace current
            setWorkoutQueue(newQueue);

            // Reset for new exercise
            if (alt.mode === 'timer') {
                setTimeLeft(alt.duration || 60);
                setIsActive(true);
            } else {
                setIsActive(false);
            }
            toast.success(`Wir machen stattdessen: ${alt.name}`);
        } else {
            toast.error("Keine weiteren Alternativen verfügbar.");
        }
    };

    const handleDifficultyChange = (variant: Partial<Exercise>) => {
        stopAudio();

        const newQueue = [...workoutQueue];
        const updatedExercise = { ...currentExercise, ...variant };

        // Remove variants to prevent infinite nesting
        delete updatedExercise.easierVariant;
        delete updatedExercise.harderVariant;

        newQueue[currentIndex] = updatedExercise as Exercise;
        setWorkoutQueue(newQueue);

        if (updatedExercise.mode === 'timer') {
            setTimeLeft(updatedExercise.duration || 60);
            setIsActive(false);
        } else {
            setIsActive(false);
        }

        toast.info(`Übung angepasst: ${updatedExercise.name}`);
    };

    const toggleTimer = () => setIsActive(!isActive);

    const finishWorkout = async (rpeScore: number) => {
        setIsRpePromptVisible(false);
        setIsFinished(true);
        playSound('complete');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch current profile stats
            const profile = globalProfile;

            if (profile) {
                // 2. Calculate new stats
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                // Calculate Scientific Scores
                let totalPoints = 0;
                let upperBodyPoints = 0;
                let lowerBodyPoints = 0;
                let corePoints = 0;
                let flexibilityPoints = 0;
                let cardioPoints = 0;

                workoutQueue.forEach(ex => {
                    // Try to get dynamic scoring fields directly from the database/AI-fueled Exercise object
                    const dictFallback = EXERCISE_SCORING_DICTIONARY[ex.id] || DEFAULT_SCORING;
                    const finalMET = ex.baseMET || dictFallback.baseMET;
                    const finalMuscleGroup = ex.muscleGroup || dictFallback.muscleGroup;

                    const performedValue = ex.mode === 'timer' ? (ex.duration || 60) : (ex.reps || 10);
                    const scoredEx = { ...ex, baseMET: finalMET, muscleGroup: finalMuscleGroup };
                    const pts = calculateExerciseScore(scoredEx as any, performedValue);

                    totalPoints += pts;
                    if (finalMuscleGroup === 'Upper Body') upperBodyPoints += pts;
                    if (finalMuscleGroup === 'Lower Body') lowerBodyPoints += pts;
                    if (finalMuscleGroup === 'Core') corePoints += pts;
                    if (finalMuscleGroup === 'Flexibility/Mobility') flexibilityPoints += pts;
                    if (finalMuscleGroup === 'Cardio') cardioPoints += pts;
                });

                let newStreak = profile.streak_current || 0;
                let newPoints = (profile.points || 0) + totalPoints;

                if (profile.last_workout_date) {
                    const lastDate = new Date(profile.last_workout_date);
                    const lastWorkoutDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());

                    const diffTime = Math.abs(today.getTime() - lastWorkoutDay.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        // Consecutive day
                        newStreak += 1;
                        toast.success("Streak erhöht! 🔥");
                    } else if (diffDays > 1) {
                        // Broken streak
                        newStreak = 1;
                        toast.info("Streak neu gestartet.");
                    } else {
                        // Same day, executed again. No streak change, but points stay.
                        toast.success("Zweites Training heute! 💪");
                    }
                } else {
                    // First workout ever
                    newStreak = 1;
                    toast.success("Erster Streak! 🔥");
                }

                // 3. Update Profile
                const { error: profileError } = await supabase.from('profiles').update({
                    streak_current: newStreak,
                    points: newPoints,
                    last_workout_date: now.toISOString()
                }).eq('id', user.id);
                if (profileError) throw profileError;

                // Refresh global profile so changes reflect immediately everywhere
                refreshProfile();

                // 4. Log Workout
                const { data: newWorkoutData, error: workoutError } = await supabase.from('workouts').insert({
                    user_id: profile.id,
                    status: 'completed',
                    end_time: now.toISOString(),
                    points_earned: totalPoints
                }).select('id').single();

                if (workoutError) throw workoutError;

                // 4b. Log individual workout exercises
                if (newWorkoutData && newWorkoutData.id) {
                    const exerciseInserts = workoutQueue.map((ex, index) => ({
                        workout_id: newWorkoutData.id,
                        exercise_id: ex.id,
                        status: 'completed',
                        order_index: index,
                        duration_seconds: ex.mode === 'timer' ? (ex.duration || 60) : (ex.reps || 10) // Approx
                    }));

                    const { error: exercisesError } = await supabase.from('workout_exercises').insert(exerciseInserts);
                    if (exercisesError) console.error("Could not save individual exercises:", exercisesError);
                }

                // Update Weekly Schedule as completed for today
                const dayNamesDe = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
                const todayNameDe = dayNamesDe[now.getDay()];

                const { error: scheduleError } = await supabase
                    .from('weekly_schedules')
                    .update({ is_completed: true })
                    .eq('user_id', profile.id)
                    .eq('day_of_week', todayNameDe);
                if (scheduleError) console.error("Could not update schedule:", scheduleError);

                setEarnedPoints(totalPoints);

                // 5. Fire Confetti
                fireConfetti();

                // 6. Generate Summary
                await generateAndPlaySummary(userName, workoutQueue, totalPoints, rpeScore);
            }
        } catch (error) {
            console.error("Error saving workout:", error);
            toast.error("Fehler beim Speichern des Fortschritts");
        }
    };

    const fireConfetti = () => {
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#34d399', '#fbbf24', '#f87171']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#34d399', '#fbbf24', '#f87171']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    };

    const generateAndPlaySummary = async (userName: string, completedExercises: Exercise[], points: number, rpe: number) => {
        setSummaryLoading(true);
        try {
            // 1. Play Pre-fetched Summary if available
            if (prefetchedSummary) {
                console.log("Using pre-fetched workout summary");
                setSummaryText(prefetchedSummary.text);
                setSummaryAudioBase64(prefetchedSummary.audio);
                playBase64Audio(prefetchedSummary.audio);
                setSummaryLoading(false);
                return;
            }

            // 2. Fallback to live fetch
            console.log("Live-fetching workout summary...");
            // Simplified stats for prompt
            const stats = completedExercises.map(ex => `${ex.name} (${ex.mode === 'reps' ? ex.reps + ' Wdh.' : ex.duration + ' Sek.'})`).join(", ");

            const res = await fetch("/api/workout-summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userName,
                    currentWorkoutStats: stats,
                    previousWorkoutStats: null, // For MVP, we skip fetching historical data to keep it fast
                    rpeScore: rpe,
                    totalPoints: points
                })
            });

            const data = await res.json();
            if (data.success) {
                setSummaryText(data.text);
                if (data.audio) {
                    setSummaryAudioBase64(data.audio);
                    playBase64Audio(data.audio);
                }
            }
        } catch (error) {
            console.error("Failed to generate summary:", error);
        } finally {
            setSummaryLoading(false);
        }
    };

    const playSummaryAudio = () => {
        if (summaryAudioBase64) {
            playBase64Audio(summaryAudioBase64);
        }
    };

    if (isFinished) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in fade-in duration-1000">
                <div className="h-32 w-32 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-2 relative">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                    <CheckCircle2 size={72} />
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Klasse gemacht!</h1>

                    {earnedPoints !== null && (
                        <div className="bg-emerald-900/50 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl max-w-sm mx-auto shadow-inner flex flex-col items-center justify-center gap-1">
                            <span className="text-sm uppercase tracking-wider font-semibold opacity-80">Du hast gesammelt</span>
                            <span className="text-5xl font-black">{earnedPoints} Punkte</span>
                        </div>
                    )}

                    <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl max-w-md mx-auto shadow-xl backdrop-blur-sm">
                        {summaryLoading ? (
                            <p className="text-slate-400 animate-pulse">Coach Theo analysiert dein Training...</p>
                        ) : summaryText ? (
                            <div className="space-y-4">
                                <div className="flex justify-center mb-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="rounded-full bg-slate-700 border-slate-600 text-emerald-400 hover:bg-slate-600"
                                        onClick={playSummaryAudio}
                                    >
                                        <Volume2 size={24} />
                                    </Button>
                                </div>
                                <p className="text-lg text-slate-200 leading-relaxed font-medium italic">"{summaryText}"</p>
                            </div>
                        ) : (
                            <p className="text-slate-300">Du hast das Training erfolgreich beendet. Sei stolz auf dich!</p>
                        )}
                    </div>
                </div>

                <Button size="lg" className="w-full max-w-xs h-16 text-xl rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 shadow-xl" onClick={() => {
                    stopAudio();
                    router.push("/dashboard");
                }}>
                    Zurück zur Übersicht
                </Button>
            </div>
        );
    }

    if (isRpePromptVisible) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in slide-in-from-bottom-8 duration-500 text-white">
                <h2 className="text-3xl md:text-4xl font-bold">Wie anstrengend war das Training?</h2>
                <p className="text-slate-400 text-lg max-w-sm">
                    Auf einer Skala von 1 bis 5. Coach Theo nutzt dies, um dein nächstes Training perfekt anzupassen!
                </p>

                <div className="flex flex-col gap-3 w-full max-w-sm">
                    {[
                        { score: 1, label: "Sehr leicht", emoji: "😌", color: "bg-emerald-900/40 text-emerald-400 border-emerald-700/50 hover:bg-emerald-800/60" },
                        { score: 2, label: "Leicht", emoji: "🙂", color: "bg-teal-900/40 text-teal-400 border-teal-700/50 hover:bg-teal-800/60" },
                        { score: 3, label: "War okay", emoji: "😅", color: "bg-blue-900/40 text-blue-400 border-blue-700/50 hover:bg-blue-800/60" },
                        { score: 4, label: "Anstrengend", emoji: "🥵", color: "bg-orange-900/40 text-orange-400 border-orange-700/50 hover:bg-orange-800/60" },
                        { score: 5, label: "Sehr hart", emoji: "😫", color: "bg-red-900/40 text-red-400 border-red-700/50 hover:bg-red-800/60" },
                    ].map((item) => (
                        <Button
                            key={item.score}
                            variant="outline"
                            className={`h-20 text-xl font-bold transition-all border-2 flex items-center justify-start px-6 gap-4 ${item.color}`}
                            onClick={() => finishWorkout(item.score * 2)} // Map 1-5 back to 1-10 scale internally
                        >
                            <span className="text-3xl">{item.emoji}</span>
                            <span>{item.label}</span>
                        </Button>
                    ))}
                </div>
            </div>
        );
    }

    const progress = ((currentIndex) / workoutQueue.length) * 100;

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => { stopAudio(); router.back(); }}>
                    <ChevronLeft />
                </Button>
                <div className="text-sm font-medium opacity-80">
                    Übung {currentIndex + 1} von {workoutQueue.length}
                </div>
                <div className="w-10"></div> {/* Placeholder to keep "Übung X von Y" centered */}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">

                <div className="text-center space-y-4 w-full">
                    <div className="flex items-center justify-center gap-3">
                        <h2 className="text-2xl md:text-4xl font-bold leading-tight">{currentExercise.name.replace(/\s*\([^)]+\)/g, '')}</h2>
                        <Button
                            variant="secondary"
                            size="icon"
                            className={`rounded-full transition-all ${isSpeaking ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'}`}
                            onClick={readDescriptionAloud}
                            title="Übung vorlesen"
                        >
                            <Volume2 size={24} />
                        </Button>
                    </div>
                    {/* Visual - Maximized Size */}
                    <div className="h-64 md:h-80 w-full bg-white rounded-3xl flex items-center justify-center border-2 border-slate-200 shadow-2xl overflow-hidden relative group">
                        {generatingImage ? (
                            <div className="flex flex-col items-center justify-center gap-4 text-emerald-500 w-full h-full bg-slate-100">
                                <Sparkles size={48} className="animate-pulse duration-1000" />
                                <span className="font-semibold text-sm animate-pulse text-emerald-600">Trainer Coach Theo zeichnet Bild...</span>
                            </div>
                        ) : currentImageUrl || currentExercise.videoUrl ? (
                            <img
                                src={currentImageUrl || currentExercise.videoUrl}
                                alt={currentExercise.name}
                                className="w-full h-full object-contain p-4"
                                onError={handleImageError}
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-slate-400 cursor-pointer hover:text-emerald-500 transition-colors bg-slate-50 w-full h-full justify-center" onClick={handleImageError}>
                                <Sparkles size={48} />
                                <span className="font-semibold text-sm">Bild fehlt. Klicken zum Generieren (AI)</span>
                            </div>
                        )}
                    </div>
                    <p className="text-slate-300 text-lg w-full text-justify leading-relaxed">{currentExercise.description}</p>

                    {/* Difficulty Adjustments */}
                    {(currentExercise.easierVariant || currentExercise.harderVariant) && (
                        <div className="flex items-center justify-center gap-4 mt-2">
                            {currentExercise.easierVariant && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDifficultyChange(currentExercise.easierVariant!)}
                                    className="border-slate-700 bg-slate-800 text-emerald-400 hover:bg-slate-700 hover:text-emerald-300 rounded-full"
                                >
                                    Leichter
                                </Button>
                            )}
                            {currentExercise.harderVariant && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDifficultyChange(currentExercise.harderVariant!)}
                                    className="border-slate-700 bg-slate-800 text-orange-400 hover:bg-slate-700 hover:text-orange-300 rounded-full"
                                >
                                    Schwieriger
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Timer OR Reps Control */}
                <div className="text-center py-4">
                    {/* Visual Sets Tracker (Sätze) */}
                    {currentExercise.sets && currentExercise.sets > 1 && (
                        <div className="flex flex-col items-center gap-2 mb-6">
                            <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">
                                {currentExercise.sets} Sätze
                            </span>
                            <div className="flex items-center gap-3">
                                {Array.from({ length: currentExercise.sets }).map((_, idx) => {
                                    const setNum = idx + 1;
                                    const isCompleted = setNum < currentSet;
                                    const isActiveSet = setNum === currentSet;
                                    return (
                                        <div
                                            key={idx}
                                            className={`h-4 rounded-full transition-all duration-300 ${isCompleted ? 'w-10 bg-emerald-500' :
                                                isActiveSet ? 'w-12 bg-emerald-400 ring-4 ring-emerald-500/30' :
                                                    'w-8 bg-slate-700'
                                                }`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {currentExercise.mode === 'timer' ? (
                        <div className="text-7xl font-mono font-bold tracking-tighter tabular-nums text-emerald-400">
                            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                        </div>
                    ) : (
                        <div className="text-5xl font-bold text-emerald-400">
                            {currentExercise.reps}x
                            <span className="block text-lg text-slate-400 font-normal mt-1">Wiederholungen</span>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6 justify-center">
                    {currentExercise.mode === 'timer' ? (
                        <Button
                            size="icon"
                            className="h-20 w-20 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 shadow-lg ring-4 ring-emerald-500/20 transition-all active:scale-95"
                            onClick={toggleTimer}
                        >
                            {isActive ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
                        </Button>
                    ) : (
                        <Button
                            size="lg"
                            className="h-20 px-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold shadow-emerald-500/20 shadow-lg ring-4 ring-emerald-500/20 transition-all active:scale-95"
                            onClick={handleNext}
                        >
                            <CheckCircle2 className="mr-2 h-8 w-8" />
                            Fertig
                        </Button>
                    )}

                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-16 w-16 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95"
                        onClick={handleSkip}
                        title="Übung überspringen"
                    >
                        <SkipForward size={28} />
                    </Button>
                </div>
            </div>

            {/* Footer Progress */}
            <div className="p-6">
                <Progress value={progress} className="h-2 bg-slate-800" indicatorClassName="bg-emerald-500" />
            </div>
        </div >
    );
}
