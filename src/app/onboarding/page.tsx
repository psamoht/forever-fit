"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRef } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { MoveRight, Loader2, UserRound, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function OnboardingPage() {
    const [step, setStep] = useState<"name" | "details" | "assessment" | "generating" | "complete">("name");
    const [name, setName] = useState("");
    const [gender, setGender] = useState<"male" | "female" | "diverse" | "">("");
    const [age, setAge] = useState<number | "">("");
    const [weight, setWeight] = useState<number | "">("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Basic Profile Creation
    const handleNameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            // 1. Get Current User (Must be logged in via /auth)
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // Should not happen if flow is correct, but redirect to auth if so
                router.push("/auth");
                return;
            }

            // 2. Create Profile
            const { error: profileError } = await supabase
                .from("profiles")
                .upsert({
                    id: user.id,
                    display_name: name,
                    goals: "Not set",
                    medical_conditions: "Not set",
                });

            if (profileError) throw profileError;

            setStep("details");

        } catch (err: any) {
            console.error("Error creating profile:", err);
            // Fallback for demo if supabase fails (optional)
            alert("Fehler beim Anlegen des Profils. Bitte erneut versuchen.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDetailsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from("profiles")
                .update({
                    // age is birth_year in DB, let's calculate rough year
                    birth_year: new Date().getFullYear() - Number(age),
                    gender,
                    weight
                })
                .eq("id", user.id);

            if (error) throw error;
            setStep("details");
        } catch (err) {
            console.error("Error saving details:", err);
        } finally {
            setIsLoading(false);
        }
    };

    if (step === "name") {
        return (
            <div className="flex flex-col gap-8 pt-12 animate-in slide-in-from-bottom-5 duration-700">
                <div className="text-center space-y-4">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg text-slate-700 mb-2">
                        <UserRound size={32} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-800">Wie dürfen wir dich nennen?</h1>
                    <p className="text-xl text-slate-500 max-w-xs mx-auto">Damit "Coach Theo" dich persönlich ansprechen kann.</p>
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

    if (step === "details") {
        return (
            <div className="flex flex-col gap-8 pt-12 animate-in slide-in-from-right-5 duration-700">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-extrabold text-slate-800">Ein paar Details zu dir</h1>
                    <p className="text-lg text-slate-500">Damit wir dein Training optimal anpassen können.</p>
                </div>

                <Card className="p-8 bg-white/60 backdrop-blur-xl space-y-8">
                    <form onSubmit={handleDetailsSubmit} className="space-y-8">
                        {/* Gender */}
                        <div className="space-y-3">
                            <label className="text-lg font-bold text-slate-700 block">Geschlecht</label>
                            <div className="grid grid-cols-3 gap-3">
                                {["female", "male", "diverse"].map((g) => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setGender(g as any)}
                                        className={`h-16 rounded-xl font-medium text-lg transition-all border-2 ${gender === g
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                                            }`}
                                    >
                                        {g === "female" ? "Weiblich" : g === "male" ? "Männlich" : "Divers"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Age */}
                        <div className="space-y-3">
                            <label htmlFor="age" className="text-lg font-bold text-slate-700 block">Alter</label>
                            <Input
                                id="age"
                                type="number"
                                value={age}
                                onChange={(e) => setAge(Number(e.target.value))}
                                placeholder="65"
                                className="h-16 text-xl text-center bg-white text-slate-900"
                            />
                        </div>

                        {/* Weight */}
                        <div className="space-y-3">
                            <label htmlFor="weight" className="text-lg font-bold text-slate-700 block">Gewicht (kg)</label>
                            <Input
                                id="weight"
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(Number(e.target.value))}
                                placeholder="75"
                                className="h-16 text-xl text-center bg-white text-slate-900"
                            />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full text-xl h-16 mt-4"
                            disabled={isLoading || !gender || !age || !weight}
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : "Weiter zu Coach Theo"}
                            {!isLoading && <ArrowRight className="ml-2" />}
                        </Button>
                    </form>
                </Card>
            </div>
        );
    }

    if (step === "assessment") {
        return (
            <div className="flex flex-col gap-6 pt-4 animate-in fade-in duration-700">
                <div className="text-center mb-2">
                    <h1 className="text-2xl font-bold text-slate-800">Hallo {name}!</h1>
                    <p className="text-slate-500">Ich bin Coach Theo.</p>
                </div>

                <ChatInterface
                    initialMessage={`Hallo ${name}, danke für die Angaben. Das hilft mir sehr! Jetzt würde ich gerne noch kurz über deine Ziele sprechen. Was möchtest du mit dem Training erreichen? (z.B. Schmerzen lindern, beweglicher werden)`}
                    onComplete={async (data) => {
                        console.log("Assessment complete", data);
                        setIsLoading(true);
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return;

                            const { error } = await supabase
                                .from("profiles")
                                .update({
                                    goals: data.goals,
                                    medical_conditions: data.medical_conditions,
                                    equipment: data.equipment,
                                    schedule: data.schedule
                                })
                                .eq("id", user.id);

                            if (error) throw error;

                            router.push("/dashboard");
                        } catch (err) {
                            console.error("Error saving assessment:", err);
                        } finally {
                            setIsLoading(false);
                        }
                    }}
                />
            </div>
        )
    }

    return null;
}
