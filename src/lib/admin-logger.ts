import { supabase } from "./supabaseClient";

export const API_CATEGORIES = {
    WORKOUT_GENERATION: "Workout Generation",
    ACTIVITY_IMAGE_GENERATION: "Activity Image Generation",
    SCHEDULE_GENERATION: "Schedule & Activity Generation",
    COACH_CHAT: "Coach Theo Chat",
    COACH_SCRIPT: "Coach Script",
    COACH_AUDIO: "Coach Audio / TTS",
    WORKOUT_SUMMARY: "Workout Summary",
    WORKOUT_ANALYSIS: "Workout Analysis",
    OTHER: "Other"
} as const;

export type ApiCategory = typeof API_CATEGORIES[keyof typeof API_CATEGORIES];

/**
 * Logs Gemini API usage and estimates exact cost.
 * Prices per 1M tokens (Standard 2026 pricing):
 * - Gemini 2.5 Flash: $0.15 Input, $0.60 Output
 * - Gemini 2.5 Flash TTS: $0.15 Input, $0.60 Output
 * - Imagen 3 / Flash Image: $0.03 flat per image
 * - Gemini 2.5 Pro: $1.25 Input, $5.00 Output
 * 
 * Conversion Rate: 1 USD = 0.92 EUR
 */
export async function logApiUsage(
    userId: string | null,
    feature: string,
    inputTokens: number,
    outputTokens: number,
    modelName: string = 'gemini-3.8-flash',
    prompt: string | null = null,
    response: string | null = null,
    promptKey: string | null = null,
    category: ApiCategory = API_CATEGORIES.OTHER
) {
    let costPerInputTokenUSD = 0.75 / 1_000_000;
    let costPerOutputTokenUSD = 3.75 / 1_000_000;
    let flatCostUSD = 0;

    const lowerModel = modelName.toLowerCase();

    if (lowerModel.includes('imagen') || lowerModel.includes('image')) {
        flatCostUSD = 0.020; // Imagen 3 Fast flat $0.020 per image
        costPerInputTokenUSD = 0;
        costPerOutputTokenUSD = 0;
    } else if (lowerModel.includes('tts') || lowerModel.includes('audio')) {
        // Gemini 3.1 Flash TTS / Gemini TTS audio tokens
        costPerInputTokenUSD = 1.00 / 1_000_000;
        costPerOutputTokenUSD = 20.00 / 1_000_000;
    } else if (lowerModel.includes('pro')) {
        costPerInputTokenUSD = 2.00 / 1_000_000;
        costPerOutputTokenUSD = 12.00 / 1_000_000;
    } else if (lowerModel.includes('3.8') || lowerModel.includes('3.7') || lowerModel.includes('3.6')) {
        costPerInputTokenUSD = 0.75 / 1_000_000;
        costPerOutputTokenUSD = 3.75 / 1_000_000;
    } else {
        // Default / Gemini 3.8 Flash pricing
        costPerInputTokenUSD = 0.75 / 1_000_000;
        costPerOutputTokenUSD = 3.75 / 1_000_000;
    }

    const estimatedCostUSD = flatCostUSD + (inputTokens * costPerInputTokenUSD) + (outputTokens * costPerOutputTokenUSD);
    const estimatedCostEUR = estimatedCostUSD * 0.92;

    try {
        await supabase.from('api_usage_logs').insert({
            user_id: userId || null,
            category: category,
            feature: promptKey ? `${feature} (${promptKey})` : `${feature} (${modelName})`,
            model_name: modelName,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: inputTokens + outputTokens,
            estimated_cost_usd: estimatedCostUSD,
            cost_eur: estimatedCostEUR,
            prompt_content: prompt,
            response_content: response,
            prompt_key: promptKey
        });
    } catch (e) {
        console.error("Failed to log API usage:", e);
    }
}

/**
 * Logs a high-level user activity.
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

/**
 * Checks if monthly budget has been exceeded.
 */
export async function isBudgetExceeded(monthlyLimit: number = 50.00): Promise<boolean> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    try {
        const { data, error } = await supabase
            .from('api_usage_logs')
            .select('cost_eur')
            .gte('created_at', firstDayOfMonth);

        if (error) throw error;

        const totalCost = data?.reduce((sum, log) => sum + (Number(log.cost_eur) || 0), 0) || 0;

        if (totalCost >= monthlyLimit) {
            console.warn(`[BUDGET EXCEEDED] Current: ${totalCost.toFixed(2)}€, Limit: ${monthlyLimit.toFixed(2)}€`);
            return true;
        }

        return false;
    } catch (e) {
        console.error("Failed to check budget:", e);
        return false;
    }
}
