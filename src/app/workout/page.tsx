"use client";

import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function WorkoutPage() {
    return (
        <div className="min-h-screen bg-[#fafaf9]">
            <Navbar />
            <main className="container max-w-md mx-auto px-6 pt-10 text-center space-y-6">
                <div className="flex justify-center">
                    <div className="h-24 w-24 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 animate-pulse">
                        <Construction size={48} />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-slate-800">Training startet bald!</h1>
                    <p className="text-slate-500">
                        Coach Theo bereitet gerade die Übungen vor. <br />
                        Die Datenbank wird im nächsten Schritt verbunden.
                    </p>
                </div>

                <Card className="p-6 bg-white/70 border-none shadow-lg">
                    <p className="italic text-slate-600">"Gut Ding will Weile haben."</p>
                </Card>

                <Button asChild variant="outline" size="lg" className="w-full">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-5 w-5" /> Zurück zum Dashboard
                    </Link>
                </Button>
            </main>
        </div>
    );
}
