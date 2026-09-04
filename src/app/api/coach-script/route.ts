import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { encodeWAV } from "@/lib/audio-utils";
import { logApiUsage, API_CATEGORIES } from "@/lib/admin-logger";

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
        const { exerciseName, exerciseDescription, isNext, userName, isFirst, isLast, sets, reps, duration, mode, muscleGroup, isVariant, baseExerciseName, userId } = body;

        // 1. Generate text script
        const textModel = genAI.getGenerativeModel({
            model: "gemini-3.8-flash",
            systemInstruction: `Du bist "Coach Theo", ein motivierender und herzlicher Fitness-Coach. Deine Stimme ist männlich, beruhigend, aber bestimmt.
Der Nutzer soll nicht auf den Bildschirm schauen müssen. Erkläre die wichtigste Bewegung ("Stell dich schulterbreit hin und beuge...").
Spreche den Nutzer IMMER persönlich mit seinem Namen an, wenn du ihn begrüßt. Verwende NIEMALS generische Phrasen wie "Meine Lieben", "Team" oder "Leute".
Verwende keine Emojis, Sterne (*) oder Markdown in deiner Antwort. Lies nicht stur die Beschreibung ab, sondern sag anfeuernd, was und wie viel zu tun ist.`,
        });

        let prompt = `Aktuelle Übung: "${exerciseName}".\n`;

        if (isVariant) {
            prompt += `Kontext: Das ist eine abgewandelte Variante der vorherigen Übung "${baseExerciseName}". Erkläre NICHT nochmal die ganze Übung, sondern sage NUR kurz, was sich jetzt ändert oder worauf man speziell achten muss ("Wir machen es jetzt etwas schwerer, indem du...").\n`;
            prompt += `Beschreibung der Änderung: "${exerciseDescription}".\n`;
        } else {
            prompt += `Beschreibung der Ausführung: "${exerciseDescription}". (Fasse dies in 1-2 Sätzen natürlich zusammen, damit der Nutzer weiß, was er tun soll, ohne auf den Bildschirm zu schauen).\n`;
        }

        if (muscleGroup && !isVariant) {
            prompt += `Fokus/Muskelgruppe: "${muscleGroup}". (Erwähne den Fokus gerne natürlich im Satz, z.B. "jetzt stärken wir...").\n`;
        }

        if (mode === 'timer' && duration) {
            prompt += `Zu absolvierendes Ziel: ${sets} ${sets > 1 ? 'Sätze' : 'Satz'} à ${duration} Sekunden.\n`;
        } else if (mode === 'reps' && reps) {
            prompt += `Zu absolvierendes Ziel: ${sets} ${sets > 1 ? 'Sätze' : 'Satz'} à ${reps} Wiederholungen.\n`;
        }

        prompt += `WICHTIGE LOGIK-REGEL: Wenn die Übung zwei Seiten oder Richtungen hat (z.B. linkes/rechtes Bein, im Uhrzeigersinn/Gegenuhrzeigersinn) UND ${sets} Sätze angegeben sind, bedeutet das: Jeder Satz steht für EINE Seite/Richtung. Vermeide es so zu klingen, als müsste man pro Seite ${sets} Sätze machen. Sag stattdessen z.B.: "Wir machen ${sets} Sätze, also einen pro Seite/Richtung, mit jeweils ${reps || duration} ${mode === 'timer' ? 'Sekunden' : 'Wiederholungen'}."\n`;

        prompt += `WICHTIGE NAMENS-REGEL: Der Nutzer heißt "${userName || "Sportler"}". Sprich ihn persönlich mit Vornamen an ("Sehr gut, ${userName}!" oder "Weiter so, ${userName}!"). Erfinde KEINE Floskeln wie "Meine Lieben", "Team" oder "Leute"!\n`;

        if (isFirst) {
            if (userName && userName.toLowerCase() !== "du" && userName.toLowerCase() !== "sportler") {
                prompt += `Kontext: Das ist die ALLERERSTE Übung des Workouts. Begrüße den Nutzer ZWINGEND mit seinem Namen "${userName}" zum Start! (z.B. "Hallo ${userName}, ...")\n`;
            } else {
                prompt += `Kontext: Das ist die ALLERERSTE Übung des Workouts. Beginne deine Antwort zwingend exakt mit den Worten "Hallo, schön dass du da bist!" und erfinde keinen Namen.\n`;
            }
        } else if (isLast) {
            prompt += `Kontext: Das ist die LETZTE Übung des Workouts! Motiviere den Nutzer stark für den Endspurt.\n`;
        } else if (isNext) {
            prompt += `Kontext: Das ist die nächste Übung mitten im Workout.\n`;
        }

        const textResponse = await textModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const textInputTokens = textResponse.response.usageMetadata?.promptTokenCount || 0;
        const textOutputTokens = textResponse.response.usageMetadata?.candidatesTokenCount || 0;

        let text = textResponse.response.text().replace(/[*#_]/g, "").trim();

        // 2. Synthesize audio
        let base64Audio = null;
        let audioInputTokens = 0;
        let audioOutputTokens = 0;
        let usedAudioModel = "gemini-3.1-flash-tts";

        try {
            let audioModel;
            try {
                audioModel = genAI.getGenerativeModel({
                    model: "gemini-3.1-flash-tts"
                });
            } catch {
                usedAudioModel = "gemini-2.5-flash-preview-tts";
                audioModel = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash-preview-tts"
                });
            }

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
            const parts = audioData.candidates?.[0]?.content?.parts;
            if (parts && parts.length > 0) {
                for (const part of parts) {
                    if (part.inlineData && part.inlineData.mimeType.startsWith('audio')) {
                        const pcmBuffer = Buffer.from(part.inlineData.data, "base64");
                        // Assuming PCM 24000Hz from Gemini TTS
                        const wavBuf = encodeWAV(new Uint8Array(pcmBuffer), 24000);
                        base64Audio = wavBuf.toString("base64");
                    }
                }
            }

            audioInputTokens = audioResponse.response.usageMetadata?.promptTokenCount || 0;
            audioOutputTokens = audioResponse.response.usageMetadata?.candidatesTokenCount || 0;
        } catch (audioErr) {
            console.warn("Audio TTS synthesis with 3.1-flash-tts failed, trying fallback to 2.5-flash-preview-tts:", audioErr);
            try {
                usedAudioModel = "gemini-2.5-flash-preview-tts";
                const fallbackAudioModel = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash-preview-tts"
                });
                const audioResponse = await fallbackAudioModel.generateContent({
                    contents: [{ role: 'user', parts: [{ text }] }],
                    generationConfig: {
                        // @ts-ignore
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: "Puck"
                                }
                            }
                        }
                    }
                });
                const parts = audioResponse.response.candidates?.[0]?.content?.parts;
                if (parts && parts.length > 0) {
                    for (const part of parts) {
                        if (part.inlineData && part.inlineData.mimeType.startsWith('audio')) {
                            const pcmBuffer = Buffer.from(part.inlineData.data, "base64");
                            const wavBuf = encodeWAV(new Uint8Array(pcmBuffer), 24000);
                            base64Audio = wavBuf.toString("base64");
                        }
                    }
                }
                audioInputTokens = audioResponse.response.usageMetadata?.promptTokenCount || 0;
                audioOutputTokens = audioResponse.response.usageMetadata?.candidatesTokenCount || 0;
            } catch (fallbackErr) {
                console.warn("TTS fallback also failed:", fallbackErr);
            }
        }

        // Fire and forget logging
        if (userId) {
            Promise.all([
                logApiUsage(userId, 'coach-script-text', textInputTokens, textOutputTokens, 'gemini-3.8-flash', prompt, text, 'coach-script', API_CATEGORIES.COACH_SCRIPT),
                ...(base64Audio ? [logApiUsage(userId, 'coach-script-audio', audioInputTokens, audioOutputTokens, usedAudioModel, text, 'AUDIO_RESPONSE', 'coach-audio-tts', API_CATEGORIES.COACH_AUDIO)] : [])
            ]).catch(console.error);
        }

        return NextResponse.json({ success: true, text, audio: base64Audio });

    } catch (error: any) {
        console.error("Error generating coach script:", error);
        return NextResponse.json({ success: false, error: "Fehler bei der Generierung", details: error?.message || String(error) }, { status: 500 });
    }
}
