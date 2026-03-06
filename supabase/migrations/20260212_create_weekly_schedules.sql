-- Create weekly_schedules table
create table if not exists weekly_schedules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  day_of_week text not null, -- "Montag", "Dienstag", etc.
  activity_title text not null,
  activity_type text not null, -- "workout", "active_recovery", "rest"
  theme text default 'mobility', -- "mobility", "strength", "cardio", "recovery", "rest"
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table weekly_schedules enable row level security;

create policy "Users can view their own schedule"
  on weekly_schedules for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own schedule"
  on weekly_schedules for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own schedule"
  on weekly_schedules for update
  using ( auth.uid() = user_id );

-- Optional: Add index for performance
create index weekly_schedules_user_id_idx on weekly_schedules (user_id);
