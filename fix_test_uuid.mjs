import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZ2x5aGZneHN5cHN6b25tdXp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU4MTA1NywiZXhwIjoyMDg0MTU3MDU3fQ.V8QTGCPrHBRZAEC6R0t7S7_aV_Qt6uUpf95Wgrk7O6E";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const errorFromImage = {
        workout_id: "c28e4b95-f442-4c63-9693-42140e73ec03", // dummy
        exercise_id: "squats", // This is the issue. The app uses strings like "squats", but the DB expects a UUID probably.
        status: 'completed',
        order_index: 0,
        duration_seconds: 60
    };
    
    const { error } = await supabase.from('workout_exercises').insert([errorFromImage]);
    console.log("Raw Postgres Error:", error);
}
run();
