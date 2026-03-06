import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function main() {
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, first_name');
    console.log("Profiles:", profiles);

    if (profiles && profiles.length > 0) {
        const peterId = profiles[0].id;
        const { data: schedules } = await supabaseAdmin
            .from('weekly_schedules')
            .select('*')
            .eq('user_id', peterId);

        console.log("Schedules:");
        console.table(schedules);
    }
}

main();
