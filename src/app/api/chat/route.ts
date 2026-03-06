import { COACH_SYSTEM_PROMPT, model } from "@/lib/gemini";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { message, history } = await req.json();

        // Construct the context-aware prompt
        // Ideally we maintain a clean chat session object, but for now we reconstruct.
        // Gemini requires history to start with 'user'.
        // If our UI starts with a model greeting, we need to prepend a fake user message.
        const formattedHistory = history.map((h: any) => ({
            role: h.role,
            parts: [{ text: h.text }]
        }));

        if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.unshift({
                role: 'user',
                parts: [{ text: "Hallo Coach, ich starte jetzt das Assessment." }]
            });
        }

        const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
                maxOutputTokens: 500,
            },
            systemInstruction: {
                role: "system",
                parts: [{ text: COACH_SYSTEM_PROMPT }]
            }
        });

        // NOTE: handling system instruction in Gemini API via REST sometimes needs specific formatting or 'system' role depending on SDK version.
        // The GoogleGenerativeAI SDK supports `systemInstruction` in `getGenerativeModel` config, or we can prepend it.
        // Let's refine the model initialization in lib/gemini.ts if needed, but for now prepending context is safer if unsure about SDK version features.

        // Actually, for simple context, let's just send the message.
        const result = await chat.sendMessage(message);
        const response = result.response;
        const text = response.text();

        // Check for JSON block indicating assessment completion
        let assessmentComplete = false;
        let profileData = null;
        let cleanText = text;

        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            try {
                const jsonStr = jsonMatch[1];
                const data = JSON.parse(jsonStr);

                // Case 1: Assessment
                if (data.assessment_complete) {
                    assessmentComplete = true;
                    profileData = data.data;
                    cleanText = text.replace(jsonMatch[0], "").trim();
                }

                // Case 2: Equipment Update
                if (data.update_equipment) {
                    cleanText = text.replace(jsonMatch[0], "").trim();
                    profileData = {
                        action: 'update_equipment',
                        payload: data.update_equipment
                    };
                }

                // Case 3: Schedule Update
                if (data.update_schedule) {
                    cleanText = text.replace(jsonMatch[0], "").trim();
                    profileData = {
                        action: 'update_schedule',
                        payload: data.update_schedule
                    };
                }

            } catch (e) {
                console.error("Failed to parse JSON from model response", e);
            }
        }

        return NextResponse.json({
            text: cleanText,
            assessmentComplete,
            profileData // This now carries either assessment data OR action data
        });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
