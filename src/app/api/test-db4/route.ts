import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    const { data: schedules, error: sError } = await supabase.from('weekly_schedules').select('*');
    return NextResponse.json({ schedules, sError });
}
