const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const realKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, realKey);

async function runMissingMigration() {
    console.log("Running missing migration SQL directly...");

    // SQL from 20260226_add_workout_scoring.sql
    const sql = `
        ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS rpe_score integer CHECK (rpe_score >= 1 AND rpe_score <= 10);
        ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS upper_body_points integer DEFAULT 0;
        ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS lower_body_points integer DEFAULT 0;
        ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS core_points integer DEFAULT 0;
        ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS flexibility_points integer DEFAULT 0;
        ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS cardio_points integer DEFAULT 0;
        ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS target_score integer DEFAULT 0;
    `;

    // Supabase JS doesn't have a direct .query() method for arbitrary SQL without a wrapper RPC
    // But we can try to use the REST API via fetch if we have the service key
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${realKey}`,
                'apikey': realKey
            },
            body: JSON.stringify({ sql })
        });

        if (response.ok) {
            console.log("Migration executed successfully via exec_sql RPC.");
        } else {
            const errText = await response.text();
            console.log("exec_sql RPC not found or failed, falling back to manual column creation via table editor API (simulated)...");

            // If RPC is missing, we can try to just use the code to DONT send these columns
            // OR we can create them one by one if the API allows it (usually not for ALTER TABLE)

            console.error("Migration failed:", errText);
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

runMissingMigration();
