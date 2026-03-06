import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { encodeWAV } from "@/lib/audio-utils";

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
        const { userName, currentWorkoutStats, previousWorkoutStats, rpeScore, totalPoints } = body;

        // 1. Generate the text summary
        const textModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `Du bist "Coach Theo", ein extrem motivierender und herzlicher Fitness-Coach für Senioren. 
Dein Ziel ist es, dem Nutzer nach einem erfolgreich abgeschlossenen Workout zu gratulieren.
Spreche den Nutzer immer per "Du" an. Formuliere sehr natürlich und spürbar freudig.
WICHTIG (Workout-Analyse): Du erhältst gleich die "Aktuellen Trainingsdaten", welche die absolvierten Übungen auflisten. 
Greife 1-2 dieser Übungen namentlich heraus und lobe den Nutzer spezifisch dafür (z.B. "Besonders stark, wie du die Kniebeugen durchgezogen hast!"). 
Zeige, dass du das Workout wirklich analysiert hast und den Fokus der Übungen verstanden hast.
ZUSÄTZLICH (Atomic Habits & Progressive Overload): Beziehe das subjektive Anstrengungsempfinden ("rpeScore" 1-10) ein, FALLS es mitgegeben wurde.
- Wenn RPE <= 4 (sehr leicht): Lobe die Beständigkeit und erwähne beiläufig, dass wir beim nächsten Mal vielleicht eine Schippe drauflegen können.
- Wenn RPE 5-7 (moderat/optimal): Perfekt! Bestätige, dass das genau der "Sweet Spot" für gesundes Wachstum ist.
- Wenn RPE >= 8 (sehr hart): Lobe den extremen Kampfgeist, mahne aber liebevoll zur Erholung ("Ruh dich gut aus, wir wollen uns nicht überlasten!").
- Wenn KEIN RPE vorhanden ist (z.B. "pending"): Lobe einfach allgemein die großartige Arbeit und den Abschluss des Trainings, ohne auf Intensität einzugehen.
Halte dich sehr kurz (max. 4-5 Sätze).
Verwende keine Emojis, Sterne (*) oder Markdown in deiner Antwort.`,
        });

        let prompt = "";
        if (userName && userName.toLowerCase() !== "du" && userName.toLowerCase() !== "sportler") {
            prompt += `Kontext: Begrüße den Nutzer ZWINGEND mit seinem Namen "${userName}" zu Beginn der Gratulation! (z.B. "Klasse gemacht, ${userName}! ...")\n`;
        } else {
            prompt += `Kontext: Beginne die Gratulation zwingend mit den Worten "Klasse gemacht!" oder "Super Leistung!" und erfinde keinen Namen.\n`;
        }

        prompt += `Der Nutzer hat gerade ein Training absolviert. Gratuliere ihm!\nAktuelle Trainingsdaten (heute absolviert): ${JSON.stringify(currentWorkoutStats)}\nErreichte Energie-Punkte: ${totalPoints}\n`;

        if (rpeScore) {
            prompt += `Empfundene Anstrengung (RPE 1-10): ${rpeScore}\n`;
        } else {
            prompt += `Empfundene Anstrengung: pending (Nutzer hat noch nicht bewertet)\n`;
        }

        prompt += `Vorherige Trainingsdaten (zum Vergleich): ${previousWorkoutStats ? JSON.stringify(previousWorkoutStats) : 'Keine alten Daten verfügbar.'}`;

        const textResponse = await textModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        let text = textResponse.response.text().replace(/[*#_]/g, "").trim();

        // 2. Generate Audio from the text
        const audioModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-preview-tts"
        });

        const audioResponse = await audioModel.generateContent({
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
                // @ts-ignore
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: "Puck" // Male voice
                        }
                    }
                }
            }
        });

        const audioData = audioResponse.response;
        let base64Audio = null;

        const parts = audioData.candidates?.[0]?.content?.parts;
        if (parts && parts.length > 0) {
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('audio')) {
                    const pcmBuffer = Buffer.from(part.inlineData.data, "base64");
                    const wavBuf = encodeWAV(new Uint8Array(pcmBuffer), 24000);
                    base64Audio = wavBuf.toString("base64");
                }
            }
        }

        return NextResponse.json({ success: true, text, audio: base64Audio });

    } catch (error) {
        console.error("Error generating workout summary:", error);
        return NextResponse.json({ success: false, error: "Fehler bei der Generierung" }, { status: 500 });
    }
}
