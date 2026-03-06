-- Add points_earned to workouts table
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS points_earned integer DEFAULT 0;
