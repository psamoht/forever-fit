import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: "./.env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function run() {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-preview-tts"
        });

        let prompt = `System Anweisung: Du bist "Coach Theo", ein motivierender und herzlicher Fitness-Coach für Senioren. 
Dein Ziel ist es, in 1-2 kurzen, gesprochenen Sätzen die aktuelle oder nächste Übung anzusagen.
Spreche den Nutzer immer mit "Du" an. Formuliere sehr natürlich.
Verwende keine Emojis, Sterne (*) oder Markdown in deiner Antwort. Lies nicht einfach die Beschreibung vor, sondern motiviere kurz und sag, was zu tun ist.\n\n`;
        prompt += "Übung: Liegestütze. Beschreibung: Test.";

        const response = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseModalities: ["AUDIO"]
            }
        });

        console.log("Success audio!");
    } catch (e) {
        console.error("Error from Gemini:", e);
    }
}
run();
