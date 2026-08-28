"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, CheckCircle2, ArrowRight } from "lucide-react";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmationSent, setConfirmationSent] = useState(false);
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push("/dashboard");
            } else {
                const redirectUrl = typeof window !== "undefined"
                    ? `${window.location.origin}/auth/callback`
                    : undefined;

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: redirectUrl,
                    },
                });
                if (error) throw error;

                // If user is auto-confirmed or session exists immediately
                if (data?.session) {
                    router.push("/onboarding");
                } else {
                    // Confirmation email has been sent
                    setConfirmationSent(true);
                }
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            setError(err.message === "Invalid login credentials" ? "E-Mail oder Passwort falsch." : err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (confirmationSent) {
        return (
            <div className="flex flex-col gap-6 pt-10 px-4 animate-in fade-in duration-700">
                <Card className="p-8 bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl shadow-emerald-900/5 text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-slate-800">Bestätigungs-E-Mail gesendet!</h1>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Wir haben einen Bestätigungslink an <strong className="text-slate-800">{email}</strong> gesendet.
                        </p>
                        <p className="text-slate-500 text-xs">
                            Bitte öffne die E-Mail und klicke auf den Link, um dein Konto zu aktivieren und mit dem Onboarding zu starten.
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => {
                            setConfirmationSent(false);
                            setIsLogin(true);
                        }}
                        className="w-full"
                    >
                        Zurück zum Login
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 pt-10 px-4 animate-in fade-in duration-700">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-slate-800">
                    {isLogin ? "Willkommen zurück" : "Konto erstellen"}
                </h1>
                <p className="text-slate-500">
                    {isLogin ? "Schön, dass du wieder da bist!" : "Starte deine Fitness-Reise heute."}
                </p>
            </div>

            <Card className="p-8 bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl shadow-emerald-900/5">
                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">E-Mail</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="max@beispiel.de"
                                    className="pl-12"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Passwort</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="pl-12"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full text-lg shadow-lg shadow-primary/20"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : (isLogin ? "Anmelden" : "Konto erstellen")}
                    </Button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-slate-500 hover:text-primary font-medium transition-colors"
                    >
                        {isLogin ? "Noch kein Konto? Registrieren" : "Bereits ein Konto? Anmelden"}
                    </button>
                </div>
            </Card>
        </div>
    );
}
