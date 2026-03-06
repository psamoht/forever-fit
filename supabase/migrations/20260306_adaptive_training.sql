-- ============================================================
-- Migration: Adaptive Training System
-- Adds training_state to profiles, theme tracking to workouts,
-- and actual performance data to workout_exercises.
-- ============================================================

-- 1. Training State on Profiles (the "Trainingsakte")
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS training_state JSONB DEFAULT '{
  "fitness_score": 100,
  "progression_factor": 1.0,
  "recovery_status": "ready",
  "days_since_last_workout": 0,
  "consecutive_misses": 0,
  "weekly_volume": {
    "upper_body": 0,
    "lower_body": 0,
    "core": 0,
    "flexibility": 0,
    "cardio": 0
  },
  "recent_workouts": [],
  "avg_rpe_last_5": 5.0,
  "preferred_difficulty": "medium"
}'::jsonb;

-- 2. Theme tracking on workouts (remember WHAT was trained)
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS intensity_data JSONB;

-- 3. Actual performance tracking on workout_exercises
ALTER TABLE workout_exercises 
  ADD COLUMN IF NOT EXISTS actual_reps INTEGER,
  ADD COLUMN IF NOT EXISTS actual_sets INTEGER,
  ADD COLUMN IF NOT EXISTS variant_used TEXT CHECK (variant_used IN ('easier', 'standard', 'harder'));

-- 4. Intensity level on exercises for better AI categorization
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS intensity_level INTEGER DEFAULT 5;
