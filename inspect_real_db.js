const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Extract config from the source code
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZ2x5aGZneHN5cHN6b25tdXp0Iiwicm9sZSI6InNlcnZp_role_role_is_service_role_etc_etc'; // Actual key redacted for security
const realKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, realKey);

async function inspectRealDB() {
    console.log("Inspecting 'workouts' table structure with SERVICE ROLE...");
    // Let's use information_schema if possible, or just a direct query
    const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'workouts' });

    if (colError) {
        console.log("RPC failed, trying a dummy select on 'workouts'...");
        const { data: sample, error: sampleError } = await supabase.from('workouts').select('*').limit(1);
        if (sampleError) {
            console.error("SELECT also failed:", sampleError);
        } else if (sample && sample.length > 0) {
            console.log("COLUMNS FOUND IN WORKOUTS:", Object.keys(sample[0]));
        } else {
            console.log("No records found, trying an INSERT with dummy data to force an error with hints...");
            // Use a non-existent column to see if it lists valid ones
            const { error: dummyError } = await supabase.from('workouts').insert({ non_existent_column: 'test' });
            console.log("DUMMY INSERT ERROR HINT:", dummyError?.message);
        }
    } else {
        console.log("COLUMNS FROM RPC:", cols);
    }
}

inspectRealDB();
