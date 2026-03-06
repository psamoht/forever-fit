-- Migration to add Scientific Scoring and RPE to workouts

-- Add RPE (Rate of Perceived Exertion) on a scale of 1-10
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS rpe_score integer CHECK (rpe_score >= 1 AND rpe_score <= 10);

-- Add granular points by muscle group
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS upper_body_points integer DEFAULT 0;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS lower_body_points integer DEFAULT 0;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS core_points integer DEFAULT 0;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS flexibility_points integer DEFAULT 0;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS cardio_points integer DEFAULT 0;

-- Ensure total points is updated if needed or we just rely on points_earned for now
-- Let's make sure it's clear what points_earned is vs these new granular fields.
-- We can add a target_score column to indicate what Coach Theo requested
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS target_score integer DEFAULT 0;
