import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        // In local development, the anon key is used. Wait, even anon key gets blocked by RLS for GET.
        // If we don't have a service role key, we bypass RLS by running a SQL function. If not, this still might fail.
        // Let's at least try to get the user context if we pass the token from the browser.

        const authHeader = request.headers.get('Authorization') || request.headers.get('cookie');

        const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
            global: {
                headers: {
                    Authorization: authHeader || ''
                }
            }
        });

        const { data, error } = await supabase.from('workouts').select('*');
        return NextResponse.json({ data, error });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
