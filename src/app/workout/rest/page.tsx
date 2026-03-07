"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle2, Trophy, Flame, Calendar, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export default function RestDayPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState("Sportler");
    const [stats, setStats] = useState({
        streak: 0,
        points: 0,
        totalWorkouts: 0,
    });
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [countdown, setCountdown] = useState(8);
    const [activityTitle, setActivityTitle] = useState("Ruhetag");
    const [activityType, setActivityType] = useState("rest");

    useEffect(() => {
        fetchUserData();
    }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isConfirmed && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        } else if (isConfirmed && countdown === 0) {
            router.push('/dashboard');
        }
        return () => clearInterval(timer);
    }, [isConfirmed, countdown, router]);

    const fetchUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (profile) {
                setUserName(profile.display_name || "Sportler");
                setStats({
                    streak: profile.streak_current || 0,
                    points: profile.points || 0,
                    // We might want to count actual workouts from 'workouts' table later
                    // For now, let's use points as a proxy for effort or fetch actual count
                    totalWorkouts: Math.floor((profile.points || 0) / 100)
                });
            }

            // Fetch today's schedule
            const days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
            const todayName = days[new Date().getDay()];

            const { data: schedule } = await supabase
                .from("weekly_schedules")
                .select("*")
                .eq("user_id", user.id)
                .eq("day_of_week", todayName)
                .single();

            if (schedule) {
                setActivityTitle(schedule.activity_title || "Ruhetag");
                setActivityType(schedule.activity_type || "rest");
            }

            // Fetch actual workout count
            const { count } = await supabase
                .from("workouts")
                .select("*", { count: 'exact', head: true })
                .eq("user_id", user.id)
                .eq("status", "completed");

            if (count !== null) {
                setStats(prev => ({ ...prev, totalWorkouts: count }));
            }

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const confirmRestDay = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setLoading(true);

            const { data: profile } = await supabase
                .from('profiles')
                .select('id, streak_current, points, last_workout_date')
                .eq('id', user.id)
                .single();

            if (profile) {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                // GUARD: Prevent confirming rest day more than once per day
                if (profile.last_workout_date) {
                    const lastDate = new Date(profile.last_workout_date);
                    const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
                    if (lastDay.getTime() === today.getTime()) {
                        toast.info("Bereits für heute bestätigt!");
                        setIsConfirmed(true);
                        setLoading(false);
                        return;
                    }
                }

                let newStreak = profile.streak_current || 0;
                // No points for rest/recovery days — points reward real effort
                const newPoints = profile.points || 0;

                if (profile.last_workout_date) {
                    const lastDate = new Date(profile.last_workout_date);
                    const lastWorkoutDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
                    const diffTime = Math.abs(today.getTime() - lastWorkoutDay.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) newStreak += 1;
                    else if (diffDays > 1) newStreak = 1;
                } else {
                    newStreak = 1;
                }

                await supabase.from('profiles').update({
                    streak_current: newStreak,
                    points: newPoints,
                    last_workout_date: now.toISOString()
                }).eq('id', user.id);

                // Log a rest entry for history (0 points)
                await supabase.from('workouts').insert({
                    user_id: user.id,
                    status: 'completed',
                    end_time: now.toISOString(),
                    points_earned: 0,
                    feedback_text: activityType !== 'rest' ? `${activityTitle} abgeschlossen` : "Ruhetag genossen",
                    theme: activityType !== 'rest' ? 'aktiv' : 'rest'
                });

                // Fire telemetry to admin dashboard silently
                fetch('/api/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        type: 'workout_completed',
                        description: activityType === 'aktiv' ? activityTitle : `Ruhetag`,
                        metadata: { points: 10, isRestDay: true, activityType }
                    }),
                }).catch(() => { });


                setStats(prev => ({
                    ...prev,
                    streak: newStreak,
                    points: newPoints
                }));

                const runConfetti = () => {
                    try {
                        confetti({
                            particleCount: 100,
                            spread: 70,
                            origin: { y: 0.6 },
                            colors: ['#34d399', '#60a5fa', '#f472b6']
                        });
                    } catch (e) {
                        console.error("Confetti error:", e);
                    }
                }

                setIsConfirmed(true);
                runConfetti();

                toast.success(activityType === 'aktiv' ? "Aktivität bestätigt! Stark gemacht." : "Ruhetag bestätigt! Erholung ist wichtig.");
            }
        } catch (error) {
            console.error("Error confirming rest day:", error);
            toast.error("Fehler beim Speichern");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !isConfirmed) {
        return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse h-12 w-12 bg-emerald-100 rounded-full"></div></div>;
    }

    return (
        <div className="min-h-screen bg-background p-6 pb-24 flex flex-col items-center">
            <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-xl font-bold">{activityTitle}</h1>
                    <div className="w-10"></div>
                </div>

                {isConfirmed ? (
                    <div className="flex flex-col items-center text-center space-y-6 pt-10">
                        <div className="h-24 w-24 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2 animate-in zoom-in duration-500">
                            <CheckCircle2 size={48} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-foreground">{activityType === 'aktiv' ? 'Aktivität registriert!' : 'Erholung registriert!'}</h2>
                        <p className="text-muted-foreground text-lg">
                            Klasse, {userName}! Du hast auf deinen Körper gehört. Dein Streak läuft weiter!
                        </p>

                        <div className="grid grid-cols-2 gap-4 w-full mt-6">
                            <Card className="p-4 flex flex-col items-center justify-center bg-card border-border">
                                <span className="text-3xl font-bold text-orange-500">{stats.streak}</span>
                                <span className="text-xs text-muted-foreground uppercase font-bold">Tage Streak</span>
                            </Card>
                            <Card className="p-4 flex flex-col items-center justify-center bg-card border-border">
                                <span className="text-3xl font-bold text-yellow-500">{stats.points}</span>
                                <span className="text-xs text-muted-foreground uppercase font-bold">Punkte</span>
                            </Card>
                        </div>

                        {/* Circular Countdown Button */}
                        <div className="mt-12 relative flex items-center justify-center">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="relative flex items-center justify-center h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/50 hover:scale-105 transition-transform outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <ArrowLeft className="h-8 w-8 text-emerald-700 dark:text-emerald-300" />

                                {/* SVG Ring */}
                                <svg
                                    height="84"
                                    width="84"
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 pointer-events-none"
                                >
                                    <circle
                                        stroke="currentColor"
                                        fill="transparent"
                                        strokeWidth="4"
                                        strokeDasharray="238 238"
                                        style={{
                                            strokeDashoffset: 238 - (countdown / 8) * 238,
                                            transition: 'stroke-dashoffset 1s linear'
                                        }}
                                        r="38"
                                        cx="42"
                                        cy="42"
                                        className="text-emerald-600 dark:text-emerald-400"
                                    />
                                </svg>
                            </button>
                            <p className="absolute -bottom-10 text-xs text-muted-foreground font-medium w-full text-center">
                                Automatisch weiter in {countdown}s
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Coach Message */}
                        <div className="relative bg-card border border-border rounded-3xl p-8 shadow-lg text-center space-y-4">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-br from-emerald-400 to-teal-600 h-16 w-16 rounded-full flex items-center justify-center border-4 border-background shadow-md">
                                <span className="text-2xl">{activityType === 'aktiv' ? '🚶' : '🧘'}</span>
                            </div>

                            <div className="pt-6 space-y-3">
                                <h2 className="text-2xl font-bold text-foreground">Hallo {userName}!</h2>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    "Pause ist kein Stillstand, sondern Teil des Fortschritts.
                                    Du hast in letzter Zeit {stats.totalWorkouts} Workouts absolviert.
                                    Das ist eine fantastische Leistung!"
                                </p>
                                <p className="text-base text-foreground font-medium">
                                    {activityType === 'aktiv'
                                        ? `Viel Spaß bei deiner aktiven Erholung: ${activityTitle}. Vergiss nicht, ausreichend zu trinken!`
                                        : 'Nimm dir heute bewusst Zeit für dich. Ein Spaziergang, Stretching oder einfach mal Nichts tun.'}
                                </p>
                            </div>
                        </div>

                        {/* Stats Showcase */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Dein bisheriger Erfolg</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center gap-4 bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                                    <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                                        <Flame size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground text-lg">{stats.streak} Tage</p>
                                        <p className="text-xs text-muted-foreground">Aktueller Streak</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <Trophy size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground text-lg">{stats.totalWorkouts} Workouts</p>
                                        <p className="text-xs text-muted-foreground">Insgesamt geschafft</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 rounded-2xl"
                            onClick={confirmRestDay}
                            disabled={submitting}
                        >
                            {submitting ? "Speichere..." : (activityType === 'aktiv' ? 'Aktivität abschließen' : "Ich genieße meinen Ruhetag")}
                        </Button>

                        <p className="text-center text-xs text-muted-foreground">
                            Klicke oben, um den Tag als "erledigt" zu markieren und deinen Streak zu behalten.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
