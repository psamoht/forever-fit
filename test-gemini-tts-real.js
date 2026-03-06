import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: "./.env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-tts" });
        const response = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: "Hallo, dies ist ein Test für Text to Speech." }] }],
            // @ts-ignore
            generationConfig: {
                // @ts-ignore
                responseModalities: ["AUDIO"]
            }
        });

        console.log("Success text:", response.response.text());

        let audioFound = false;
        const parts = response.response.candidates?.[0]?.content?.parts;
        if (parts && parts.length > 0) {
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('audio')) {
                    audioFound = true;
                    console.log("Audio length:", part.inlineData.data.length);
                }
            }
        }
        console.log("Audio found?", audioFound);
    } catch (e) {
        console.error("Error from Gemini:", e);
    }
}
run();
