alter table weekly_schedules add column if not exists theme text default 'mobility';

-- Update existing records to have a default theme based on their title (optional check)
update weekly_schedules set theme = 'mobility' where theme is null;
