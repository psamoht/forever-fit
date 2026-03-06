
-- Table to store weekly schedules
CREATE TABLE weekly_schedules (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) NOT NULL,
    day_of_week text NOT NULL, -- 'Monday', 'Tuesday', etc.
    activity_title text NOT NULL,
    activity_type text, -- 'workout', 'rest', 'active_recovery'
    is_completed boolean DEFAULT false,
    created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, day_of_week)
);

-- RLS
ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedule" ON weekly_schedules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedule" ON weekly_schedules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule" ON weekly_schedules
    FOR UPDATE USING (auth.uid() = user_id);
