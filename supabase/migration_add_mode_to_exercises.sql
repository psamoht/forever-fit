
-- Add vital columns to exercises table
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS mode text CHECK (mode IN ('timer', 'reps')) DEFAULT 'reps',
ADD COLUMN IF NOT EXISTS default_reps integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS default_duration integer DEFAULT 60;

-- Update the data with correct defaults
UPDATE exercises SET mode = 'reps', default_reps = 10 WHERE name = 'Katze-Kuh';
-- Kindeshaltung is a hold exercise (Timer)
UPDATE exercises SET mode = 'timer', default_duration = 45 WHERE name = 'Kindeshaltung';
-- Rotation is reps
UPDATE exercises SET mode = 'reps', default_reps = 8 WHERE name = 'Brustwirbelsäulen-Rotation';
-- Shoulder circles
UPDATE exercises SET mode = 'reps', default_reps = 15 WHERE name = 'Schulterkreisen im Sitzen';
-- Side bends
UPDATE exercises SET mode = 'reps', default_reps = 10 WHERE name = 'Seitneigen im Stehen';

NOTIFY pgrst, 'reload config';
