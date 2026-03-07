import { COACH_SYSTEM_PROMPT, model } from "@/lib/gemini";
import { NextResponse } from "next/server";
import { logApiUsage, logUserActivity } from "@/lib/admin-logger";

export async function POST(req: Request) {
    try {
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

        const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
                maxOutputTokens: 1000,
            },
            systemInstruction: {
                role: "system",
                parts: [{ text: fullSystemPrompt }]
            }
        });

        const result = await chat.sendMessage(message);
        const response = result.response;
        const text = response.text();

        const inputTokens = response.usageMetadata?.promptTokenCount || 0;
        const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
        const userId = profileContext?.id || null;

        Promise.all([
            logApiUsage(userId, 'chat', inputTokens, outputTokens),
            logUserActivity(userId, 'chat_interaction', 'Interacted with Coach Theo in Chat', { messageLength: message?.length || 0 })
        ]).catch(e => console.error("Admin Logging Error:", e));

        // Parse all JSON action blocks from the response
        let assessmentComplete = false;
        let profileData = null;
        let cleanText = text;
        const actions: any[] = [];

        // Find ALL json blocks in the response
        const jsonRegex = /```json\n([\s\S]*?)\n```/g;
        let match;
        while ((match = jsonRegex.exec(text)) !== null) {
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

