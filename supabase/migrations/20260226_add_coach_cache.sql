-- Add columns to cache the daily Coach Theo summary on the Analyse page
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coach_summary text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coach_summary_date timestamp with time zone;
