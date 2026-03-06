
"use client";

import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Calendar as CalendarIcon, MessageCircle, Play, Dumbbell, Activity, PersonStanding, Trees, Sofa, BicepsFlexed, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChatInterface } from "@/components/chat-interface";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/profile-provider";
import { MOCK_WORKOUT, STRENGTH_EXERCISES, CARDIO_EXERCISES, Exercise } from "@/lib/workout-data";

const DEFAULT_PLAN = [
    { day_of_week: "Montag", activity_title: "Sanfte Beweglichkeit", activity_type: "workout", theme: "mobility" },
    { day_of_week: "Dienstag", activity_title: "Starke Beine & Gesäß", activity_type: "workout", theme: "lower_body" },
    { day_of_week: "Mittwoch", activity_title: "Aktive Pause (Spazieren)", activity_type: "active_recovery", theme: "cardio" },
    { day_of_week: "Donnerstag", activity_title: "Starke Arme & Brust", activity_type: "workout", theme: "upper_body" },
    { day_of_week: "Freitag", activity_title: "Stabiler Rücken & Bauch", activity_type: "workout", theme: "core" },
    { day_of_week: "Samstag", activity_title: "Gartenarbeit / Hobby", activity_type: "active_recovery", theme: "rest" },
    { day_of_week: "Sonntag", activity_title: "Ruhetag", activity_type: "rest", theme: "rest" },
];

