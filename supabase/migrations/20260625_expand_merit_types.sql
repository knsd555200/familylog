-- Expand merits.merit_type CHECK to allow revocation and planned comment reward types.
-- Existing app code already writes the revocation types below, but production DB rejected them:
-- - post_deleted
-- - like_removed
-- - comment_deleted
--
-- Also pre-add planned merit types from the product spec:
-- - comment_received
-- - comment_like_received

do $$
declare
  constraint_name text;
begin
  select c.conname
    into constraint_name
  from pg_constraint c
  where c.conrelid = 'public.merits'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%merit_type%'
  order by c.conname
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.merits drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.merits
  add constraint merits_merit_type_check
  check (
    merit_type in (
      'post_created',
      'comment_created',
      'like_received',
      'event_joined',
      'volunteer_activity',
      'volunteer_hours',
      'donation',
      'admin_grant',
      'post_deleted',
      'like_removed',
      'comment_deleted',
      'comment_received',
      'comment_like_received'
    )
  );

notify pgrst, 'reload schema';
