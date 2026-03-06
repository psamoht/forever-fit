"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Play, TrendingUp, Clock, Flame, Star, Calendar, MessageCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { WorkoutCard } from "@/components/workout-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChatInterface } from "@/components/chat-interface";
import { useProfile } from "@/components/profile-provider";

const themeTranslations: Record<string, string> = {
    strength: "Kraft",
    mobility: "Beweglichkeits",
    cardio: "Ausdauer",
    balance: "Gleichgewichts",
    recovery: "Erholungs",
    rest: "Ruhe"
};

export default function DashboardPage() {
    const router = useRouter();
    const { profile: globalProfile, userName: globalUserName, isLoading: isProfileLoading } = useProfile();
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState<string | null>(null);
    const [stats, setStats] = useState({
        workouts: 0,
        minutes: 0,
        streak: 0,
        points: 0,
        isTodayDone: false,
        todaysWorkout: { title: "Lade...", theme: "mobility", isRest: false }
    });

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Guten Morgen");
        else if (hour < 18) setGreeting("Guten Tag");
        else setGreeting("Guten Abend");
    }, []);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/auth");
                    return;
                }
                if (globalProfile) {
                    // Fetch today's schedule
                    const days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
                    const todayName = days[new Date().getDay()];

                    const { data: schedule } = await supabase
                        .from("weekly_schedules")
                        .select("*")
                        .eq("user_id", user.id)
                        .eq("day_of_week", todayName)
                        .single();

                    let workoutTitle = "Morgen-Mobilisierung"; // Fallback
                    let workoutTheme = "mobility";
                    let isRestDay = false;

                    if (schedule) {
                        workoutTitle = schedule.activity_title;
                        workoutTheme = schedule.theme || "mobility";
                        if (schedule.activity_type === 'rest') isRestDay = true;
                    }

                    // Check completion (still using last_workout_date logic for now)
                    let isTodayDone = false;
                    // Check if last_workout_date exists and compare
                    if (globalProfile.last_workout_date) {
                        const lastDate = new Date(globalProfile.last_workout_date);
                        const today = new Date();
                        // Check if same day, month, and year explicitly to avoid timezone edge cases with toDateString
                        if (
                            lastDate.getDate() === today.getDate() &&
                            lastDate.getMonth() === today.getMonth() &&
                            lastDate.getFullYear() === today.getFullYear()
                        ) {
                            isTodayDone = true;
                        }
                    }

                    setStats(prev => ({
                        ...prev,
                        streak: globalProfile.streak_current || 0,
                        points: globalProfile.points || 0,
                        isTodayDone,
                        todaysWorkout: { title: workoutTitle, theme: workoutTheme, isRest: isRestDay }
                    }));
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (!isProfileLoading) {
            checkUser();
        }
    }, [router, isProfileLoading, globalProfile]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };



    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 bg-emerald-100 rounded-full"></div>
                    <div className="h-4 w-32 bg-slate-200 rounded"></div>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 bg-emerald-100 rounded-full"></div>
                    <div className="h-4 w-32 bg-slate-200 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-32">

            <main className="container max-w-md mx-auto px-6 pt-8 space-y-10">

                {/* Header */}
                <div className="flex items-center justify-between animate-in slide-in-from-top-5 duration-700">
                    <div className="space-y-1">
                        <p className="text-muted-foreground font-medium text-sm result-sm uppercase tracking-wider">{greeting || "Hallo"},</p>
                        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{globalUserName}</h1>
                    </div>
                    <Link href="/profile">
                        <div className="relative group cursor-pointer">
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                            <div className="relative h-14 w-14 rounded-full bg-card flex items-center justify-center text-emerald-600 font-bold text-xl border-4 border-background shadow-sm overflow-hidden">
                                {globalProfile?.photo_url ? (
                                    <img src={globalProfile.photo_url} alt="Profil" className="h-full w-full object-cover" />
                                ) : (
                                    <span>{globalUserName ? globalUserName[0].toUpperCase() : "U"}</span>
                                )}
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-5 duration-700 delay-100">
                    <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex flex-col items-center justify-center space-y-2">
                        <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <Flame size={20} fill="currentColor" />
                        </div>
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-foreground">{stats.streak}</span>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Tage Streak</span>
                        </div>
                    </div>
                    <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex flex-col items-center justify-center space-y-2">
                        <div className="h-10 w-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                            <Star size={20} fill="currentColor" />
                        </div>
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-foreground">{stats.points}</span>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Punkte</span>
                        </div>
                    </div>
                </div>

                {/* Workout Card */}
                <section className="space-y-6 animate-in slide-in-from-bottom-5 duration-700 delay-200">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xl font-bold text-foreground">
                            {stats.isTodayDone ? "Training abgeschlossen" : "Dein Plan für heute"}
                        </h2>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full uppercase tracking-wide">
                            {stats.isTodayDone ? "Tagesziel erreicht" : new Date().toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </span>
                    </div>

                    <div className="transform hover:scale-[1.02] transition-transform duration-300">
                        {stats.isTodayDone ? (
                            <WorkoutCard
                                title="Abend-Entspannung"
                                description="Ein leichtes Programm, um den Tag ruhig ausklingen zu lassen."
                                durationMin={10}
                                intensity="low"
                                completed={true}
                                // We don't mark this as 'completed' so the user can start it
                                onStart={() => router.push("/workout/start")}
                            />
                        ) : stats.todaysWorkout.isRest ? (
                            <div onClick={() => router.push("/workout/rest")} className="cursor-pointer">
                                <Card className="p-6 border-none bg-blue-50 dark:bg-blue-900/20 shadow-md flex items-center gap-4 hover:shadow-lg transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 dark:bg-blue-800/20 rounded-bl-[100px] -mr-4 -mt-4 z-0 transition-transform duration-700 group-hover:scale-125" />
                                    <div className="h-16 w-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-500 dark:text-blue-300 shrink-0 z-10 relative group-hover:scale-110 transition-transform">
                                        <Clock size={32} />
                                    </div>
                                    <div className="z-10 relative">
                                        <h3 className="text-xl font-bold text-foreground mb-1">Ruhetag</h3>
                                        <p className="text-muted-foreground">Heute steht Erholung an. Hier tippen.</p>
                                    </div>
                                </Card>
                            </div>
                        ) : (
                            <WorkoutCard
                                title={stats.todaysWorkout.title}
                                description={`Dein Coach hat für heute ein ${themeTranslations[stats.todaysWorkout.theme] || stats.todaysWorkout.theme}-Programm zusammengestellt.`}
                                durationMin={15}
                                intensity="medium"
                            />
                        )}
                    </div>
                </section>



                {/* Quick Actions */}
                <section className="grid grid-cols-1 gap-4 animate-in slide-in-from-bottom-5 duration-700 delay-400">
                    <Link href="/plan" className="block">
                        <Card className="p-5 flex flex-col items-center justify-center gap-4 hover:bg-accent transition-colors cursor-pointer border-none bg-card shadow-lg shadow-black/5 dark:shadow-black/20 rounded-3xl group h-full">
                            <div className="h-12 w-12 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Calendar size={24} />
                            </div>
                            <span className="font-bold text-foreground text-sm">Wochenplan</span>
                        </Card>
                    </Link>
                </section>

                {/* Logout */}
                <div className="pt-8 text-center animate-in fade-in duration-1000 delay-500">
                    <Button variant="ghost" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" /> Abmelden
                    </Button>
                </div>
            </main>
        </div>
    );
}
