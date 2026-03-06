"use client";

import { Card } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";

export interface LeaderboardUser {
    id: string;
    name: string;
    points: number;
    isCurrentUser: boolean;
}

interface LeaderboardProps {
    users: LeaderboardUser[];
    peerGroupLabel: string; // e.g., "Männer 65-70 Jahre"
}

export function Leaderboard({ users, peerGroupLabel }: LeaderboardProps) {
    if (!users || users.length === 0) return null;

    return (
        <Card className="p-5 bg-card border-none shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="text-amber-500" size={20} />
                    <h3 className="text-lg font-bold text-foreground">Bestenliste</h3>
                </div>
                <span className="text-xs font-semibold text-muted-foreground bg-accent px-2 py-1 rounded-md">
                    {peerGroupLabel}
                </span>
            </div>

            <div className="space-y-3">
                {users.map((u, i) => (
                    <div
                        key={u.id}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all ${u.isCurrentUser ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50' : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-amber-100 text-amber-600' :
                                    i === 1 ? 'bg-slate-200 text-slate-600' :
                                        i === 2 ? 'bg-orange-100 text-orange-600' :
                                            'bg-transparent text-muted-foreground'
                                }`}>
                                {i < 3 ? <Medal size={16} /> : `${i + 1}.`}
                            </div>
                            <span className={`font-medium ${u.isCurrentUser ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-foreground'}`}>
                                {u.isCurrentUser ? "Du" : u.name}
                            </span>
                        </div>
                        <span className="font-bold text-foreground">{u.points} <span className="text-xs text-muted-foreground font-normal">Pkt.</span></span>
                    </div>
                ))}
            </div>
        </Card>
    );
}
