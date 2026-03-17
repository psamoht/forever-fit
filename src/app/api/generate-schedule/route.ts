import { model } from "@/lib/gemini";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logApiUsage } from "@/lib/admin-logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, goals, medical_conditions, equipment, days_per_week, minutes_per_session } = body;

        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 });
        }

        const daysPerWeek = days_per_week || 4;
        const conditionsStr = Array.isArray(medical_conditions)
            ? medical_conditions.join(", ")
            : (medical_conditions || "keine");
        const equipStr = Array.isArray(equipment)
            ? equipment.map((e: any) => typeof e === "object" ? e.name : e).join(", ")
            : (equipment || "Nur Körpergewicht");

        const prompt = `Du bist ein Sportwissenschaftler und erstellst einen personalisierten Wochenplan.

PROFIL:
- Ziele: ${goals || "Allgemeine Fitness"}
- Einschränkungen: ${conditionsStr}
- Equipment: ${equipStr}
- Gewünschte Trainingstage pro Woche: ${daysPerWeek}
- Minuten pro Trainingseinheit: ${minutes_per_session || 20}
- Alter: ${body.age ? `${body.age} Jahre` : 'Nicht angegeben'}

ALTERSADAPTIVE REGELN:
- Unter 30: Mehr intensive Workout-Tage möglich, HIIT & schwere Kraft erlaubt
- 30-50: Ausgewogene Mischung aus Kraft, Cardio und Mobility
- 50-65: Mehr Fokus auf funktionelle Fitness und Gelenkgesundheit
- Über 65: Besonderer Fokus auf Mobility, Balance und Sturzprävention, sanfte Steigerung

REGELN:
- Genau 7 Tage (Montag-Sonntag)
- Exakt ${daysPerWeek} Tage als "workout", Rest verteilt auf "rest" und "active_recovery"
- Dieselbe Muskelgruppe NIEMALS an zwei aufeinanderfolgenden Tagen
- Mische Kraft, Ausdauer und Beweglichkeit
- Themes: "upper_body", "lower_body", "core", "full_body", "cardio", "mobility", "rest"
- activity_type: "workout", "active_recovery", oder "rest"
- activity_title: Motivierender deutscher Titel
- Berücksichtige die Einschränkungen bei der Themenwahl

Antworte NUR mit einem JSON-Array, kein anderer Text:
[
  {"day_of_week": "Montag", "activity_title": "...", "activity_type": "workout", "theme": "..."},
  {"day_of_week": "Dienstag", "activity_title": "...", "activity_type": "...", "theme": "..."},
  ...
]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const inputTokens = result.response.usageMetadata?.promptTokenCount || 0;
        const outputTokens = result.response.usageMetadata?.candidatesTokenCount || 0;
        logApiUsage(userId, "generate-schedule", inputTokens, outputTokens, 'gemini-2.0-flash', prompt, text).catch(console.error);

        // Parse JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("Failed to parse schedule JSON from:", text);
            return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
        }

        const schedule = JSON.parse(jsonMatch[0]);

        // Delete existing schedule for this user (clean slate)
        await supabaseAdmin
            .from("weekly_schedules")
            .delete()
            .eq("user_id", userId);

        // Insert new schedule
        const rows = schedule.map((entry: any) => ({
            user_id: userId,
            day_of_week: entry.day_of_week,
            activity_title: entry.activity_title,
            activity_type: entry.activity_type,
            theme: entry.theme,
        }));

        const { error: insertError } = await supabaseAdmin
            .from("weekly_schedules")
            .insert(rows);

        if (insertError) {
            console.error("Error inserting schedule:", insertError);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        return NextResponse.json({ success: true, schedule: rows });

    } catch (error) {
        console.error("generate-schedule error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
