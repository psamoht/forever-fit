-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles Table (Connects to Supabase Auth)
create table profiles (
  id uuid references auth.users not null primary key,
  display_name text,
  photo_url text,
  birth_year integer,
  goals text, -- Detailed description of goals
  medical_conditions text, -- Detailed description of limitations
  equipment jsonb default '[]'::jsonb, -- Array of available equipment
  schedule text, -- Preferred training schedule
  gender text check (gender in ('male', 'female', 'diverse')),
  weight integer, -- in kg
  height integer, -- in cm
  streak_current integer default 0,
  streak_longest integer default 0,
  points integer default 0,
  last_workout_date timestamp with time zone,
  level integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Exercises Table
create table exercises (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  difficulty_level text check (difficulty_level in ('easy', 'medium', 'hard')),
  target_muscles text[], -- Array of strings e.g. ['legs', 'core']
  image_url text,
  video_url text,
  is_verified boolean default false, -- For system default exercises
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workouts Table (A session)
create table workouts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  start_time timestamp with time zone default timezone('utc'::text, now()),
  end_time timestamp with time zone,
  status text check (status in ('in_progress', 'completed', 'abandoned')) default 'in_progress',
  feedback_rating integer, -- 1-5 stars
  feedback_difficulty text, -- e.g. "too hard", "too easy"
  feedback_text text
);

-- Workout Exercises Table (Individual exercises in a session)
create table workout_exercises (
  id uuid default uuid_generate_v4() primary key,
  workout_id uuid references workouts(id) not null,
  exercise_id uuid references exercises(id) not null,
  status text check (status in ('pending', 'completed', 'skipped')) default 'pending',
  order_index integer,
  duration_seconds integer
);

-- Chat Logs Table (History between User and AI Coach)
create table chat_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  role text check (role in ('user', 'assistant')) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) Policies
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

alter table exercises enable row level security;
create policy "Exercises are public" on exercises for select using (true);

alter table workouts enable row level security;
create policy "Users can view own workouts" on workouts for select using (auth.uid() = user_id);
create policy "Users can insert own workouts" on workouts for insert with check (auth.uid() = user_id);
create policy "Users can update own workouts" on workouts for update using (auth.uid() = user_id);

alter table workout_exercises enable row level security;
create policy "Users can view own workout exercises" on workout_exercises for select using (
  exists ( select 1 from workouts where workouts.id = workout_exercises.workout_id and workouts.user_id = auth.uid() )
);
create policy "Users can insert own workout exercises" on workout_exercises for insert with check (
  exists ( select 1 from workouts where workouts.id = workout_exercises.workout_id and workouts.user_id = auth.uid() )
);

alter table chat_logs enable row level security;
create policy "Users can view own chat logs" on chat_logs for select using (auth.uid() = user_id);
create policy "Users can insert own chat logs" on chat_logs for insert with check (auth.uid() = user_id);
