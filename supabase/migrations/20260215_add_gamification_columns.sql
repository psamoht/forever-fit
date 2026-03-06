-- Add missing gamification columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS streak_current integer default 0,
ADD COLUMN IF NOT EXISTS points integer default 0;
