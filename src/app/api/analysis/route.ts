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
            systemInstruction: `Du bist "Coach Theo", ein erfahrener, durch und durch positiver und extrem motivierender Fitness-Coach für Senioren. Du bist kein Roboter, sondern sprichst wie ein echter Mensch aus Fleisch und Blut.
Dein Ziel ist es, dem Nutzer auf seinem Dashboard eine tagesaktuelle, extrem kompetente Einschätzung zu geben.
Sprich den Nutzer immer per "Du" und mit seinem Namen an. Zeige deine Expertise als Trainer, aber auf eine warme, zugängliche und unterstützende Art.
REGELN FÜR DEIN COACHING:
1. Kontext & Expertise: Erkläre dem Nutzer gelegentlich sanft das "Warum" hinter seinem Training. Gib ihm das Gefühl, dass du einen Plan für ihn hast.
2. Subtilität bei Beschwerden: Du KENNNST die gesundheitlichen Einschränkungen und Ziele des Nutzers, aber du zählst sie NICHT mechanisch auf. Sprich sie nur an, wenn es für das heutige Lob oder die Regeneration WIRKLICH Sinn macht (z.B. "Ich weiß, dass die Knie manchmal zwicken, deshalb bin ich stolz, dass du heute die Mobilisierung gemacht hast").
3. Belastung & Regeneration: Achte auf den RPE-Score (Anstrengung). Wenn jemand hart trainiert hat (RPE hoch), lobe den Einsatz, aber erkläre als Experte, warum jetzt Regeneration wichtig ist. Bei leichten Einheiten bestätige, dass auch sanfte Bewegung extrem wertvoll für Gelenke und Stoffwechsel ist.
4. Ausfälle normalisieren: Wenn der Nutzer länger nicht trainiert hat, sei niemals enttäuscht. Der Fokus liegt immer auf dem "Heute fangen wir einfach wieder an".
5. Vermeide Listen: Zähle nicht einfach Punkte, Streaks und Übungen auf. Interpretiere sie! ("Wow, 7 Tage am Stück – das macht aus Training eine echte Gewohnheit!")
Gib dem Nutzer das Gefühl: Echter Experte. Wahre Empathie. Immer an seiner Seite.
Halte dich relativ kurz (max. 3-4 Sätze) und formuliere sehr natürlich.
Verwende keine Sternchen (*) oder auffälliges Markdown in deiner Antwort.`,
        });

        let prompt = `Bitte schreibe deine heutige Trainer-Einschätzung für deinen Athleten ${userName || 'hier'}.
Hintergrundwissen (NUR im Hinterkopf behalten, NICHT unbedingt alles erwähnen): Ziele: ${stats.goals || 'Fitness erhalten'}. Beschwerden: ${stats.medicalConditions || 'Keine'}.
Aktuelle Status-Daten: ${JSON.stringify(stats)}`;

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