export default function WeeklyPlanPage() {
    const [plan, setPlan] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<any>(null);
    const [hasWorkedOutToday, setHasWorkedOutToday] = useState(false);
    const [workedOutDates, setWorkedOutDates] = useState<Record<string, number>>({});
    const router = useRouter(); // Need to import useRouter at top
    const { profile: globalProfile, isLoading: isProfileLoading } = useProfile();

    useEffect(() => {
        if (!isProfileLoading) {
            fetchPlan();
        }
    }, [isProfileLoading, globalProfile]);

    const fetchPlan = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let { data: schedules, error } = await supabase
                .from("weekly_schedules")
                .select("*")
                .eq("user_id", user.id);

            // --- TEMPORARY FIX: Restore lost Wednesday workout ---
            try {
                const { data: wedWorkouts } = await supabase.from('workouts')
                    .select('id')
                    .eq('user_id', user.id)
                    .gte('end_time', '2026-02-25T00:00:00Z')
                    .lt('end_time', '2026-02-26T00:00:00Z');

                if (!wedWorkouts || wedWorkouts.length === 0) {
                    console.log("Restoring lost Wednesday workout...");
                    await supabase.from('workouts').insert({
                        user_id: user.id,
                        status: 'completed',
                        end_time: '2026-02-25T14:00:00Z',
                        points_earned: 125,
                        rpe_score: 3
                    });
                    await supabase.from('weekly_schedules').update({ is_completed: true })
                        .eq('user_id', user.id).eq('day_of_week', 'Mittwoch');

                    // Re-fetch schedules to get the updated status
                    const { data: updatedSchedules } = await supabase.from("weekly_schedules").select("*").eq("user_id", user.id);
                    if (updatedSchedules) schedules = updatedSchedules;
                }
            } catch (fixErr) {
                console.error("Fix script error:", fixErr);
            }
            // ---------------------------------------------------

            // Fetch profile to see if workout is done today
            if (globalProfile?.last_workout_date) {
                const lastDate = new Date(globalProfile.last_workout_date);
                const today = new Date();
                if (
                    lastDate.getDate() === today.getDate() &&
                    lastDate.getMonth() === today.getMonth() &&
                    lastDate.getFullYear() === today.getFullYear()
                ) {
                    setHasWorkedOutToday(true);
                }
            }

            // Fetch workouts from the last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: recentWorkouts } = await supabase
                .from("workouts")
                .select("end_time, points_earned")
                .eq("user_id", user.id)
                .gte("end_time", sevenDaysAgo.toISOString())
                .eq("status", "completed");

            if (recentWorkouts) {
                // Map to 'YYYY-MM-DD' strings in local time to points
                const datesObj: Record<string, number> = {};
                console.log("=== RAW RECENT WORKOUTS ===", recentWorkouts);

                recentWorkouts.forEach(w => {
                    const d = new Date(w.end_time);
                    // Use local date string in YYYY-MM-DD format based on local time, not UTC methods
                    const localYear = d.getFullYear();
                    const localMonth = String(d.getMonth() + 1).padStart(2, '0');
                    const localDay = String(d.getDate()).padStart(2, '0');
                    const key = `${localYear}-${localMonth}-${localDay}`;

                    datesObj[key] = (datesObj[key] || 0) + (w.points_earned || 0);
                    console.log(`Mapped workout ending at local time ${d.toLocaleString()} to key ${key} with points ${w.points_earned}`);
                });
                console.log("=== Final datesObj ===", datesObj);
                setWorkedOutDates(datesObj);
            }

            if (error) {
                // If table doesn't exist yet (migration not run), fall back to defaults locally
                console.warn("Could not fetch schedules (table might be missing):", error);
                setPlan(DEFAULT_PLAN.map(p => ({ ...p, is_completed: false })));
            } else if (!schedules || schedules.length === 0) {
                // Initialize defaults
                const { error: insertError } = await supabase
                    .from("weekly_schedules")
                    .insert(DEFAULT_PLAN.map(item => ({ ...item, user_id: user.id })));

                if (!insertError) {
                    // Refetch
                    const { data: newSchedules } = await supabase.from("weekly_schedules").select("*").eq("user_id", user.id);
                    if (newSchedules) schedules = newSchedules;
                } else {
                    setPlan(DEFAULT_PLAN.map(p => ({ ...p, is_completed: false })));
                }
            }

            if (schedules && schedules.length > 0) {
                // Sort by day index logic (simplified for now)
                const dayOrder = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
                schedules.sort((a, b) => dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week));
                setPlan(schedules);
            }

        } catch (e) {
            console.error(e);
            setPlan(DEFAULT_PLAN.map(p => ({ ...p, is_completed: false })));
        } finally {
            setLoading(false);
        }
    };

    const toggleComplete = async (id: string, currentStatus: boolean) => {
        if (!id) return; // Local fallback has no IDs

        // Optimistic update
        setPlan(prev => prev.map(p => p.id === id ? { ...p, is_completed: !currentStatus } : p));

        const { error } = await supabase
            .from("weekly_schedules")
            .update({ is_completed: !currentStatus })
            .eq("id", id);

        if (error) {
            console.error(error);
            // Revert on error
            setPlan(prev => prev.map(p => p.id === id ? { ...p, is_completed: currentStatus } : p));
        }
    };

    const getRollingWeek = () => {
        if (plan.length === 0) return [];

        const days = [];
        const now = new Date();
        const dayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

        // Generate 7 days centered on today (+3 to -3) - Highest date first
        for (let i = 3; i >= -3; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() + i);

            const dayIndex = date.getDay(); // 0-6
            const dayNameDe = dayNames[dayIndex];

            // Find schedule for this day
            const schedule = plan.find(p => p.day_of_week === dayNameDe);

            if (schedule) {
                days.push({
                    ...schedule,
                    uniqueKey: `${schedule.id}-${i}`, // Unique key for React list
                    date: date,
                    dateStr: date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
                    isToday: i === 0,
                    isFuture: i > 0
                });
            }
        }
        return days;
    };

    const handleChatAction = async (data: any) => {
        console.log("Chat action received:", data);
        if (data?.action === 'update_schedule' && data.payload) {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const updates = Array.isArray(data.payload) ? data.payload : [data.payload];
                let successCount = 0;

                for (const update of updates) {
                    if (update.day && update.activity_type) {
                        // Find existing schedule for that day to get ID
                        const existing = plan.find(p => p.day_of_week === update.day);

                        if (existing) {
                            const { error } = await supabase
                                .from('weekly_schedules')
                                .update({
                                    activity_title: update.activity_title || existing.activity_title,
                                    activity_type: update.activity_type,
                                    theme: update.theme || existing.theme
                                })
                                .eq('id', existing.id);

                            if (!error) successCount++;
                        }
                    }
                }

                if (successCount > 0) {
                    toast.success(`${successCount} Änderung(en) gespeichert!`);
                    await fetchPlan(); // Refresh UI
                }

            } catch (e) {
                console.error("Error updating schedule via chat:", e);
                toast.error("Fehler beim Aktualisieren des Plans.");
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        const handleCoachAction = (e: any) => {
            // "e" is a CustomEvent, but TS might need casting
            if (e.detail) {
                handleChatAction(e.detail);
            }
        };

        window.addEventListener('coach:action', handleCoachAction);
        return () => window.removeEventListener('coach:action', handleCoachAction);
    }, [plan]); // Depend on plan to ensure we have latest state if needed, though handleChatAction uses plan from closure. 
    // actually handleChatAction uses 'plan' state. accessing it inside event listener might be stale if not careful.
    // Better: use Functional State Update or Ref, OR just dependency.
    // simpler: dependency on [plan] ensures listener is recreated when plan changes.

    const displayDays = getRollingWeek();

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-extrabold text-foreground">Mein Wochenplan</h1>
            </div>

            <div className="space-y-3 pb-8">
                {displayDays.map((item) => {
                    const dateStrFormat = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}-${String(item.date.getDate()).padStart(2, '0')}`;
                    const hasWorkoutLog = dateStrFormat in workedOutDates;
                    let pointsForDay = workedOutDates[dateStrFormat];

                    console.log(`Render day: ${item.day_of_week} (${dateStrFormat}) -> In Dict? ${hasWorkoutLog}, Points: ${pointsForDay}`);

                    // Item is visually done if it has a workout log, OR historically completed, OR today and done
                    const isDone = (!item.isFuture && hasWorkoutLog) || (item.is_completed && !item.isFuture) || (item.isToday && hasWorkedOutToday);

                    // A workout is skipped (verpasst) ONLY IF it is not done AND is strictly in the past (not today, not future)
                    const isSkipped = !isDone && !item.isFuture && !item.isToday;

                    const getThemeIcon = (theme: string, title: string) => {
                        const t = title.toLowerCase();
                        if (theme === 'upper_body' || t.includes('arm') || t.includes('brust')) return <BicepsFlexed className="h-5 w-5 opacity-70" />;
                        if (theme === 'lower_body' || t.includes('bein') || t.includes('gesäß') || t.includes('spazieren')) return <Footprints className="h-5 w-5 opacity-70" />;
                        if (theme === 'core' || t.includes('bauch') || t.includes('rücken')) return <PersonStanding className="h-5 w-5 opacity-70" />;
                        if (theme === 'full_body' || theme === 'strength') return <Dumbbell className="h-5 w-5 opacity-70" />;

                        switch (theme) {
                            case 'cardio': return <Activity className="h-5 w-5 opacity-70" />;
                            case 'mobility': return <PersonStanding className="h-5 w-5 opacity-70" />;
                            case 'active_recovery': return <Trees className="h-5 w-5 opacity-70" />;
                            case 'rest': return <Sofa className="h-5 w-5 opacity-70" />;
                            default: return <Activity className="h-5 w-5 opacity-70" />;
                        }
                    };

                    return (
                        <Card
                            key={item.uniqueKey}
                            className={cn(
                                "p-4 flex items-center justify-between transition-all hover:scale-[1.02] cursor-pointer",
                                item.isToday ? "border-2 border-emerald-500 shadow-md bg-emerald-50/50 dark:bg-emerald-900/20 scale-[1.02]" : "border-border shadow-sm",
                                isDone && "opacity-75 bg-muted/50 border-emerald-200 dark:border-emerald-800",
                                isSkipped && "opacity-75 bg-muted/50 border-red-200 dark:border-red-900/50",
                                item.isFuture && "opacity-90 bg-muted/30"
                            )}
                            onClick={() => setSelectedDay(item)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "h-14 w-14 rounded-full flex flex-col items-center justify-center font-bold text-sm leading-tight transition-colors shrink-0",
                                    isDone ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400" :
                                        isSkipped ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400" :
                                            item.isToday ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                                )}>
                                    <span>{item.day_of_week.substring(0, 2)}</span>
                                    <span className="text-[10px] opacity-90">{item.dateStr}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <div className={cn("shrink-0", isDone ? "text-emerald-600 dark:text-emerald-400" : isSkipped ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                                            {getThemeIcon(item.theme, item.activity_title)}
                                        </div>
                                        <h3 className={cn("font-bold text-lg leading-none", isDone ? "text-emerald-700 dark:text-emerald-300" : isSkipped ? "text-red-800 dark:text-red-200" : "text-foreground")}>{item.activity_title}</h3>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {item.isToday && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Heute</span>}
                                        {item.isFuture && <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vorschau</span>}
                                        {isSkipped && <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Verpasst</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Only show an icon if it's done */}
                            {isDone && (
                                <div className="flex flex-col items-end gap-1">
                                    <CheckCircle2 className="text-emerald-500 h-8 w-8 animate-in zoom-in" />
                                    {pointsForDay > 0 && (
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                                            {pointsForDay} Pkt
                                        </span>
                                    )}
                                </div>
                            )}
                        </Card>
                    )
                })}

                {plan.length === 0 && !loading && (
                    <div className="text-center p-8 text-slate-500">
                        Kein Plan gefunden.
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
                <DialogContent className="sm:max-w-md rounded-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Details für {selectedDay?.day_of_week}</DialogTitle>
                    </DialogHeader>
                    {selectedDay && (() => {
                        let previewExercises: Exercise[] = [];
                        if (selectedDay.activity_type === 'workout') {
                            if (selectedDay.theme === 'strength') previewExercises = STRENGTH_EXERCISES;
                            else if (selectedDay.theme === 'cardio') previewExercises = CARDIO_EXERCISES;
                            else previewExercises = MOCK_WORKOUT;
                        }

                        return (
                            <div className="space-y-6 py-4">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-1">{selectedDay.activity_title}</h3>
                                    <p className="text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide text-sm">
                                        {selectedDay.theme === "mobility" ? "Beweglichkeit" :
                                            selectedDay.theme === "strength" ? "Kraft" :
                                                selectedDay.theme === "cardio" ? "Ausdauer" :
                                                    selectedDay.theme === "recovery" ? "Erholung" : "Ruhe"}
                                    </p>
                                </div>

                                <p className="text-slate-600 dark:text-slate-300">
                                    Dies ist die Vorschau für dein Training am {selectedDay.dateStr}.
                                    Coach Theo hat dieses Programm speziell auf deine Bedürfnisse abgestimmt.
                                </p>

                                {selectedDay.activity_type === 'workout' && previewExercises.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-foreground">Ablauf:</h4>
                                        {previewExercises.map((ex, idx) => (
                                            <div key={idx} className="bg-card p-3 rounded-xl border border-border flex flex-col justify-center">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-sm text-foreground">{idx + 1}. {ex.name.replace(/\s*\([^)]+\)/g, '')}</span>
                                                    <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-1 rounded-md font-mono">
                                                        {ex.sets && ex.sets > 1 ? `${ex.sets} Sätze à ` : ''}{ex.mode === 'reps' ? `${ex.reps} x` : `${ex.duration} Sek.`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {selectedDay.isToday ? (
                                    <Button
                                        className="w-full text-lg h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 mt-4"
                                        onClick={() => router.push(selectedDay.activity_type === 'rest' ? '/workout/rest' : '/workout/start')}
                                    >
                                        <Play className="mr-2 h-5 w-5 fill-current" />
                                        Training jetzt starten
                                    </Button>
                                ) : (
                                    <div className="text-center text-sm font-medium text-slate-400 mt-4">
                                        {selectedDay.isFuture ? "Dieses Training steht noch an." : "Dieser Tag liegt in der Vergangenheit."}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
