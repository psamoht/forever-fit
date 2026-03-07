"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChatInterface } from "@/components/chat-interface";
import { Loader2, UserRound, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function OnboardingPage() {
    const [step, setStep] = useState<"name" | "assessment" | "generating">("name");
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleNameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth");
                return;
            }

            // Create minimal profile with just the name — Theo will fill in the rest
            const { error } = await supabase
                .from("profiles")
                .upsert({
                    id: user.id,
                    display_name: name.trim(),
                    goals: "Not set",
                    medical_conditions: "Not set",
                });

            if (error) throw error;
            setStep("assessment");
        } catch (err: any) {
            console.error("Error creating profile:", err);
            alert("Fehler beim Anlegen des Profils. Bitte erneut versuchen.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssessmentComplete = async (data: any) => {
        console.log("Assessment complete — saving all data:", data);
        setStep("generating");

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Build the profile update from Theo's structured assessment
            const profileUpdate: any = {};

            if (data.goals) profileUpdate.goals = data.goals;

            if (data.medical_conditions) {
                profileUpdate.medical_conditions = Array.isArray(data.medical_conditions)
                    ? JSON.stringify(data.medical_conditions)
                    : data.medical_conditions;
            }

            if (data.equipment) {
                profileUpdate.equipment = Array.isArray(data.equipment)
                    ? data.equipment
                    : [data.equipment];
            }

            if (data.gender) profileUpdate.gender = data.gender;

            if (data.age) {
                profileUpdate.birth_year = new Date().getFullYear() - Number(data.age);
            }

            if (data.weight) profileUpdate.weight = Number(data.weight);

            // Save training preferences in training_state
            const trainingState: any = {
                progression_factor: 1.0,
                recovery_status: "ready",
            };
            if (data.days_per_week) trainingState.preferred_days_per_week = data.days_per_week;
            if (data.minutes_per_session) trainingState.preferred_minutes = data.minutes_per_session;
            profileUpdate.training_state = trainingState;

            // Save schedule preference text (for initial plan generation)
            if (data.schedule) profileUpdate.schedule = data.schedule;

            const { error } = await supabase
                .from("profiles")
                .update(profileUpdate)
                .eq("id", user.id);

            if (error) throw error;

            // Generate initial workout schedule
            try {
                const res = await fetch("/api/generate-schedule", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: user.id,
                        goals: data.goals,
                        medical_conditions: data.medical_conditions,
                        equipment: data.equipment,
                        days_per_week: data.days_per_week,
                        minutes_per_session: data.minutes_per_session,
                    }),
                });

                if (!res.ok) {
                    console.warn("Schedule generation returned non-OK, will use defaults");
                }
            } catch (scheduleErr) {
                console.warn("Could not auto-generate schedule, user can set manually:", scheduleErr);
            }

            router.push("/dashboard");

        } catch (err) {
            console.error("Error saving assessment:", err);
            // Still try to go to dashboard
            router.push("/dashboard");
        }
    };

    // Step 1: Name
    if (step === "name") {
        return (
            <div className="flex flex-col gap-8 pt-12 animate-in slide-in-from-bottom-5 duration-700">
                <div className="text-center space-y-4">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg text-slate-700 mb-2">
                        <UserRound size={32} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-800">Wie dürfen wir dich nennen?</h1>
                    <p className="text-xl text-slate-500 max-w-xs mx-auto">Damit &quot;Coach Theo&quot; dich persönlich ansprechen kann.</p>
                </div>

                <Card className="p-8 bg-white/60 backdrop-blur-xl">
                    <form onSubmit={handleNameSubmit} className="space-y-8">
                        <div className="space-y-3">
                            <label htmlFor="name" className="text-lg font-bold text-slate-700 ml-1">Dein Vorname</label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="z.B. Marianne"
                                className="h-20 text-2xl text-center bg-white text-slate-900 border-2 border-slate-100 shadow-inner focus:border-primary/50 focus:bg-white transition-all"
                                autoFocus
                            />
                        </div>
                        <Button
                            type="submit"
                            size="lg"
                            className="w-full text-xl h-18 shadow-lg shadow-primary/20"
                            disabled={isLoading || !name.trim()}
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : "Weiter"}
                            {!isLoading && <ArrowRight className="ml-2 h-6 w-6" />}
                        </Button>
                    </form>
                </Card>
            </div>
        );
    }

    // Step 2: Structured conversation with Coach Theo
    if (step === "assessment") {
        return (
            <div className="flex flex-col gap-4 pt-4 h-[calc(100vh-6rem)] animate-in fade-in duration-700">
                <div className="text-center mb-2">
                    <h1 className="text-2xl font-bold text-slate-800">Erstgespräch mit Coach Theo</h1>
                    <p className="text-slate-500 text-sm">Beantworte Theos Fragen, damit er deinen Plan perfekt zuschneiden kann.</p>
                </div>

                <div className="flex-1 overflow-hidden">
                    <ChatInterface
                        initialMessage={`Hallo ${name}! 👋 Schön, dass du hier bist! Ich bin Coach Theo, dein persönlicher Fitness-Coach.\n\nBevor ich deinen individuellen Trainingsplan erstelle, möchte ich dich kurz kennenlernen. Wir gehen gemeinsam 4 kurze Bereiche durch:\n\n1️⃣ Deine Ziele und Motivation\n2️⃣ Deine Gesundheit und körperliche Verfassung\n3️⃣ Dein Equipment und deine Erfahrung\n4️⃣ Deine zeitlichen Möglichkeiten\n\nDas dauert nur wenige Minuten. Also, starten wir gleich mit dem Wichtigsten: **Was möchtest du mit dem Training erreichen?** Hast du bestimmte Ziele wie beweglicher werden, Kraft aufbauen, Schmerzen lindern — oder etwas ganz anderes?`}
                        onComplete={handleAssessmentComplete}
                    />
                </div>
            </div>
        );
    }

    // Step 3: Generating plan (transition screen)
    if (step === "generating") {
        return (
            <div className="flex flex-col items-center justify-center gap-6 pt-24 animate-in fade-in duration-500">
                <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Sparkles size={36} className="text-emerald-600 animate-pulse" />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-slate-800">Dein Plan wird erstellt...</h1>
                    <p className="text-slate-500">Coach Theo stellt deinen persönlichen Trainingsplan zusammen.</p>
                </div>
                <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
            </div>
        );
    }

    return null;
}
