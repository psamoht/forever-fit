
-- 1. Populate 'exercises' table with initial data
-- We use ON CONFLICT DO NOTHING to avoid duplicates if run multiple times
INSERT INTO exercises (name, description, difficulty_level, target_muscles, video_url, is_verified)
VALUES 
('Katze-Kuh', 'Gehen Sie in den Vierfüßlerstand. Runden Sie beim Ausatmen den Rücken (Katze) und lassen Sie ihn beim Einatmen sanft durchhängen (Kuh).', 'easy', ARRAY['back', 'spine'], '/exercises/cat-cow.png', true),
('Kindeshaltung', 'Setzen Sie sich auf Ihre Fersen, strecken Sie die Arme weit nach vorne und legen Sie die Stirn am Boden ab. Atmen Sie tief in den Rücken.', 'easy', ARRAY['back', 'hips'], '/exercises/childs-pose.png', true),
('Brustwirbelsäulen-Rotation', 'Vierfüßlerstand. Eine Hand an den Hinterkopf legen, Ellbogen zum gegenüberliegenden Arm führen und dann weit nach oben aufdrehen. Pro Seite.', 'medium', ARRAY['upper_back', 'shoulders'], '/exercises/thoracic-rotation.png', true),
('Schulterkreisen im Sitzen', 'Setzen Sie sich aufrecht hin und kreisen Sie die Schultern langsam nach hinten.', 'easy', ARRAY['shoulders', 'neck'], '/exercises/shoulder-circles.png', true),
('Seitneigen im Stehen', 'Stehen Sie aufrecht. Gleiten Sie mit der Hand am Oberschenkel entlang nach unten zur Seite.', 'easy', ARRAY['core', 'spine'], '/exercises/side-bend.png', true);


-- 2. Create 'user_exercise_settings' table
-- This stores the personalized difficulty (reps/time) for each user and exercise
CREATE TABLE IF NOT EXISTS user_exercise_settings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) NOT NULL,
    exercise_id uuid REFERENCES exercises(id) NOT NULL,
    
    -- The current settings for this user
    current_reps integer,       -- e.g. 10
    current_duration integer,   -- e.g. 45 (seconds)
    difficulty_factor float DEFAULT 1.0, -- e.g. 1.0 = normal, 1.2 = harder
    
    last_updated timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(user_id, exercise_id)
);

-- 3. Enable RLS
ALTER TABLE user_exercise_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON user_exercise_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_exercise_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_exercise_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. Reload Schema
NOTIFY pgrst, 'reload config';
