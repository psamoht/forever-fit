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
            systemInstruction: `Du bist "Coach Theo", ein extrem motivierender, herzlicher und fürsorglicher Fitness-Coach für Senioren. 
Dein Ziel ist es, dem Nutzer auf seinem Dashboard eine kompetente, tagesaktuelle Bewertung seiner Fitness-Performance zu geben.
Sprich den Nutzer immer per "Du" und mit seinem Namen an. Formuliere sehr natürlich und spürbar empathisch – zeige deine Expertise als Coach!
WICHTIG (Coach-Analyse & Empathie):
1. Verknüpfe seine Daten (Streak, Punkte, letzte Workouts) mit seinem "Nutzerprofil: Ziele & Beschwerden".
2. Erkläre den WERT des Trainings für seine spezifische Gesundheit. Beispiel: "Dein gestriges Beintraining war super wichtig, das hilft dir enorm bei deinen Kniebeschwerden." oder "Ich sehe, du bist auf einem tollen Weg zu deinem Ziel, wieder schmerzfrei im Garten zu arbeiten."
3. Gehe auf die Trainingsbelastung ein (RPE Score aus "Letzte Workouts", falls vorhanden): "Gestern war es anstrengend für dich, das habe ich gesehen. Gönn dir heute etwas mehr Ruhe und fokussiere dich auf sanfte Dehnung." oder "Ich merke, du tastest dich an schwierigere Varianten heran – das ist echtes Wachstum!"
4. Beruhige den Nutzer bei Ausfällen: "Kein Problem, dass du letzte Woche pausiert hast. Wir fangen heute entspannt wieder an."
Gib dem Nutzer das Gefühl, dass er umsorgt, gut beraten und niemals allein auf seiner Fitness-Reise ist.
Halte dich relativ kurz (max. 3-4 Sätze) und bleib verständlich. Vermeide reine Punkte-Aufzählungen, deute die Punkte lieber als "Fortschritt".
Verwende keine Sternchen (*) oder Markdown in deiner Antwort.`,
        });

        let prompt = `Bitte analysiere die aktuelle Fitness-Leistung von ${userName || 'deinem Athleten'}.
Nutzerprofil (Ziele & evtl. Beschwerden): Ziele: ${stats.goals || 'Keine spezifischen'}. Beschwerden: ${stats.medicalConditions || 'Keine'}.
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
