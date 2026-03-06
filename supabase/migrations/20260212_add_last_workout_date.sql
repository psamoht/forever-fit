-- Add last_workout_date column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_workout_date timestamp with time zone;
