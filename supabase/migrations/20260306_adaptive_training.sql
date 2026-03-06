-- Add training_state to profiles to track progression, balance, and recovery
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS training_state JSONB DEFAULT '{
  "progression_factor": 1.0,
  "muscle_balance": {
    "upper_body": 0,
    "lower_body": 0,
    "core": 0,
    "flexibility": 0,
    "cardio": 0
  },
  "last_intensity_modifier": 0,
  "recovery_status": "ready"
}'::jsonB;

-- Add intensity_level to exercises to help AI select appropriate progressions
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS intensity_level INTEGER DEFAULT 5;

-- Add RPE (Rate of Perceived Exertion) to workouts if not already present
DO \$\$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='rpe_score') THEN
    ALTER TABLE workouts ADD COLUMN rpe_score INTEGER;
  END IF;
END \$\$;
