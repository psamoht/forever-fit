"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Card } from "@/components/ui/card";

interface ProgressData {
    day: string;
    points: number;
}

interface ProgressChartProps {
    data: ProgressData[];
}

export function ProgressChart({ data }: ProgressChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="p-6 flex flex-col items-center justify-center h-48 bg-slate-50 dark:bg-slate-900 border-none">
                <p className="text-muted-foreground text-center">Noch keine Daten vorhanden.<br />Starte dein erstes Workout!</p>
            </Card>
        );
    }

    return (
        <Card className="p-5 pt-8 bg-card border-none shadow-sm">
            <h3 className="text-lg font-bold mb-6 text-foreground">Deine Entwicklung</h3>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'currentColor', fontSize: 12, opacity: 0.5 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'currentColor', fontSize: 12, opacity: 0.5 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            labelStyle={{ color: '#000', fontWeight: 'bold', marginBottom: '4px' }}
                            formatter={(value: number | undefined) => [value || 0, "Punkte"]}
                        />
                        <Bar dataKey="points" radius={[6, 6, 6, 6]} barSize={32} minPointSize={5}>
                            {
                                data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === data.length - 1 ? '#10b981' : '#cbd5e1'} />
                                ))
                            }
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
