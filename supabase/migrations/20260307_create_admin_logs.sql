-- Create table for tracking AI API usage costs
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    feature TEXT NOT NULL, -- e.g., 'generate-workout', 'chat', 'summary'
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for api_usage_logs
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all, users can insert their own (maybe via service role though)
CREATE POLICY "Enable insert for authenticated users" ON public.api_usage_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable read for admins" ON public.api_usage_logs FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Create table for tracking user abstract activities (Metadaten-Tracking)
CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- e.g., 'app_open', 'workout_start', 'profile_update', 'chat_interaction'
    description TEXT, -- e.g., 'Started Workout: Upper Body', 'Updated Medical Conditions via Chat'
    metadata JSONB, -- Optional extra data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for user_activities
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Admins can view all, users can insert their own
CREATE POLICY "Enable insert for authenticated users" ON public.user_activities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable read for admins" ON public.user_activities FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Ensure profiles table has a role column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create table for caching the daily admin summaries
CREATE TABLE IF NOT EXISTS public.daily_admin_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    summary_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for daily_admin_summaries
ALTER TABLE public.daily_admin_summaries ENABLE ROW LEVEL SECURITY;

-- Only admins can read/insert
CREATE POLICY "Enable all for admins" ON public.daily_admin_summaries FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
