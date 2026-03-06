require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('workouts').select('created_at, end_time, points_earned, status').order('created_at', { ascending: false }).limit(5);
  console.log("Workouts:", data, error);
}
check();
