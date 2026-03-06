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
        const { userName, currentWorkoutStats, previousWorkoutStats, rpeScore, totalPoints, gamification, profileContext } = body;

        // 1. Generate the text summary
        const textModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `Du bist "Coach Theo", ein extrem motivierender, herzlicher und kompetenter Fitness-Coach für Senioren. 
Dein Ziel ist es, dem Nutzer nach einem erfolgreich abgeschlossenen Workout zu gratulieren und ihm das Gefühl zu geben, dass er bei dir in den besten Händen ist.
Spreche den Nutzer immer per "Du" an. Formuliere sehr natürlich, fürsorglich und mit spürbarer physiotherapeutischer Expertise, aber in einfacher Sprache.
WICHTIG (Workout-Analyse & Empathie):
1. Greife 1-2 Übungen heraus (aus den "Aktuellen Trainingsdaten").
2. Erkläre kurz und verständlich den NUTZEN dieser Übung für SEINE spezifische Situation (aus "Nutzerprofil: Ziele & Beschwerden"). 
Beispiel: "Heute haben wir deine Arme trainiert. Diese Dehnübungen werden dir bei deinen Schulterbeschwerden sehr helfen."
ZUSÄTZLICH (Belastungssteuerung & Progression): Beziehe das subjektive Anstrengungsempfinden ("rpeScore" 1-10) ein.
- Wenn RPE <= 4 (sehr leicht): "Ich habe gemerkt, das fiel dir heute leicht. Wenn du möchtest, können wir die Übungen beim nächsten Mal etwas knackiger gestalten."
- Wenn RPE 5-7 (moderat/optimal): "Die Intensität heute war genau richtig. Das ist der perfekte Bereich für nachhaltigen Fortschritt."
- Wenn RPE >= 8 (sehr hart): "Heute habe ich dich ganz schön herausgefordert! Ruh dich jetzt gut aus, dafür machen wir es morgen etwas ruhiger."
LEVEL-SYSTEM: Falls der Nutzer ein Level aufgestiegen ist, GRATULIERE begeistert und nenne den neuen Level-Titel! Das ist ein besonderer Moment.
Falls ein Streak-Meilenstein erreicht wurde (z.B. 7 Tage), erwähne das kurz und feiere die Beständigkeit.
Gib dem Nutzer das Gefühl, dass du seinen Fortschritt genau im Blick hast und stolz auf ihn bist.
Halte dich relativ kurz (max. 4-5 Sätze).
Verwende keine Emojis, Sterne (*) oder Markdown in deiner Antwort.`,
        });

        let prompt = "";
        if (userName && userName.toLowerCase() !== "du" && userName.toLowerCase() !== "sportler") {
            prompt += `Kontext: Begrüße den Nutzer ZWINGEND mit seinem Namen "${userName}" zu Beginn der Gratulation! (z.B. "Klasse gemacht, ${userName}! ...")\n`;
        } else {
            prompt += `Kontext: Beginne die Gratulation zwingend mit den Worten "Klasse gemacht!" oder "Super Leistung!" und erfinde keinen Namen.\n`;
        }

        prompt += `Der Nutzer hat gerade ein Training absolviert. Gratuliere ihm!\nAktuelle Trainingsdaten (heute absolviert): ${JSON.stringify(currentWorkoutStats)}\n`;

        if (profileContext && (profileContext.goals || profileContext.medicalConditions)) {
            prompt += `\nNutzerprofil (Ziele & evtl. Beschwerden): Ziele: ${profileContext.goals || 'Keine spezifischen'}. Beschwerden/Einschränkungen: ${profileContext.medicalConditions || 'Keine'}.\n`;
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
