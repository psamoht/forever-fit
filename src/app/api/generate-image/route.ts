import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    try {
        const { exerciseId, exerciseName, description } = await req.json();

        if (!exerciseId || !exerciseName) {
            return NextResponse.json({ error: "Missing exerciseId or exerciseName" }, { status: 400 });
        }

        const prompt = `A minimalist, flat vector illustration of an elderly person performing ${exerciseName}. ${description || ''}. Clean white background, soft pastel emerald and teal colors, simple shapes, 2D fitness app style, friendly and accessible. NO TEXT or letters in the image.`;

        // Direct fetch to Google REST API for Imagen 3
        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                instances: [
                    { prompt }
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "1:1",
                    personGeneration: "allow_adult"
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Imagen API Error:", errorText);
            return NextResponse.json({ error: "Failed to generate image from external API" }, { status: response.status });
        }

        const result = await response.json();
        const base64Image = result.predictions?.[0]?.bytesBase64Encoded;

        if (!base64Image) {
            return NextResponse.json({ error: "No image generated" }, { status: 500 });
        }

        // Save image to the public/exercises map locally
        const publicDir = path.join(process.cwd(), 'public', 'exercises');
        try {
            await fs.mkdir(publicDir, { recursive: true });
        } catch { } // Ignore if exists

        const fileName = `${exerciseId}.png`;
        const filePath = path.join(publicDir, fileName);

        // Write the base64 string directly as a binary file
        await fs.writeFile(filePath, Buffer.from(base64Image, 'base64'));

        return NextResponse.json({ success: true, url: `/exercises/${fileName}` });

    } catch (error) {
        console.error("Error in generate-image route:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
