-- Create a table for caching the AI generated text
CREATE TABLE IF NOT EXISTS public.admin_ai_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    summary_text TEXT NOT NULL
);

ALTER TABLE public.admin_ai_summaries ENABLE ROW LEVEL SECURITY;
