-- Backfill merits.family_id from each user's current family_id.
-- Safe because the affected account has no family move history.

BEGIN;

UPDATE public.merits m
SET family_id = u.family_id
FROM public.users u
WHERE m.user_id = u.id
  AND m.family_id IS NULL
  AND u.family_id IS NOT NULL;

-- Verification SELECTs to run after applying:
-- SELECT count(*) AS remaining_null_merits
-- FROM public.merits
-- WHERE family_id IS NULL;
--
-- SELECT count(*) AS backfilled_merits
-- FROM public.merits m
-- JOIN public.users u ON u.id = m.user_id
-- WHERE m.family_id = u.family_id
--   AND u.family_id IS NOT NULL;

-- Recalculate families merit cache using snapshot merits.family_id.
UPDATE public.families f SET
  merit_total     = s.total,
  merit_activity  = s.activity,
  merit_volunteer = s.volunteer,
  merit_donation  = s.donation,
  merit_events    = s.events
FROM (
  SELECT f2.id AS family_id,
    COALESCE(sum(m.points), 0)                                           AS total,
    COALESCE(sum(CASE WHEN m.category='activity'  THEN m.points END), 0) AS activity,
    COALESCE(sum(CASE WHEN m.category='volunteer' THEN m.points END), 0) AS volunteer,
    COALESCE(sum(CASE WHEN m.category='donation'  THEN m.points END), 0) AS donation,
    COALESCE(sum(CASE WHEN m.category='event'     THEN m.points END), 0) AS events
  FROM public.families f2
  LEFT JOIN public.merits m ON m.family_id = f2.id
  GROUP BY f2.id
) s
WHERE f.id = s.family_id;

COMMIT;
