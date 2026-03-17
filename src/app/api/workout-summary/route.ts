import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { encodeWAV } from "@/lib/audio-utils";
import { logApiUsage } from "@/lib/admin-logger";

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
        const { userName, currentWorkoutStats, previousWorkoutStats, rpeScore, totalPoints, gamification, profileContext, userId } = body;

        const finalUserId = userId || profileContext?.id || null;

        // 1. Generate the text summary
        const textModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `Du bist "Coach Theo", ein extrem motivierender, herzlicher und erfahrener Fitness-Coach für Senioren. Du bist kein Roboter, sondern ein echter Mensch aus Fleisch und Blut.
Dein Ziel ist es, dem Nutzer nach einem erfolgreich abgeschlossenen Workout zu gratulieren und ihm das Gefühl zu geben, dass er bei dir als Trainer in den allerbesten Händen ist.
Spreche den Nutzer immer per "Du" an. Formuliere sehr natürlich, fürsorglich und mit spürbarer physiotherapeutischer Expertise.
REGELN FÜR DEIN COACHING:
1. Kontext & "Warum": Greife 1-2 Übungen heraus (aus den "Aktuellen Trainingsdaten") und erkläre dem Nutzer gelegentlich sanft das "Warum" hinter der Übung.
2. Subtilität bei Beschwerden: Du KENNNST die Krankheitsgeschichte und Ziele des Nutzers, aber du zählst sie NICHT mechanisch auf! Sprich sie nur an, wenn es für das Lob organisch Sinn macht (z.B. "Ich merke, du tastest dich heran – das wird deinem unteren Rücken auf Dauer extrem guttun").
3. Belastung & RPE: 
- Wenn RPE <= 4: "Ich habe gemerkt, das fiel dir heute leicht. Wenn du möchtest, können wir beim nächsten Mal etwas knackiger ran."
- Wenn RPE 5-7: "Die Intensität heute war genau richtig! Das ist der perfekte Bereich, um gesund Fortschritte zu machen."
- Wenn RPE >= 8: "Heute habe ich dich ganz schön herausgefordert! Großer Respekt. Ruh dich jetzt gut aus, dafür machen wir es morgen etwas ruhiger."
4. Gamification normalisieren: Falls der Nutzer ein Level aufgestiegen ist (LEVEL-SYSTEM), GRATULIERE begeistert, aber verpacke es menschlich ("Wow, Level aufgestiegen! Du hast dir diesen Meister-Titel hart erarbeitet").
Falls ein Streak-Meilenstein (z.B. 7 Tage) erreicht wurde, feiere die Beständigkeit.
Gib dem Nutzer das Gefühl: Echter Experte. Wahre Empathie. Immer an seiner Seite.
Halte dich relativ kurz (max. 4-5 Sätze).
Verwende keine Sternchen (*) oder auffälliges Markdown in deiner Antwort.`,
        });

        let prompt = "";
        if (userName && userName.toLowerCase() !== "du" && userName.toLowerCase() !== "sportler") {
            prompt += `Kontext: Begrüße den Nutzer ZWINGEND mit seinem Namen "${userName}" zu Beginn der Gratulation! (z.B. "Klasse gemacht, ${userName}! ...")\n`;
        } else {
            prompt += `Kontext: Beginne die Gratulation zwingend mit den Worten "Klasse gemacht!" oder "Super Leistung!" und erfinde keinen Namen.\n`;
        }

        prompt += `Der Nutzer hat gerade ein Training absolviert. Gratuliere ihm!\nAktuelle Trainingsdaten (heute absolviert): ${JSON.stringify(currentWorkoutStats)}\n`;

        if (profileContext && (profileContext.goals || profileContext.medicalConditions)) {
            prompt += `\nHintergrundwissen (NUR im Hinterkopf behalten, NICHT unbedingt alles erwähnen): Ziele: ${profileContext.goals || 'Fitness erhalten'}. Beschwerden: ${profileContext.medicalConditions || 'Keine'}.\n`;
        }

        prompt += `\nErreichte Gesamtpunkte in der App: ${totalPoints}\n`;

        if (rpeScore) {
            prompt += `Empfundene Anstrengung (RPE 1-10): ${rpeScore}\n`;
        } else {
            prompt += `Empfundene Anstrengung: pending (Nutzer hat noch nicht bewertet)\n`;
        }

        prompt += `Vorherige Trainingsdaten (zum Vergleich): ${previousWorkoutStats ? JSON.stringify(previousWorkoutStats) : 'Keine alten Daten verfügbar.'}\n`;

        if (gamification) {
            prompt += `\nGamification-Kontext:\n`;
            prompt += `- Aktuelles Level: ${gamification.levelNumber} ("${gamification.levelTitle}")\n`;
            prompt += `- Gesamtpunkte: ${gamification.totalPoints}\n`;
            prompt += `- Aktuelle Streak: ${gamification.streakDays} Tage\n`;
            if (gamification.levelUp) {
                prompt += `- LEVEL UP! Der Nutzer ist gerade auf Level "${gamification.levelUp}" aufgestiegen! Gratuliere begeistert!\n`;
            }
            if (gamification.streakMilestone) {
                prompt += `- STREAK-MEILENSTEIN: ${gamification.streakMilestone}\n`;
            }
        }

        const textResponse = await textModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const textInputTokens = textResponse.response.usageMetadata?.promptTokenCount || 0;
        const textOutputTokens = textResponse.response.usageMetadata?.candidatesTokenCount || 0;

        let text = textResponse.response.text().replace(/[*#_]/g, "").trim();

        // 2. Generate Audio from the text
        const audioModel = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
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

        const audioInputTokens = audioResponse.response.usageMetadata?.promptTokenCount || 0;
        const audioOutputTokens = audioResponse.response.usageMetadata?.candidatesTokenCount || 0;

        if (finalUserId) {
            Promise.all([
                logApiUsage(finalUserId, 'workout-summary-text', textInputTokens, textOutputTokens, 'gemini-2.5-flash', prompt, text),
                logApiUsage(finalUserId, 'workout-summary-audio', audioInputTokens, audioOutputTokens, 'gemini-1.5-flash', text, 'AUDIO_RESPONSE')
            ]).catch(console.error);
        }

        return NextResponse.json({ success: true, text, audio: base64Audio });

    } catch (error) {
        console.error("Error generating workout summary:", error);
        return NextResponse.json({ success: false, error: "Fehler bei der Generierung" }, { status: 500 });
    }
}
