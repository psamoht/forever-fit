-- Add physical scoring columns to the exercises table
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS base_met numeric DEFAULT 3.0;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS muscle_group text DEFAULT 'Cardio';

-- Restrict to known groups using a check (optional, but good for data integrity)
-- ALTER TABLE public.exercises ADD CONSTRAINT valid_muscle_group CHECK (muscle_group IN ('Upper Body', 'Lower Body', 'Core', 'Flexibility/Mobility', 'Cardio'));
