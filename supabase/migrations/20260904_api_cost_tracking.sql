-- Create table for tracking AI API usage costs with exact categories
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    category TEXT NOT NULL DEFAULT 'Other', -- e.g. 'Activity Image Generation', 'Workout Generation', 'Schedule Generation', 'Coach Theo Chat', 'Coach Audio / TTS'
    feature TEXT NOT NULL,                  -- Detailed feature or prompt identifier
    model_name TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
    cost_eur NUMERIC(10, 6) DEFAULT 0,
    prompt_content TEXT,
    response_content TEXT,
    prompt_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for api_usage_logs
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Allow insert from authenticated users & service role
CREATE POLICY "Enable insert for authenticated users" ON public.api_usage_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable read for all authenticated users" ON public.api_usage_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all for service role" ON public.api_usage_logs FOR ALL TO service_role USING (true);

-- Enable realtime on api_usage_logs table for live Admin updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_usage_logs;
