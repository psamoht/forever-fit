const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Extract config from the source code
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseAnonKey = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAdminLogs() {
    console.log("Checking admin_logs for errors...");
    const { data: logs, error } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(10);
    if (error) {
        console.error("Error fetching logs:", error);
    } else {
        console.log("Recent logs:", JSON.stringify(logs, null, 2));
    }
}

checkAdminLogs();
