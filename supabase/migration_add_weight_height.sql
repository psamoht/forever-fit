
-- Add missing columns to profiles table if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS weight integer,
ADD COLUMN IF NOT EXISTS height integer,
ADD COLUMN IF NOT EXISTS birth_year integer;

-- Reload the schema cache (Supabase specific)
NOTIFY pgrst, 'reload config';
