import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    try {
        const { exerciseId, exerciseName, description, gender, age } = await req.json();

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

        // Fetch to Google REST API for gemini-3.1-flash-image-preview (Nano Banana 2)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`;

        console.time("GeminiImageAPI");
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt }
                    ]
                }],
                generationConfig: {
                    imageConfig: {
                        aspectRatio: "1:1",
                        imageSize: "1K"
                    }
                }
            })
        });
        console.timeEnd("GeminiImageAPI");

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Imagen API Error:", errorText);
            return NextResponse.json({ error: "Failed to generate image from external API" }, { status: response.status });
        }

        const result = await response.json();
        const base64Image = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Image) {
            return NextResponse.json({ error: "No image generated" }, { status: 500 });
        }

        // Convert base64 to Blob
        const buffer = Buffer.from(base64Image, 'base64');

        // 4. Save to Cache using Admin client (bypasses RLS for server-side insertion)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        console.time("SupabaseUpload");
        const { error: uploadError } = await supabaseAdmin.storage
            .from('exercise-media')
            .upload(fileName, buffer, {
                contentType: 'image/png',
                upsert: true
            });
        console.timeEnd("SupabaseUpload");

        if (uploadError) {
            console.error("Failed to upload to cache:", uploadError);
            // Return success anyway, just without cache persistence for next time
        }

        return NextResponse.json({ success: true, url: publicUrlData.publicUrl, fromCache: false });

    } catch (error) {
        console.error("Error in generate-media route:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
