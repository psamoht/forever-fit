-- 1. Identify and remove duplicates, keeping the oldest entry (lowest ID or created_at)
delete from weekly_schedules a using weekly_schedules b
where a.user_id = b.user_id 
  and a.day_of_week = b.day_of_week 
  and a.created_at > b.created_at;

-- 2. Add a unique constraint to prevent future duplicates
alter table weekly_schedules 
add constraint unique_user_day_schedule unique (user_id, day_of_week);
