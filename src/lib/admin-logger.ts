import { supabase } from "./supabaseClient";

/**
 * Logs Gemini API usage and estimates exact cost.
 * Prices per 1M tokens based on standard March 2026 pricing:
 * Gemini 2.0 Flash: $0.10 Input, $0.40 Output
 * Gemini 1.5 Flash: $0.075 Input, $0.30 Output
 * Gemini 1.5 Pro: $1.25 Input, $5.00 Output
 * Imagen 3: $0.03 per image
 * 
 * Conversion Rate 1 USD = 0.92 EUR
 */
export async function logApiUsage(
    userId: string | null,
    feature: string,
    inputTokens: number,
    outputTokens: number,
    modelName: string = 'gemini-2.0-flash',
    prompt: string | null = null,
    response: string | null = null,
    promptKey: string | null = null
) {
    if (!userId) return;

    let costPerInputTokenUSD = 0.10 / 1_000_000;
    let costPerOutputTokenUSD = 0.40 / 1_000_000;
    let flatCostUSD = 0;

    const lowerModel = modelName.toLowerCase();

    if (lowerModel.includes('1.5-flash')) {
        costPerInputTokenUSD = 0.075 / 1_000_000;
        costPerOutputTokenUSD = 0.30 / 1_000_000;
    } else if (lowerModel.includes('imagen')) {
        flatCostUSD = 0.03; // Flat $0.03 per generated image
        costPerInputTokenUSD = 0;
        costPerOutputTokenUSD = 0;
    } else if (lowerModel.includes('pro')) {
        costPerInputTokenUSD = 1.25 / 1_000_000;
        costPerOutputTokenUSD = 5.00 / 1_000_000;
    } else {
        // Default to 2.0 flash pricing
        costPerInputTokenUSD = 0.10 / 1_000_000;
        costPerOutputTokenUSD = 0.40 / 1_000_000;
    }

    const estimatedCostUSD = flatCostUSD + (inputTokens * costPerInputTokenUSD) + (outputTokens * costPerOutputTokenUSD);
    const estimatedCostEUR = estimatedCostUSD * 0.92; // 1 USD = 0.92 EUR

    try {
        await supabase.from('api_usage_logs').insert({
            user_id: userId,
            feature: promptKey ? `${feature} (${promptKey})` : `${feature} (${modelName})`,
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
        console.error("Failed to user activity logging:", e);
    }
}
/**
 * Checks if the monthly budget for API costs has been exceeded.
 * @param monthlyLimit Default 50.00 EUR
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
        return false; // Fail safe - allow API calls if check fails, but log it
    }
}
