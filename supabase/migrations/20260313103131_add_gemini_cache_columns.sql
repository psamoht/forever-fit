-- Add columns for Gemini Context Caching
ALTER TABLE profiles
ADD COLUMN gemini_cache_name TEXT,
ADD COLUMN gemini_cache_expires_at TIMESTAMPTZ;
