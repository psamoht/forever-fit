"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Calendar, Dumbbell, User, Activity } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { supabase } from "@/lib/supabaseClient";
import { ModeToggle } from "./mode-toggle";
import { FontSizeToggle } from "./font-size-toggle";

export function Navbar() {
    const [open, setOpen] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
                if (profile) setUserName(profile.display_name);
            }
        };
        fetchUser();
    }, [open]);

    // Fix hydration mismatch for Radix UI primitives
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <nav className="p-4 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
                <div className="font-bold text-xl tracking-tight text-emerald-600">
                    Forever Fit
                </div>
                {/* Render a static placeholder for the button to prevent layout shift, but no Sheet logic */}
                <Button variant="ghost" size="icon" className="hover:bg-slate-100/50">
                    <Menu className="h-6 w-6 text-slate-700" />
                </Button>
            </nav>
        );
    }

    return (
        <nav className="p-4 flex justify-between items-center bg-background/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300 border-b border-border/50">
            <Link href="/dashboard" className="font-bold text-xl tracking-tight text-emerald-600 dark:text-emerald-500 hover:opacity-80 transition-opacity">
                Forever Fit
            </Link>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                    <Link href="/dashboard">
                        <Home className="h-5 w-5" />
                    </Link>
                </Button>

                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:bg-accent text-muted-foreground">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right">
                        <SheetHeader>
                            <SheetTitle>Menü</SheetTitle>

                            {userName && (
                                <div className="mt-6 mb-2 px-4">
                                    <p className="text-sm text-muted-foreground">Angemeldet als</p>
                                    <p className="text-xl font-bold text-foreground">{userName}</p>
                                </div>
                            )}
                        </SheetHeader>

                        <div className="flex flex-col gap-3 mt-4">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent text-lg font-medium text-foreground transition-all active:scale-95"
                                onClick={() => setOpen(false)}
                            >
                                <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <Home size={20} />
                                </div>
                                Übersicht
                            </Link>
                            <Link
                                href="/plan"
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent text-lg font-medium text-foreground transition-all active:scale-95"
                                onClick={() => setOpen(false)}
                            >
                                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Calendar size={20} />
                                </div>
                                Wochenplan
                            </Link>
                            <Link
                                href="/analyse"
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent text-lg font-medium text-foreground transition-all active:scale-95"
                                onClick={() => setOpen(false)}
                            >
                                <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Activity size={20} />
                                </div>
                                Analyse
                            </Link>
                            <Link
                                href="/equipment"
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent text-lg font-medium text-foreground transition-all active:scale-95"
                                onClick={() => setOpen(false)}
                            >
                                <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                                    <Dumbbell size={20} />
                                </div>
                                Ausrüstung
                            </Link>
                            <Link
                                href="/profile"
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent text-lg font-medium text-foreground transition-all active:scale-95"
                                onClick={() => setOpen(false)}
                            >
                                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <User size={20} />
                                </div>
                                Mein Profil
                            </Link>
                        </div>

                        <div className="mt-8 pt-6 border-t border-border space-y-6">
                            <div>
                                <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">Textgröße</p>
                                <FontSizeToggle />
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">Farbschema</p>
                                <ModeToggle />
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </nav>
    );
}
