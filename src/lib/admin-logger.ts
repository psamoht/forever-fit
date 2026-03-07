import { supabase } from "./supabaseClient";

/**
 * Logs Gemini API usage and estimates cost.
 * Gemini 2.0 Flash cost (approx): $0.15 / 1M input tokens, $0.60 / 1M output tokens
 */
export async function logApiUsage(userId: string, feature: string, inputTokens: number, outputTokens: number) {
    if (!userId) return;

    const costPerInputToken = 0.15 / 1_000_000;
    const costPerOutputToken = 0.60 / 1_000_000;
    const estimatedCost = (inputTokens * costPerInputToken) + (outputTokens * costPerOutputToken);

    try {
        await supabase.from('api_usage_logs').insert({
            user_id: userId,
            feature,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            estimated_cost_usd: estimatedCost
        });
    } catch (e) {
        console.error("Failed to log API usage:", e);
    }
}

/**
 * Logs a high-level user activity abstractly.
 * @param actionType e.g., 'app_open', 'workout_start', 'chat'
 * @param description e.g., 'Started Workout: Upper Body'
 */
export async function logUserActivity(userId: string, actionType: string, description: string, metadata: any = null) {
    if (!userId) return;

    try {
        await supabase.from('user_activities').insert({
            user_id: userId,
            action_type: actionType,
            description,
            metadata: metadata || {}
        });
    } catch (e) {
        console.error("Failed to log user activity:", e);
    }
}
