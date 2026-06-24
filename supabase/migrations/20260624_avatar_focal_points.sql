alter table public.users
  add column if not exists avatar_focal_x numeric not null default 50 check (avatar_focal_x between 0 and 100),
  add column if not exists avatar_focal_y numeric not null default 50 check (avatar_focal_y between 0 and 100);

alter table public.families
  add column if not exists avatar_focal_x numeric not null default 50 check (avatar_focal_x between 0 and 100),
  add column if not exists avatar_focal_y numeric not null default 50 check (avatar_focal_y between 0 and 100);

notify pgrst, 'reload schema';
