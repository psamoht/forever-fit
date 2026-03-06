import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    const { data: workouts, error: wError } = await supabase.from('workouts').select('*').order('end_time', { ascending: false }).limit(10);
    return NextResponse.json({ workouts, wError });
}
