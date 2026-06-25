-- =====================================================
-- 20260625_consolidate_merit_triggers.sql
-- merits 캐시 트리거 통합 + 전체 캐시 재계산  (v47 ① 덩어리)
-- =====================================================
-- 배경
--   merits에 트리거 2개가 users.merit_* 캐시를 각각 += 하여
--   activity/volunteer/donation/total 이 2배 누적된 상태.
--     · merits_cache_update         → update_merit_cache()
--         users + families 갱신, category='event'(정상), SECURITY DEFINER 없음, tier 없음
--     · trigger_update_user_merits  → update_user_merits_on_insert()
--         users 만 갱신, category='events'(오타 — CHECK는 'event'만 허용 → event 영영 0),
--         SECURITY DEFINER 있음, tier 자동 갱신 있음
--   결과: total/activity/volunteer/donation = 2배, event = 1배, families = 1배.
--   tier 는 시드 단계라 표면화 안 됐지만 2배 기준 산출이므로 정리 대상.
--
-- 조치
--   1) 두 트리거 DROP
--   2) 통합 함수 update_merit_cache_v2() — users+families 캐시 + tier + SECURITY DEFINER,
--      category='event' 단수로 통일
--   3) 단일 트리거 재생성
--   4) users 캐시 전체 재계산 (merits 합계 기준, 없는 유저 → 0)
--   5) families 캐시 전체 재계산 (적립 시점 스냅샷 family_id 기준, 없는 가족 → 0)
--
-- 가족 재계산 기준 = 스냅샷 family_id (트리거의 NEW.family_id 와 동일 의미).
--   ※ 현재 모든 merits 행의 family_id 가 null 로 보여 가족 캐시는 0 유지됨.
--     이는 트리거 버그가 아니라 적립 시점 스냅샷 미기입 문제(출가외인/스냅샷
--     무결성 백로그)로, 이 마이그레이션 범위 밖. 별도 덩어리에서 처리.
-- =====================================================

BEGIN;

-- 1) 기존 트리거 2개 제거
DROP TRIGGER IF EXISTS merits_cache_update        ON merits;
DROP TRIGGER IF EXISTS trigger_update_user_merits ON merits;

-- 2) 통합 함수
CREATE OR REPLACE FUNCTION public.update_merit_cache_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- 개인 캐시 + tier
  UPDATE public.users SET
    merit_total     = merit_total     + NEW.points,
    merit_activity  = merit_activity  + CASE WHEN NEW.category = 'activity'  THEN NEW.points ELSE 0 END,
    merit_volunteer = merit_volunteer + CASE WHEN NEW.category = 'volunteer' THEN NEW.points ELSE 0 END,
    merit_donation  = merit_donation  + CASE WHEN NEW.category = 'donation'  THEN NEW.points ELSE 0 END,
    merit_events    = merit_events    + CASE WHEN NEW.category = 'event'     THEN NEW.points ELSE 0 END,
    tier = CASE
      WHEN merit_total + NEW.points >= 6000 THEN 'beacon'
      WHEN merit_total + NEW.points >= 3000 THEN 'fruit'
      WHEN merit_total + NEW.points >= 1500 THEN 'flower'
      WHEN merit_total + NEW.points >= 500  THEN 'sprout'
      ELSE 'seed'
    END
  WHERE id = NEW.user_id;

  -- 가족 캐시 (적립 시점 스냅샷 family_id 기준 — 기존 trigger 1 동작 유지)
  IF NEW.family_id IS NOT NULL THEN
    UPDATE public.families SET
      merit_total     = merit_total     + NEW.points,
      merit_activity  = merit_activity  + CASE WHEN NEW.category = 'activity'  THEN NEW.points ELSE 0 END,
      merit_volunteer = merit_volunteer + CASE WHEN NEW.category = 'volunteer' THEN NEW.points ELSE 0 END,
      merit_donation  = merit_donation  + CASE WHEN NEW.category = 'donation'  THEN NEW.points ELSE 0 END,
      merit_events    = merit_events    + CASE WHEN NEW.category = 'event'     THEN NEW.points ELSE 0 END
    WHERE id = NEW.family_id;
  END IF;

  RETURN NULL;
END;
$function$;

-- 3) 단일 트리거
CREATE TRIGGER merits_cache_update
AFTER INSERT ON merits
FOR EACH ROW
EXECUTE FUNCTION public.update_merit_cache_v2();

-- 4) users 캐시 전체 재계산 (merits 없는 유저 → 0 리셋)
UPDATE public.users u SET
  merit_total     = s.total,
  merit_activity  = s.activity,
  merit_volunteer = s.volunteer,
  merit_donation  = s.donation,
  merit_events    = s.events,
  tier = CASE
    WHEN s.total >= 6000 THEN 'beacon'
    WHEN s.total >= 3000 THEN 'fruit'
    WHEN s.total >= 1500 THEN 'flower'
    WHEN s.total >= 500  THEN 'sprout'
    ELSE 'seed'
  END
FROM (
  SELECT u2.id AS user_id,
    COALESCE(sum(m.points), 0)                                           AS total,
    COALESCE(sum(CASE WHEN m.category='activity'  THEN m.points END), 0) AS activity,
    COALESCE(sum(CASE WHEN m.category='volunteer' THEN m.points END), 0) AS volunteer,
    COALESCE(sum(CASE WHEN m.category='donation'  THEN m.points END), 0) AS donation,
    COALESCE(sum(CASE WHEN m.category='event'     THEN m.points END), 0) AS events
  FROM public.users u2
  LEFT JOIN public.merits m ON m.user_id = u2.id
  GROUP BY u2.id
) s
WHERE u.id = s.user_id;

-- 5) families 캐시 전체 재계산 (스냅샷 family_id 기준, merits 없는 가족 → 0 리셋)
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

-- 스키마 캐시 재로드
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- 검증 (마이그레이션 후 별도 실행)
-- =====================================================
-- (1) 캐시 = 합계 일치 확인 → 0행이어야 정상 (남남 290→145 보정 확인)
-- SELECT u.id, u.nickname, u.merit_total, COALESCE(s.total,0) AS real,
--        u.merit_total - COALESCE(s.total,0) AS diff
-- FROM users u
-- LEFT JOIN (SELECT user_id, sum(points) total FROM merits GROUP BY user_id) s
--   ON s.user_id = u.id
-- WHERE u.merit_total <> COALESCE(s.total,0);
--
-- (2) 트리거 1회만 적용되는지 — 임의 유저에 테스트 적립 후 +points 정확히 1배 확인
--     (테스트 후 해당 merits 행 + 캐시 원복 또는 재계산 재실행)
-- =====================================================
