import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    const { data: workouts, error: wError } = await supabase.from('workouts').select('*');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    const { data: schedules, error: sError } = await supabase.from('weekly_schedules').select('*');

    return NextResponse.json({ workouts, wError, profiles, pError, schedules, sError });
}
