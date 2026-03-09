const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Extract config from the source code
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseAnonKey = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectTable() {
    console.log("Inspecting 'workouts' table columns...");
    // Try to insert an empty object to see what required columns are missing and what columns exist
    const { data, error } = await supabase.from('workouts').insert({}).select('*');
    if (error) {
        console.error("Error inserting (as expected):", error);
        // Sometimes the error message contains the list of columns or hints
    }

    // Better way: query rpc or just a dummy select
    const { data: selectData, error: selectError } = await supabase.from('workouts').select('*').limit(1);
    if (selectData && selectData.length > 0) {
        console.log("Existing record columns:", Object.keys(selectData[0]));
    } else {
        console.log("No records found, or error:", selectError);
    }
}

inspectTable();
