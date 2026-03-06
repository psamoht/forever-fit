import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing. Add it to .env.local");
}
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req: NextRequest) {
    if (!apiKey) {
        return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { userName, stats } = body;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `Du bist "Coach Theo", ein extrem motivierender und herzlicher Fitness-Coach für Senioren. 
Dein Ziel ist es, dem Nutzer eine tagesaktuelle, personalisierte Bewertung seiner Fitness-Performance zu geben (ähnlich wie eine kurze, prägnante Strava-Auswertung).
Spreche den Nutzer immer per "Du" und mit seinem Namen an. Formuliere sehr natürlich, kompetent und motivierend.
Beziehe dich konkret auf:
1. Seine aktuellen Daten (Streak, Gesamtpunkte) und seine Position in der Peer Group.
2. Die Historie der letzten Tage ("recentWorkouts"). Lobe ihn für absolvierte Workouts (Status "completed") oder ermutige ihn sanft, falls er in den letzten Tagen nichts gemacht hat. Gehe auch darauf ein, wie schwer er ein Workout fand (rpe_score 1=sehr leicht bis 10=sehr hart), falls dieser Wert existiert.
Halte dich kurz (max. 3-4 Sätze) und bleib auf den Punkt. Erkläre kurz, was das für den Fortschritt bedeutet.
Verwende keine Sternchen (*) oder Markdown in deiner Antwort.`,
        });

        let prompt = `Bitte analysiere die aktuelle Fitness-Leistung von ${userName || 'deinem Athleten'}.
Aktuelle Trainingsdaten (Streak, Punkte pro Tag, Bestenliste-Position, Letzte Workouts): ${JSON.stringify(stats)}`;

        const response = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const text = response.response.text().replace(/[*#_]/g, "").trim();
        return NextResponse.json({ success: true, text });

    } catch (error) {
        console.error("Error generating analysis:", error);
        return NextResponse.json({ success: false, error: "Fehler bei der Generierung" }, { status: 500 });
    }
}
