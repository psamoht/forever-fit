import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";
import { logApiUsage } from "@/lib/admin-logger";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    try {
        const { userId, exerciseId, exerciseName, description, gender, age } = await req.json();

        if (!exerciseId || !exerciseName) {
            return NextResponse.json({ error: "Missing exerciseId or exerciseName" }, { status: 400 });
        }

        // 1. Calculate Demographic Hash
        const safeGender = gender ? gender.toLowerCase() : "diverse";
        // Calculate age decade (e.g., 65 -> "60s", 72 -> "70s")
        const ageDecade = age ? `${Math.floor(age / 10) * 10}s` : "default";

        // Define cache filename inside the 'exercise-media' bucket
        // We use .png for now as Imagen3 generates static images. Can be swapped to .gif later.
        const fileName = `${exerciseId}_${safeGender}_${ageDecade}.png`;

        // 2. Cache Check (Supabase Storage)
        const { data: publicUrlData } = supabase.storage
            .from('exercise-media')
            .getPublicUrl(fileName);

        // We need to ping the URL or check if the file exists because getPublicUrl always returns a string, even if the file is missing in public buckets.
        // Let's use the list API or try to fetch the headers.
        try {
            const checkRes = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
            if (checkRes.ok) {
                console.log(`[Cache Hit] Serving existing media for: ${fileName}`);
                return NextResponse.json({ success: true, url: publicUrlData.publicUrl, fromCache: true });
            }
        } catch (e) {
            // File probably doesn't exist, proceed to generate
        }

        // 3. Cache Miss - Generate via API
        console.log(`[Cache Miss] Generating new media for: ${fileName}`);

        // Construct customized demographic prompt
        // Construct customized demographic and strict consistency prompt
        const demographicPrompt = `Ein ca. ${age || '65'}-jähriger ${safeGender === 'male' ? 'Mann' : safeGender === 'female' ? 'Frau' : 'Mensch'}`;

        // Define strict character traits based on demographic to enforce cross-image consistency
        let characterTraits = "";
        if (safeGender === 'male') {
            characterTraits = "He has short neat grey hair, clean-shaven (NO beard, NO mustache), NO glasses, wearing a simple emerald green athletic t-shirt and dark grey shorts.";
        } else if (safeGender === 'female') {
            characterTraits = "She has shoulder-length straight grey hair tied in a ponytail, NO glasses, wearing a simple emerald green athletic t-shirt and dark grey leggings.";
        } else {
            characterTraits = "They have short neat grey hair, clean-shaven, NO glasses, wearing a simple emerald green athletic t-shirt and dark grey shorts.";
        }

        const prompt = `A minimalist, flat vector 2D illustration of EXACTLY ONE single person performing the exercise: "${exerciseName}". 
        Context: ${description || ''}. 
        Subject: ${demographicPrompt}. ${characterTraits}
        Constraints:
        - ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS anywhere in the image.
        - EXACTLY ONE PERSON in the frame. Do not draw background people or trainers.
        - The person must look identical to the description above in every generation.
        - Any fitness equipment (dumbbells, mats) must be purely dark grey and minimalist.
        - Clean solid white background. Soft pastel emerald and teal accent colors for abstract shapes behind the person.
        - Friendly and accessible fitness app style.`;

        // Fetch to Google REST API for imagen-3.0-generate-001 (Currently disabled/failing)
        // Bypassing directly to placeholder to guarantee 100% stability and 0 costs.
        console.log(`[Cache Miss] Bypassing generation for: ${fileName} - returning placeholder.`);

        // A valid placeholder from the existing DB or an external fast placeholder service
        const placeholderUrl = "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1000&auto=format&fit=crop";

        logApiUsage(userId || 'system', 'generate-media', 0, 0, 'imagen-3', prompt, placeholderUrl).catch(console.error);

        return NextResponse.json({ success: true, url: placeholderUrl, fromCache: false, isPlaceholder: true });

    } catch (error) {
        console.error("Error in generate-media route:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
