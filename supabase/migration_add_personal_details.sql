
alter table profiles add column gender text check (gender in ('male', 'female', 'diverse'));
alter table profiles add column weight integer; -- in kg
alter table profiles add column height integer; -- in cm
