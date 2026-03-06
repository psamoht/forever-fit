
"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Clock, Zap, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface WorkoutCardProps {
    title: string;
    description: string;
    durationMin: number;
    intensity: "low" | "medium" | "high";
    imageUrl?: string; // Future use
    completed?: boolean;
    onStart?: () => void;
}

export function WorkoutCard({ title, description, durationMin, intensity, completed, onStart }: WorkoutCardProps) {
    if (completed) {
        return (
            <Card className="p-6 relative overflow-hidden group border-none bg-emerald-50 dark:bg-emerald-900/20 shadow-xl shadow-emerald-100/50 dark:shadow-emerald-900/10">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 leading-tight">Training absolviert!</h3>
                        <p className="text-emerald-700 dark:text-emerald-300 text-sm">Großartige Arbeit heute. Bis morgen!</p>
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="flex-1 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/50" asChild>
                        <Link href="/workout/start">
                            Trotzdem starten
                        </Link>
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6 relative overflow-hidden group border-none bg-card shadow-xl shadow-slate-200/50 dark:shadow-black/20">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/10 rounded-bl-[100px] -mr-4 -mt-4 z-0 transition-transform duration-700 group-hover:scale-125" />

            <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="h-14 w-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 ring-4 ring-emerald-50 dark:ring-emerald-900/20">
                        <Play className="h-6 w-6 fill-current ml-1" />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full text-xs font-semibold text-muted-foreground border border-border">
                            <Clock size={12} />
                            <span>{durationMin} Min</span>
                        </div>
                        <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                            intensity === "low" && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
                            intensity === "medium" && "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30",
                            intensity === "high" && "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30",
                        )}>
                            <Zap size={12} />
                            <span>{intensity === "low" ? "Leicht" : intensity === "medium" ? "Mittel" : "Intensiv"}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-2xl font-bold text-card-foreground leading-tight mb-1">{title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-[90%]">{description}</p>
                </div>

                <Button asChild size="lg" className="w-full text-lg h-14 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 group-hover:translate-y-[-2px] transition-all duration-300">
                    <Link href="/workout/start">
                        Training Starten
                    </Link>
                </Button>
            </div>
        </Card>
    );
}
