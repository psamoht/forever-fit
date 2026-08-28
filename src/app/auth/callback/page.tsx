"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
    const router = useRouter();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const handleAuth = async () => {
            try {
                // Get the current session (Supabase client automatically extracts hash tokens from URL)
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user) {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("display_name, goals")
                        .eq("id", session.user.id)
                        .maybeSingle();

                    if (profile && profile.display_name && profile.goals && profile.goals !== "Not set") {
                        router.replace("/dashboard");
                    } else {
                        router.replace("/onboarding");
                    }
                    return;
                }

                // If not resolved yet, listen to auth state changes
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
                    if (currentSession?.user && isMounted) {
                        subscription.unsubscribe();
                        const { data: profile } = await supabase
                            .from("profiles")
                            .select("display_name, goals")
                            .eq("id", currentSession.user.id)
                            .maybeSingle();

                        if (profile && profile.display_name && profile.goals && profile.goals !== "Not set") {
                            router.replace("/dashboard");
                        } else {
                            router.replace("/onboarding");
                        }
                    }
                });

                // Fallback timeout: if after 5 seconds still no session, redirect to auth
                setTimeout(() => {
                    if (isMounted) {
                        supabase.auth.getSession().then(({ data: { session } }) => {
                            if (!session && isMounted) {
                                router.replace("/auth");
                            }
                        });
                    }
                }, 5000);
            } catch (err: any) {
                console.error("Auth callback error:", err);
                if (isMounted) {
                    setErrorMsg(err.message || "Fehler bei der Bestätigung deines Kontos.");
                }
            }
        };

        handleAuth();

        return () => {
            isMounted = false;
        };
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4 text-center animate-in fade-in duration-500">
            {errorMsg ? (
                <div className="p-6 bg-red-50 text-red-600 rounded-3xl text-sm font-medium border border-red-100 max-w-md shadow-lg">
                    <p className="font-bold text-base mb-2">Bestätigung fehlgeschlagen</p>
                    <p>{errorMsg}</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <h2 className="text-xl font-bold text-slate-800">Konto wird verifiziert</h2>
                    <p className="text-slate-500 text-sm">Einen Moment bitte, du wirst gleich weitergeleitet...</p>
                </div>
            )}
        </div>
    );
}
