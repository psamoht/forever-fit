import { NextResponse } from "next/server";
import { logUserActivity } from "@/lib/admin-logger";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
    try {
        const { userId, type, description, metadata } = await req.json();

        if (!userId || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Only log "app_opened" once per day to avoid spamming the database
        if (type === 'app_opened') {
            const todayStr = new Date().toISOString().split('T')[0];
            const { data } = await supabaseAdmin
                .from('user_activities')
                .select('id')
                .eq('user_id', userId)
                .eq('activity_type', 'app_opened')
                .gte('created_at', `${todayStr}T00:00:00Z`)
                .limit(1);

            if (data && data.length > 0) {
                return NextResponse.json({ success: true, skipped: true }); // Already logged today
            }
        }

        await logUserActivity(userId, type, description || type, metadata);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Telemetry Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
