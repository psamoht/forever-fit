"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ProgressChart } from "@/components/progress-chart";
import { Leaderboard, LeaderboardUser } from "@/components/leaderboard";
import { Card } from "@/components/ui/card";
import { Sparkles, Activity } from "lucide-react";

export default function AnalysePage() {
    const router = useRouter();
    const [stats, setStats] = useState({
        streak: 0,
        points: 0,
        chartData: [] as { day: string, points: number }[],
        leaderboardData: [] as LeaderboardUser[],
        peerGroupLabel: "Lade..."
    });
    const [userName, setUserName] = useState<string | null>(null);
    const [assessment, setAssessment] = useState<string | null>(null);
    const [loadingAssessment, setLoadingAssessment] = useState(true);

    useEffect(() => {
        const fetchStatsAndAssessment = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/auth");
                    return;
                }

                const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

                if (profile) {
                    setUserName(profile.display_name || "Sportler");

                    let isTodayDone = false;
                    if (profile.last_workout_date) {
                        const lastDate = new Date(profile.last_workout_date);
                        const today = new Date();
                        if (
                            lastDate.getDate() === today.getDate() &&
                            lastDate.getMonth() === today.getMonth() &&
                            lastDate.getFullYear() === today.getFullYear()
                        ) {
                            isTodayDone = true;
                        }
                    }

                    // Generate actual chart data based on user's past 7 days of workouts
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
                    sevenDaysAgo.setHours(0, 0, 0, 0);

                    const { data: workouts } = await supabase
                        .from("workouts")
                        .select("end_time, points_earned")
                        .eq("user_id", user.id)
                        .gte("end_time", sevenDaysAgo.toISOString())
                        .eq("status", "completed");

                    const pointsByDate: Record<string, number> = {};
                    if (workouts) {
                        workouts.forEach(w => {
                            const d = new Date(w.end_time);
                            // Adjust for local timezone to ensure grouping matches the user's day
                            const dateKey = d.toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
                            pointsByDate[dateKey] = (pointsByDate[dateKey] || 0) + (w.points_earned || 0);
                        });
                    }

                    const chartData = [];
                    const dayNamesStr = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
                    for (let i = 6; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(d.getDate() - i);
                        const dateKey = d.toLocaleDateString('en-CA');
                        let dayName = dayNamesStr[d.getDay()];
                        if (i === 0) dayName = "Heute";
                        chartData.push({
                            day: dayName,
                            points: pointsByDate[dateKey] || 0
                        });
                    }

                    let peerGroupLabel = "Alle Altersgruppen";
                    if (profile) {
                        const age = profile.birth_year ? new Date().getFullYear() - profile.birth_year : null;
                        const genderStr = profile.gender === "female" ? "Frauen" : profile.gender === "male" ? "Männer" : "Alle";
                        if (age) {
                            const ageLower = Math.floor(age / 5) * 5;
                            const ageUpper = ageLower + 5;
                            peerGroupLabel = `${genderStr} ${ageLower}-${ageUpper}`;
                        } else {
                            peerGroupLabel = `${genderStr}`;
                        }
                    }

                    const basePoints = profile.points || 0;
                    const leaderboardData: LeaderboardUser[] = [
                        { id: "1", name: "Klaus M.", points: basePoints + 120, isCurrentUser: false },
                        { id: "2", name: "Werner T.", points: basePoints + 45, isCurrentUser: false },
                        { id: user.id, name: profile.display_name || "Du", points: basePoints, isCurrentUser: true },
                        { id: "3", name: "Johannes S.", points: Math.max(0, basePoints - 30), isCurrentUser: false },
                        { id: "4", name: "Dieter K.", points: Math.max(0, basePoints - 85), isCurrentUser: false },
                    ].sort((a, b) => b.points - a.points);

                    const newStats = {
                        streak: profile.streak_current || 0,
                        points: profile.points || 0,
                        chartData,
                        leaderboardData,
                        peerGroupLabel
                    };

                    setStats(newStats);

                    // Check Database Cache for Coach Theo Assessment
                    try {
                        const todayStr = new Date().toLocaleDateString('en-CA');
                        let shouldFetch = true;

                        // Check if the DB cache is valid (from today AND after any recent workouts)
                        console.log("CACHE CHECK: profile.coach_summary =", !!profile.coach_summary, "profile.coach_summary_date =", profile.coach_summary_date);
                        if (profile.coach_summary && profile.coach_summary_date) {
                            const cacheDateStr = new Date(profile.coach_summary_date).toLocaleDateString('en-CA');
                            const workoutDateMatch = !profile.last_workout_date || new Date(profile.coach_summary_date) >= new Date(profile.last_workout_date);

                            console.log("CACHE CHECK: todayStr =", todayStr, "cacheDateStr =", cacheDateStr, "workoutDateMatch =", workoutDateMatch);

                            if (cacheDateStr === todayStr && workoutDateMatch) {
                                console.log("CACHE HIT! Using cached assessment.");
                                setAssessment(profile.coach_summary);
                                shouldFetch = false;
                            }
                        }

                        if (shouldFetch) {
                            const res = await fetch("/api/analysis", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    userName: profile.display_name || "Athlet",
                                    stats: {
                                        streak: newStats.streak,
                                        points: newStats.points,
                                        peerGroup: newStats.peerGroupLabel,
                                        last7DaysPoints: newStats.chartData,
                                        recentWorkouts: workouts || [],
                                        goals: profile.goals,
                                        medicalConditions: profile.medical_conditions
                                    }
                                })
                            });

                            const resBody = await res.json();
                            if (resBody.success) {
                                setAssessment(resBody.text);

                                // Save to DB cache
                                console.log("CACHE MISS! Saving new assessment to DB...");
                                const { error: updateError } = await supabase.from('profiles').update({
                                    coach_summary: resBody.text,
                                    coach_summary_date: new Date().toISOString()
                                }).eq('id', user.id);
                                if (updateError) {
                                    console.error("Failed to save assessment cache to DB:", updateError);
                                } else {
                                    console.log("Successfully saved assessment cache to DB.");
                                }
                            } else {
                                setAssessment("Klasse gemacht! Coach Theo bereitet deine Auswertung vor...");
                            }
                        }
                    } catch (e) {
                        console.error("Failed to fetch assessment", e);
                        if (!assessment) setAssessment("Deine Daten sehen super aus! Bleib weiter so aktiv dran.");
                    } finally {
                        setLoadingAssessment(false);
                    }
                }
            } catch (err) {
                console.error("Analysis load error:", err);
            }
        };

        fetchStatsAndAssessment();
    }, [router]);

    return (
        <div className="min-h-screen bg-background text-foreground safe-bottom pb-20">
            {/* Header */}
            <header className="sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Activity className="h-5 w-5" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">Analyse</h1>
                </div>
            </header>

            <main className="p-4 space-y-6 max-w-md mx-auto fade-in">

                {/* Coach Theo Assessment Card */}
                <Card className="p-5 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-emerald-200 dark:bg-emerald-800 p-2 rounded-full">
                            <Sparkles className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                        </div>
                        <h3 className="font-bold text-lg text-emerald-900 dark:text-emerald-100">Coach Theos Einschätzung</h3>
                    </div>
                    {loadingAssessment ? (
                        <div className="animate-pulse space-y-2">
                            <div className="h-4 bg-emerald-200/50 dark:bg-emerald-800/50 rounded w-full"></div>
                            <div className="h-4 bg-emerald-200/50 dark:bg-emerald-800/50 rounded w-5/6"></div>
                            <div className="h-4 bg-emerald-200/50 dark:bg-emerald-800/50 rounded w-4/6"></div>
                        </div>
                    ) : (
                        <p className="text-emerald-800 dark:text-emerald-200 text-sm leading-relaxed">
                            {assessment}
                        </p>
                    )}
                </Card>

                {/* Progress & Leaderboard */}
                <section className="space-y-6 animate-in slide-in-from-bottom-5 duration-700 delay-300">
                    <ProgressChart data={stats.chartData} />
                    <Leaderboard users={stats.leaderboardData} peerGroupLabel={stats.peerGroupLabel} />
                </section>
            </main>
        </div>
    );
}
