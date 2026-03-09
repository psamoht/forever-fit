const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Extract config from the source code
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseAnonKey = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectProfile() {
    console.log("Fetching Peter's profile...");
    // Since we don't have a session, we can't use auth.uid().
    // We'll try to find a profile with a recent last_workout_date or just list some profiles if possible.
    const { data: profiles, error } = await supabase.from('profiles').select('*').limit(5);
    if (error) {
        console.error("Error fetching profiles:", error);
    } else {
        console.log("Profiles found:", profiles.map(p => ({
            id: p.id,
            display_name: p.display_name,
            points: p.points,
            last_workout_date: p.last_workout_date
        })));
    }
}

inspectProfile();
