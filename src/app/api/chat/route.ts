import { COACH_SYSTEM_PROMPT, model as defaultModel } from "@/lib/gemini";
import { NextResponse } from "next/server";
import { logApiUsage, logUserActivity, isBudgetExceeded } from "@/lib/admin-logger";
import { getOrCreateContextCache } from "@/lib/gemini-cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        // 0. Safety Switch Check
        if (await isBudgetExceeded()) {
            return NextResponse.json({
                error: "Monatliches KI-Budget erreicht. Bitte wende dich an den Administrator.",
                isBudgetExceeded: true
            }, { status: 403 });
        }
        const { message, history, profileContext } = await req.json();

        // Build context-aware prompt with user's current state
        let contextBlock = '';
        if (profileContext) {
            const p = profileContext;
            contextBlock = `

AKTUELLER KONTEXT DES NUTZERS (nutze diese Infos, um fundierte Antworten zu geben):
- Name: ${p.display_name || 'Unbekannt'}
- Alter: ${p.birth_year ? `${new Date().getFullYear() - p.birth_year} Jahre` : 'Nicht angegeben'}
- Geschlecht: ${p.gender === 'male' ? 'Männlich' : p.gender === 'female' ? 'Weiblich' : 'Nicht angegeben'}
- Ziele: ${p.goals || 'Nicht festgelegt'}
- Einschränkungen: ${p.medical_conditions || 'Keine bekannten'}
- Equipment: ${p.equipment ? JSON.stringify(p.equipment) : 'Nur Körpergewicht'}
${p.training_state ? `- Progressions-Faktor: ${p.training_state.progression_factor?.toFixed(2) || '1.00'}
- Recovery-Status: ${p.training_state.recovery_status || 'ready'}
- Durchschnittliche RPE (letzte 5): ${p.training_state.avg_rpe_last_5?.toFixed(1) || '5.0'}` : ''}
${p.currentSchedule ? `- Aktueller Wochenplan:
${p.currentSchedule.map((s: any) => `  ${s.day_of_week}: ${s.activity_title || s.theme || 'Ruhetag'} (${s.theme || 'rest'})`).join('\n')}` : ''}
`;
        }

        // Combine system prompt with live context
        const fullSystemPrompt = COACH_SYSTEM_PROMPT + contextBlock;

        const formattedHistory = history.map((h: any) => ({
            role: h.role,
            parts: [{ text: h.text }]
        }));

        if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.unshift({
                role: 'user',
                parts: [{ text: "Hallo Coach, ich bin hier." }]
            });
        }

        const userId = profileContext?.id || null;
        let responseText = "";
        let inputTokens = 0;
        let outputTokens = 0;
        let usedCache = false;

        // Calculate exact tokens to determine if we can use Context Caching (min 4096)
        const countPayload = {
            contents: [
                { role: "user", parts: [{ text: fullSystemPrompt }] },
                ...formattedHistory
            ]
        };
        const tokenCheckResponse = await defaultModel.countTokens(countPayload);
        const totalTokens = tokenCheckResponse.totalTokens;

        if (totalTokens >= 4096 && userId) {
            // Context is large enough for Gemini Caching
            const cacheObj = await getOrCreateContextCache(userId, fullSystemPrompt, formattedHistory);
            if (cacheObj) {
                usedCache = true;
                const cachedModel = genAI.getGenerativeModel({
                    model: "gemini-2.0-flash",
                    cachedContent: cacheObj as any
                });

                // When using a cache that already contains the system prompt and history,
                // we only need to pass the new message
                const result = await cachedModel.generateContent(message);
                responseText = result.response.text();
                inputTokens = result.response.usageMetadata?.promptTokenCount || 0;
                outputTokens = result.response.usageMetadata?.candidatesTokenCount || 0;
            }
        }

        // Fallback or if tokens < 4096 (very cheap anyway)
        if (!usedCache) {
            const chat = defaultModel.startChat({
                history: formattedHistory,
                generationConfig: { maxOutputTokens: 1000 },
                systemInstruction: {
                    role: "system",
                    parts: [{ text: fullSystemPrompt }]
                }
            });

            const result = await chat.sendMessage(message);
            responseText = result.response.text();
            inputTokens = result.response.usageMetadata?.promptTokenCount || 0;
            outputTokens = result.response.usageMetadata?.candidatesTokenCount || 0;
        }

        Promise.all([
            logApiUsage(userId, usedCache ? 'chat (cached)' : 'chat', inputTokens, outputTokens, 'gemini-2.0-flash', fullSystemPrompt + "\n\nUser: " + message, responseText, 'coach-theo-chat'),
            logUserActivity(userId, 'chat_interaction', 'Interacted with Coach Theo in Chat', { messageLength: message?.length || 0, tokens: totalTokens, cached: usedCache })
        ]).catch(e => console.error("Admin Logging Error:", e));

        // Parse all JSON action blocks from the response
        let assessmentComplete = false;
        let profileData = null;
        let cleanText = responseText;
        const actions: any[] = [];

        // Find ALL json blocks in the response
        const jsonRegex = /```json\n([\s\S]*?)\n```/g;
        let match;
        while ((match = jsonRegex.exec(responseText)) !== null) {
            try {
                const data = JSON.parse(match[1]);

                // Assessment completion
                if (data.assessment_complete) {
                    assessmentComplete = true;
                    profileData = data.data;
                }

                // Schedule update
                if (data.update_schedule) {
                    actions.push({
                        action: 'update_schedule',
                        payload: data.update_schedule
                    });
                }

                // Training state update (for recovery/progression adjustments)
                if (data.update_training_state) {
                    actions.push({
                        action: 'update_training_state',
                        payload: data.update_training_state
                    });
                }

                // Profile update (goals, medical conditions)
                if (data.update_profile) {
                    actions.push({
                        action: 'update_profile',
                        payload: data.update_profile
                    });
                }

                // Equipment update
                if (data.update_equipment) {
                    actions.push({
                        action: 'update_equipment',
                        payload: data.update_equipment
                    });
                }

                // Remove JSON block from visible text
                cleanText = cleanText.replace(match[0], '').trim();
            } catch (e) {
                console.error("Failed to parse JSON from model response", e);
            }
        }

        // If there are actions, set profileData to the first one (backward compat)
        // and attach all actions for the frontend to process
        if (actions.length > 0 && !profileData) {
            profileData = actions[0];
        }

        return NextResponse.json({
            text: cleanText,
            assessmentComplete,
            profileData,
            actions // All parsed actions for the frontend
        });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

