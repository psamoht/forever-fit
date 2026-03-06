-- Add gender to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female', 'diverse', 'prefer_not_to_say'));

-- Create exercise-gifs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-gifs', 'exercise-gifs', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for exercise-gifs
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id = 'exercise-gifs');
CREATE POLICY "Auth Insert Access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exercise-gifs' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update Access" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'exercise-gifs' AND auth.role() = 'authenticated');
