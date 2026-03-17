import { GoogleAICacheManager } from "@google/generative-ai/server";
import { supabase } from "./supabaseClient";

let cacheManager: GoogleAICacheManager | null = null;
if (process.env.GEMINI_API_KEY) {
    cacheManager = new GoogleAICacheManager(process.env.GEMINI_API_KEY);
}

export async function getOrCreateContextCache(
    userId: string,
    systemInstructionText: string,
    history: any[]
): Promise<any | null> {
    if (!cacheManager) return null;

    try {
        // 1. Check if user already has an active cache
        const { data: profile } = await supabase
            .from('profiles')
            .select('gemini_cache_name, gemini_cache_expires_at')
            .eq('id', userId)
            .single();

        let activeCacheName = null;
        if (profile?.gemini_cache_name && profile?.gemini_cache_expires_at) {
            const expiresAt = new Date(profile.gemini_cache_expires_at);
            // If it expires in more than 10 minutes, we can still use it
            if (expiresAt > new Date(Date.now() + 10 * 60000)) {
                activeCacheName = profile.gemini_cache_name;
                try {
                    const existingCache = await cacheManager.get((activeCacheName as string));
                    return existingCache;
                } catch(e) {
                    console.error("Cache expired on Google side", e);
                }
            }
        }

        // 2. No valid cache, create a new one.
        // Cache needs a displayName
        const displayName = `user-${userId}-chat-cache`;

        // Format system instruction and history for the cache API format
        const contents = history.map((h: any) => ({
            role: h.role,
            parts: [...h.parts]
        }));

        const newCache = await cacheManager.create({
            model: "models/gemini-2.0-flash",
            displayName,
            systemInstruction: {
                role: "system",
                parts: [{ text: systemInstructionText }]
            },
            contents: contents, // Upload the entire history at this point
            ttlSeconds: 3600 * 2 // Cache for 2 hours
        });

        const expiresAt = new Date(Date.now() + (3600 * 2 * 1000)).toISOString();

        // 3. Save to DB
        await supabase
            .from('profiles')
            .update({
                gemini_cache_name: newCache.name,
                gemini_cache_expires_at: expiresAt
            })
            .eq('id', userId);

        return newCache;

    } catch (error) {
        console.error("Failed to manage Gemini Context Cache:", error);
        return null; // Fallback to non-cached execution
    }
}
