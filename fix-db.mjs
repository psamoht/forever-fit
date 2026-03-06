import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // 1. Get the first user (assuming Peter is the main one testing)
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    if (!profiles || profiles.length === 0) return console.log("No profiles found");
    const userId = profiles[0].id;

    // 2. Insert a simulated Wednesday workout
    const d = new Date();
    d.setDate(d.getDate() - 1); // Yesterday is Wednesday 25th
    d.setHours(14, 0, 0, 0); // 2pm
    
    // We also need to get the user's auth token or use service key.
    // Wait, we can't insert anonymously if RLS is enabled...
    console.log("Found user profile", userId);
}
run();
