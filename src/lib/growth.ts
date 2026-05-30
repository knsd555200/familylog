// ── 성장(티어·뱃지·발자취) 공용 로직 ──────────────────────────────────────────
// 마이페이지·뱃지 페이지·미션 탭·포인트 내역이 공유하는 단일 출처.

// ── 타입 ──────────────────────────────────────────────────────────────────────
export interface BadgeStage { label: string; threshold: number; desc: string }
export interface BadgeDef   { id: string; name: string; emoji: string; stages: BadgeStage[]; stub: boolean }
export interface MeritItem  { id: string; merit_type: string; category: string; raw_value: number | null; points: number; created_at: string; reference_id?: string | null }

/** 뱃지 값·날짜 계산에 필요한 집계 데이터 (PageData·BadgeData가 모두 충족) */
export interface GrowthStats {
  postCount: number;     postFirstDate: string | null
  volunteerSum: number;  volunteerFirstDate: string | null
  donationCount: number; donationFirstDate: string | null
  eventCount: number;    eventFirstDate: string | null
  streakWeeks: number
  // 미션 탭 "오늘의 한 걸음"·"이번 주 리듬" 전용 (fetchGrowthStats만 채움. mypage는 미사용)
  postedToday?: boolean      // 오늘 글을 남겼는지 (posts 기준)
  postedThisWeek?: boolean   // 이번 주(월~) 글을 남겼는지
  weekDays?: boolean[]       // 이번 주 월~일 활동 여부 (merits 기준, 7칸)
  // 미션 탭 "이번 주 미션" 진행도 — 이번 주(월~) 활동 횟수 (merits 기준)
  commentsThisWeek?: number  // 댓글
  eventsThisWeek?: number    // 행사 참여
  volunteerThisWeek?: number // 봉사 기록
  donationThisWeek?: number  // 후원 기록
}

// ── 라벨 ──────────────────────────────────────────────────────────────────────
export const MERIT_LABELS: Record<string, string> = {
  post_created: '글 작성', comment_created: '댓글 작성',
  like_received: '공감 받음', event_joined: '행사 참여',
  volunteer_activity: '봉사 인증', donation: '후원',
}

// ── 티어 ──────────────────────────────────────────────────────────────────────
export const TIER_CONFIG = [
  { label: '🌱 씨앗', threshold: 0 },
  { label: '🌿 새싹', threshold: 500 },
  { label: '🌸 꽃',   threshold: 1500 },
  { label: '🍎 열매', threshold: 3000 },
  { label: '🏮 등대', threshold: 6000 },
] as const

export function getTierProgress(points: number) {
  const idx  = TIER_CONFIG.reduce<number>((b, t, i) => (points >= t.threshold ? i : b), 0)
  const cur  = TIER_CONFIG[idx]
  const next = idx < TIER_CONFIG.length - 1 ? TIER_CONFIG[idx + 1] : null
  if (!next) return { currentLabel: cur.label, nextLabel: null, progress: 100, remaining: 0 }
  const range = next.threshold - cur.threshold
  return {
    currentLabel: cur.label,
    nextLabel:    next.label,
    progress:     Math.min(100, Math.floor(((points - cur.threshold) / range) * 100)),
    remaining:    next.threshold - points,
  }
}

export function getDaysElapsed(iso: string | null) {
  if (!iso) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
}

// ── 뱃지 정의 ─────────────────────────────────────────────────────────────────
export const BADGES: BadgeDef[] = [
  { id: 'writing',   name: '글쓰기',   emoji: '✍️', stub: false,
    stages: [{ label: '첫 마디',    threshold: 1,   desc: '글 1개' },
             { label: '이야기꾼',   threshold: 30,  desc: '글 30개' },
             { label: '스토리텔러', threshold: 100, desc: '글 100개' }] },
  { id: 'volunteer', name: '봉사',     emoji: '🤝', stub: false,
    stages: [{ label: '첫 발걸음',  threshold: 1,   desc: '봉사 1시간' },
             { label: '봉사왕',     threshold: 10,  desc: '10시간' },
             { label: '봉사대왕',   threshold: 100, desc: '100시간' }] },
  { id: 'donation',  name: '후원',     emoji: '💝', stub: false,
    stages: [{ label: '첫 나눔',    threshold: 1,  desc: '후원 1회' },
             { label: '나눔천사',   threshold: 10, desc: '10회' },
             { label: '나눔의신',   threshold: 50, desc: '50회' }] },
  { id: 'event',     name: '행사',     emoji: '🎉', stub: false,
    stages: [{ label: '첫 참여',    threshold: 1,  desc: '행사 1회' },
             { label: '행사마니아', threshold: 10, desc: '10회' },
             { label: '행사중독자', threshold: 30, desc: '30회' }] },
  { id: 'streak',    name: '연속활동', emoji: '🔥', stub: false,
    stages: [{ label: '첫 습관',    threshold: 1,  desc: '1주 활동' },
             { label: '성실왕',     threshold: 8,  desc: '8주 연속' },
             { label: '불굴의의지', threshold: 26, desc: '26주 연속' }] },
  { id: 'group',     name: '소그룹',   emoji: '👥', stub: true,
    stages: [{ label: '첫 모임',    threshold: 1, desc: '소그룹 1회' },
             { label: '그룹리더',   threshold: 1, desc: '리드 1회' },
             { label: '그룹마스터', threshold: 5, desc: '리드 5회' }] },
  { id: 'invite',    name: '초대',     emoji: '📨', stub: true,
    stages: [{ label: '첫 초대',    threshold: 1,  desc: '초대 1가정' },
             { label: '씨앗전파자', threshold: 5,  desc: '5가정' },
             { label: '확장의달인', threshold: 20, desc: '20가정' }] },
  { id: 'gratitude', name: '감사',     emoji: '🙏', stub: true,
    stages: [{ label: '첫 감사',   threshold: 1,   desc: '감사 수신 1회' },
             { label: '감사천사',   threshold: 20,  desc: '20회' },
             { label: '감사의신',   threshold: 100, desc: '100회' }] },
  { id: 'challenge', name: '챌린지',   emoji: '⚡', stub: true,
    stages: [{ label: '첫 도전',   threshold: 1,  desc: '챌린지 1회' },
             { label: '챌린저',    threshold: 5,  desc: '5회' },
             { label: '챌린지킹',  threshold: 20, desc: '20회' }] },
]

export function getAchievedStage(value: number, stages: BadgeStage[]) {
  return stages.reduce<number>((b, s, i) => (value >= s.threshold ? i : b), -1)
}

export function getBadgeValue(id: string, d: GrowthStats) {
  switch (id) {
    case 'writing':   return d.postCount
    case 'volunteer': return d.volunteerSum
    case 'donation':  return d.donationCount
    case 'event':     return d.eventCount
    case 'streak':    return d.streakWeeks
    default:          return 0
  }
}

export function getBadgeFirstDate(id: string, d: GrowthStats) {
  switch (id) {
    case 'writing':   return d.postFirstDate
    case 'volunteer': return d.volunteerFirstDate
    case 'donation':  return d.donationFirstDate
    case 'event':     return d.eventFirstDate
    default:          return null
  }
}

// ── 뱃지 시트 서사 텍스트 ──────────────────────────────────────────────────────
export function getStoryText(badge: BadgeDef, value: number, firstDate: string | null, nick: string) {
  const d = fmtDate(firstDate)
  switch (badge.id) {
    case 'writing':   return firstDate ? `${nick}님이 처음 글을 쓴 건 ${d}이었어요.\n그날부터 오늘까지 ${value}편의 이야기를 남겼어요.`                          : `${nick}님은 ${value}편의 글을 남겼어요.`
    case 'volunteer': return firstDate ? `${nick}님이 처음 봉사에 나선 건 ${d}이었어요.\n그날부터 오늘까지 ${Math.floor(value)}시간 지역사회를 빛냈어요.`         : `${nick}님은 ${Math.floor(value)}시간 봉사했어요.`
    case 'donation':  return firstDate ? `${nick}님이 처음 나눔을 실천한 건 ${d}이었어요.\n그날부터 오늘까지 ${value}번 따뜻한 마음을 전했어요.`                 : `${nick}님은 ${value}번 후원했어요.`
    case 'event':     return firstDate ? `${nick}님이 처음 행사에 참여한 건 ${d}이었어요.\n그날부터 오늘까지 ${value}번의 자리를 함께했어요.`                    : `${nick}님은 ${value}번의 행사를 함께했어요.`
    case 'streak':    return `${nick}님은 ${value}주 연속으로 패밀로그에서 활동하고 있어요.`
    default:          return ''
  }
}

// ── 넛지 (가장 가까운 미달성 단계) ─────────────────────────────────────────────
export interface NudgeInfo {
  badge: BadgeDef; nextStage: BadgeStage; gap: number
  achievedStage: number; value: number; firstDate: string | null
}

export function getNudgeBadge(data: GrowthStats): NudgeInfo | null {
  let best: NudgeInfo | null = null
  for (const badge of BADGES) {
    if (badge.stub) continue
    const value       = getBadgeValue(badge.id, data)
    const achievedIdx = getAchievedStage(value, badge.stages)
    const nextIdx     = achievedIdx + 1
    if (nextIdx >= badge.stages.length) continue
    const nextStage = badge.stages[nextIdx]
    const gap       = nextStage.threshold - value
    if (!best || gap < best.gap) {
      best = { badge, nextStage, gap, achievedStage: achievedIdx, value, firstDate: getBadgeFirstDate(badge.id, data) }
    }
  }
  return best
}

export function getNudgeText(id: string, stageName: string, rawGap: number): string {
  const n = id === 'volunteer' ? Math.ceil(rawGap) : rawGap
  switch (id) {
    case 'writing':
      return n === 1 ? `${stageName}까지 글 1개만 더 작성하면 돼요` : `${stageName}까지 글 ${n}개 더 작성하면 돼요`
    case 'volunteer':
      return n <= 1 ? `${stageName}까지 봉사활동에 한 번만 참여해봐요` : `${stageName}까지 ${n}시간 더 봉사하면 돼요`
    case 'donation':
      return n === 1 ? `${stageName}까지 한 번만 더 후원해봐요` : `${stageName}까지 ${n}번 더 후원하면 돼요`
    case 'event':
      return n === 1 ? `${stageName}까지 행사에 한 번만 더 참여해봐요` : `${stageName}까지 ${n}번 더 참여하면 돼요`
    case 'streak':
      return n === 1 ? `${stageName}까지 이번 주만 활동하면 돼요` : `${stageName}까지 ${n}주 더 활동하면 돼요`
    default:
      return `${stageName}에 도전해봐요`
  }
}

// ── 연속활동 주차 계산 ─────────────────────────────────────────────────────────
export function mondayOf(date: Date) {
  const d = new Date(date); const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); d.setHours(0, 0, 0, 0)
  return d.getTime()
}
export function calcStreakWeeks(dates: string[]) {
  if (!dates.length) return 0
  const sorted = Array.from(new Set(dates.map(s => mondayOf(new Date(s))))).sort((a, b) => b - a)
  let streak = 1; const W = 7 * 86400000
  for (let i = 1; i < sorted.length; i++) { if (sorted[i - 1] - sorted[i] === W) streak++; else break }
  return streak
}

// ── 이번 주 리듬 (월~일 활동 점) ────────────────────────────────────────────────
// 미션 탭 "이번 주 리듬" 7칸 도트. merits(글·댓글·공감·행사 등 모든 활동) 기준.
export interface WeekRhythm { days: boolean[]; activeCount: number; todayIdx: number }
export function getWeekRhythm(meritDates: string[]): WeekRhythm {
  const now = new Date()
  const weekStart = mondayOf(now)
  const days = [false, false, false, false, false, false, false]
  for (const iso of meritDates) {
    const ms = new Date(iso).getTime()
    if (ms >= weekStart && ms < weekStart + 7 * 86400000) {
      const dow = new Date(iso).getDay()
      days[dow === 0 ? 6 : dow - 1] = true
    }
  }
  const todayDow = now.getDay()
  return { days, activeCount: days.filter(Boolean).length, todayIdx: todayDow === 0 ? 6 : todayDow - 1 }
}

// ── "오늘의 한 걸음" 추천 엔진 ──────────────────────────────────────────────────
// 미션 탭의 히어로. 리스트가 아니라 매일 단 하나의 제안.
// 우선순위: 오늘 이미 기록함(완료) → 이번 주 첫 기록 → 주 후반 리듬 잇기 → 날짜 기반 회전.
// 회전 풀은 day-of-year 시드로 하루 동안 고정. 생애주기(life_stage)별 문장 가미.
export interface TodayStep {
  emoji: string
  headline: string   // 초대 문구
  cta: string        // 버튼 라벨
  href: string       // 탭 시 이동
  done?: boolean     // 오늘 몫을 끝낸 완료 상태
}

export interface TodayStepContext {
  postedToday: boolean
  postedThisWeek: boolean
  weekActiveToday: boolean
  lifeStage?: string | null
}

interface Prompt { emoji: string; headline: string; cta: string; category: string }

const BASE_PROMPTS: Prompt[] = [
  { emoji: '🙏', headline: '오늘 가족에게 고마웠던 순간, 한 줄로 남겨볼까요?', cta: '감사 한 줄 남기기', category: 'daily' },
  { emoji: '📷', headline: '오늘 우리 가족의 한 장면을 사진으로 남겨볼까요?', cta: '오늘의 사진 올리기', category: 'daily' },
  { emoji: '🍚', headline: '오늘 함께한 식탁엔 무엇이 올랐나요?',           cta: '오늘의 기록 남기기', category: 'daily' },
  { emoji: '✨', headline: '오늘 가족에게서 발견한 예쁜 점은 무엇인가요?',    cta: '한 줄로 남기기',   category: 'daily' },
  { emoji: '🌱', headline: '오늘 우리 가족이 실천한 작은 일이 있나요?',      cta: '실천 기록하기',   category: 'daily' },
  { emoji: '💬', headline: '요즘 마음에 걸리는 고민, 가족들과 나눠볼까요?',    cta: '고민 나누기',     category: 'concern' },
]

const STAGE_PROMPTS: Record<string, Prompt[]> = {
  pre_married: [{ emoji: '💍', headline: '언젠가 꾸릴 가정을 그려본다면, 오늘 어떤 한 줄을 남기고 싶나요?', cta: '오늘의 기록 남기기', category: 'daily' }],
  newlywed:    [{ emoji: '🏡', headline: '둘이 함께 만든 오늘의 신혼 풍경을 남겨볼까요?',                  cta: '오늘의 기록 남기기', category: 'daily' }],
  parenting:   [{ emoji: '🧸', headline: '오늘 아이와 함께한 순간을 한 줄로 붙잡아둘까요?',               cta: '오늘의 기록 남기기', category: 'daily' }],
  empty_nest:  [{ emoji: '🍵', headline: '오늘 두 분이 함께한 여유로운 시간을 남겨볼까요?',               cta: '오늘의 기록 남기기', category: 'daily' }],
}

export function getTodayStep(ctx: TodayStepContext): TodayStep {
  const writeHref = (category: string) => `/community/write?category=${category}`

  // 오늘 이미 한 걸음을 뗌 — 완료 상태 (강박 없이 작게)
  if (ctx.postedToday) {
    return { emoji: '🌱', headline: '오늘의 한 걸음을 뗐어요. 그걸로 충분해요.', cta: '오늘의 피드 둘러보기', href: '/community', done: true }
  }

  // 이번 주 첫 기록
  if (!ctx.postedThisWeek) {
    return { emoji: '🌿', headline: '이번 주, 첫 이야기를 남겨볼까요?', cta: '첫 이야기 쓰기', href: writeHref('daily') }
  }

  // 주 후반(금·토·일)인데 오늘 아직 활동 없음 — 흐름 잇기
  const dow = new Date().getDay()
  if ((dow === 0 || dow === 5 || dow === 6) && !ctx.weekActiveToday) {
    return { emoji: '🔥', headline: '이번 주의 흐름, 오늘 한 줄로 이어볼까요?', cta: '이어 쓰기', href: writeHref('daily') }
  }

  // 기본 — 날짜 기반 회전 (하루 동안 고정)
  const stagePool = ctx.lifeStage && STAGE_PROMPTS[ctx.lifeStage] ? STAGE_PROMPTS[ctx.lifeStage] : []
  const pool = [...BASE_PROMPTS, ...stagePool]
  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const pick = pool[dayOfYear % pool.length]
  return { emoji: pick.emoji, headline: pick.headline, cta: pick.cta, href: writeHref(pick.category) }
}

// ── "이번 주 미션" 엔진 ─────────────────────────────────────────────────────────
// 미션 탭의 행동 목록. 별도 DB 없이 fetchGrowthStats의 주간 집계에서 완료 여부를 파생.
// 각 미션은 탭하면 행동 화면으로 이동(link)하거나 기록 시트를 연다(sheet).
export interface WeeklyMission {
  id: string
  emoji: string
  title: string
  hint?: string                 // 부연 한 줄 (선택)
  cta: string                   // 버튼 동사 문구
  reward: string                // 보상 표기 ("+10P" 등)
  value: number                 // 현재 진행값
  target: number                // 목표값 (1이면 단순 완료형)
  done: boolean
  action:
    | { type: 'link'; href: string }
    | { type: 'sheet'; sheet: 'volunteer' | 'donation' }
}

export function getWeeklyMissions(s: GrowthStats): WeeklyMission[] {
  const activeCnt = (s.weekDays ?? []).filter(Boolean).length
  const comments  = s.commentsThisWeek  ?? 0
  const events    = s.eventsThisWeek    ?? 0
  const vols      = s.volunteerThisWeek ?? 0
  const dons      = s.donationThisWeek  ?? 0

  return [
    {
      id: 'write', emoji: '🌿', title: '이번 주 이야기 한 편 남기기',
      cta: '이야기 남기기', reward: '+10P 적립',
      value: s.postedThisWeek ? 1 : 0, target: 1, done: !!s.postedThisWeek,
      action: { type: 'link', href: '/community/write?category=daily' },
    },
    {
      id: 'comment', emoji: '💬', title: '이웃 가정 글에 댓글로 응원하기',
      cta: '피드 보러 가기', reward: '+5P 적립',
      value: Math.min(comments, 1), target: 1, done: comments >= 1,
      action: { type: 'link', href: '/community' },
    },
    {
      id: 'rhythm', emoji: '📅', title: '한 주에 3일 이상 들르기',
      cta: '오늘 활동하러 가기', reward: '🔥 연속 리듬',
      hint: '꾸준함이 가장 큰 한 걸음이에요',
      value: activeCnt, target: 3, done: activeCnt >= 3,
      action: { type: 'link', href: '/community' },
    },
    {
      id: 'event', emoji: '🎉', title: '가족 행사 한 번 함께하기',
      cta: '행사 둘러보기', reward: '행사별 보상',
      value: events >= 1 ? 1 : 0, target: 1, done: events >= 1,
      action: { type: 'link', href: '/events' },
    },
    {
      id: 'volunteer', emoji: '🤝', title: '봉사한 시간 기록하기',
      cta: '봉사 시간 기록하기', reward: '시간당 +5P',
      value: vols >= 1 ? 1 : 0, target: 1, done: vols >= 1,
      action: { type: 'sheet', sheet: 'volunteer' },
    },
    {
      id: 'donation', emoji: '💝', title: '나눔 한 번 실천하기',
      cta: '후원 기록하기', reward: '+15P 적립',
      value: dons >= 1 ? 1 : 0, target: 1, done: dons >= 1,
      action: { type: 'sheet', sheet: 'donation' },
    },
  ]
}

// ── 날짜 포맷 ─────────────────────────────────────────────────────────────────
export function fmtDate(iso: string | null) {
  if (!iso) return '알 수 없는 날'
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatRelativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000); if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60);       if (h < 24) return `${h}시간 전`
  const day = Math.floor(h / 24);     if (day < 7) return `${day}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

// ── 뱃지·티어·넛지 계산용 집계 fetch ──────────────────────────────────────────
// 뱃지 페이지·미션 탭이 공유. (마이페이지는 글 목록까지 함께 받아 별도 fetch 사용)
export async function fetchGrowthStats(uid: string, token: string): Promise<GrowthStats> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const h    = { apikey: key, Authorization: `Bearer ${token}` }

  const [postsRes, meritsRes] = await Promise.all([
    fetch(`${base}/rest/v1/posts?author_id=eq.${uid}&deleted_at=is.null&select=created_at&order=created_at.asc`, { headers: h, cache: 'no-store' }),
    fetch(`${base}/rest/v1/merits?user_id=eq.${uid}&select=merit_type,category,raw_value,created_at&order=created_at.asc&limit=1000`, { headers: h, cache: 'no-store' }),
  ])

  const postsAsc:  { created_at: string }[] = postsRes.ok  ? await postsRes.json()  : []
  const meritsAsc: MeritItem[]               = meritsRes.ok ? await meritsRes.json() : []

  const vols = meritsAsc.filter(m => m.category   === 'volunteer')
  const dons = meritsAsc.filter(m => m.merit_type === 'donation')
  const evts = meritsAsc.filter(m => m.merit_type === 'event_joined')

  // 미션 탭 전용 파생값
  const now = new Date()
  const weekStart = mondayOf(now)
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const rhythm = getWeekRhythm(meritsAsc.map(m => m.created_at))
  const inWeek = (iso: string) => new Date(iso).getTime() >= weekStart

  return {
    postCount:          postsAsc.length,
    postFirstDate:      postsAsc[0]?.created_at ?? null,
    volunteerSum:       vols.reduce((s, m) => s + (m.raw_value ?? 0), 0),
    volunteerFirstDate: vols[0]?.created_at ?? null,
    donationCount:      dons.length,
    donationFirstDate:  dons[0]?.created_at ?? null,
    eventCount:         evts.length,
    eventFirstDate:     evts[0]?.created_at ?? null,
    streakWeeks:        calcStreakWeeks(meritsAsc.map(m => m.created_at)),
    postedToday:        postsAsc.some(p => new Date(p.created_at).getTime() >= todayStart.getTime()),
    postedThisWeek:     postsAsc.some(p => new Date(p.created_at).getTime() >= weekStart),
    weekDays:           rhythm.days,
    commentsThisWeek:   meritsAsc.filter(m => m.merit_type === 'comment_created' && inWeek(m.created_at)).length,
    eventsThisWeek:     evts.filter(m => inWeek(m.created_at)).length,
    volunteerThisWeek:  vols.filter(m => inWeek(m.created_at)).length,
    donationThisWeek:   dons.filter(m => inWeek(m.created_at)).length,
  }
}

// ── 발자취 이정표(타임라인) 생성 ───────────────────────────────────────────────
export interface Milestone { date: string | null; emoji: string; text: string; href?: string; thumb?: string | null; refId?: string; badgeLabel?: string }
export interface MilestonePost { id: string; created_at: string; thumb: string | null }

/**
 * 의미 있는 사건만 시간순으로 뽑아 "걸어온 길"을 만든다.
 * - 글쓰기 뱃지 날짜는 posts 테이블 작성일이 진실 (post_created 메릿은 일일 한도가 있어 부정확).
 * - 티어 승급일은 메릿 포인트 누적이 각 티어 문턱을 넘는 순간.
 * - 연속활동(streak)은 시점 특정이 모호해 타임라인에서 제외.
 */
// 단계별 서사 — "X 뱃지를 받았어요" 반복을 피하려고 사건마다 다른 문장.
const MILESTONE_TEXT: Record<string, string[]> = {
  writing:   ['첫 이야기를 남겼어요', '이야기 30편을 채워 이야기꾼이 되었어요', '100편의 이야기로 스토리텔러가 되었어요'],
  volunteer: ['처음으로 봉사의 손길을 내밀었어요', '봉사 10시간, 봉사왕에 올랐어요', '봉사 100시간, 봉사대왕이 되었어요'],
  donation:  ['처음으로 나눔을 실천했어요', '나눔 10번, 나눔천사가 되었어요', '나눔 50번, 나눔의신이 되었어요'],
  event:     ['첫 행사에 함께했어요', '행사 10번, 행사마니아가 되었어요', '행사 30번, 행사중독자가 되었어요'],
}
const TIER_TEXT = ['', '새싹 단계로 자라났어요', '꽃 단계로 피어났어요', '열매 단계를 맺었어요', '등대 단계에 올랐어요']

export function buildMilestones(posts: MilestonePost[], meritsAsc: MeritItem[]): Milestone[] {
  const out: Milestone[] = []

  const volsAsc = meritsAsc.filter(m => m.category   === 'volunteer')
  const donsAsc = meritsAsc.filter(m => m.merit_type === 'donation')
  const evtsAsc = meritsAsc.filter(m => m.merit_type === 'event_joined')

  // 봉사/후원 — 목적지가 없어 텍스트만 (적립 흐름 구현 시 데이터 자동 등장)
  const plainDate = (id: string, threshold: number): string | null => {
    if (id === 'donation') return donsAsc[threshold - 1]?.created_at ?? null
    if (id === 'volunteer') {
      let sum = 0
      for (const m of volsAsc) { sum += m.raw_value ?? 0; if (sum >= threshold) return m.created_at }
    }
    return null
  }

  // 뱃지 단계 달성
  for (const badge of BADGES) {
    if (badge.stub || badge.id === 'streak') continue
    badge.stages.forEach((stage, idx) => {
      const text       = MILESTONE_TEXT[badge.id]?.[idx] ?? `'${stage.label}' 뱃지를 받았어요`
      const badgeLabel = idx >= 1 ? stage.label : undefined  // 2단계+만 뱃지 칩 표시
      if (badge.id === 'writing') {
        // 이야기 — 해당 게시물로 직접 연결 + 썸네일
        const p = posts[stage.threshold - 1]
        if (p) out.push({ date: p.created_at, emoji: badge.emoji, text, href: `/community/${p.id}`, thumb: p.thumb, badgeLabel })
      } else if (badge.id === 'event') {
        // 행사 — 참여한 행사 상세로 연결 (썸네일은 호출부에서 보강)
        const m = evtsAsc[stage.threshold - 1]
        if (m) out.push({ date: m.created_at, emoji: badge.emoji, text, href: m.reference_id ? `/events/${m.reference_id}` : undefined, refId: m.reference_id ?? undefined, badgeLabel })
      } else {
        const date = plainDate(badge.id, stage.threshold)
        if (date) out.push({ date, emoji: badge.emoji, text, badgeLabel })
      }
    })
  }

  // 티어 승급 (누적 포인트 기준)
  let cum = 0
  const hit = new Set<number>()
  for (const m of meritsAsc) {
    cum += m.points ?? 0
    TIER_CONFIG.forEach((t, i) => {
      if (i === 0 || hit.has(i) || cum < t.threshold) return
      hit.add(i)
      out.push({ date: m.created_at, emoji: t.label.split(' ')[0], text: TIER_TEXT[i] ?? `${t.label.split(' ')[1] ?? t.label} 단계가 되었어요` })
    })
  }

  return out.sort((a, b) => +new Date(a.date ?? 0) - +new Date(b.date ?? 0))
}

// ── 앞으로 남을 발자국(예고) ───────────────────────────────────────────────────
// 더미가 아니라 "이곳에 무엇이 기록되는지" 안내. 아직 안 한 것만 서사 톤으로.
// 숫자·gap은 쓰지 않는다(그건 미션 탭 "다음 목표"의 몫).
// stub=true: 아직 서비스 준비 중인 기능 — 같은 비활성 스타일에 "준비중" 태그 추가.
export interface UpcomingStep { emoji: string; text: string; stub?: boolean }

export function buildUpcoming(stats: GrowthStats, points: number, days: number): UpcomingStep[] {
  const steps: { hide: boolean; emoji: string; text: string; stub?: boolean }[] = [
    // ── 이야기 (writing) ──────────────────────────────────────────────────
    { hide: stats.postCount >= 1,   emoji: '✍️', text: '첫 이야기를 남기면 이 길에 발자국이 찍혀요' },
    { hide: stats.postCount >= 30,  emoji: '📖', text: '이야기 30편을 채우면 이야기꾼으로 자라나요' },
    { hide: stats.postCount >= 100, emoji: '📚', text: '이야기 100편을 채우면 스토리텔러가 되어요' },
    // ── 행사 (event) ──────────────────────────────────────────────────────
    { hide: stats.eventCount >= 1,  emoji: '🎉', text: '행사에 함께한 날도 이곳에 기록돼요' },
    { hide: stats.eventCount >= 10, emoji: '🎊', text: '행사 10번을 함께하면 행사마니아가 돼요' },
    { hide: stats.eventCount >= 30, emoji: '🏟️', text: '행사 30번을 함께하면 행사중독자가 되어요' },
    // ── 봉사 (volunteer) ──────────────────────────────────────────────────
    { hide: stats.volunteerSum >= 1,   emoji: '🤝', text: '봉사의 손길을 내밀면 따뜻한 흔적이 남아요' },
    { hide: stats.volunteerSum >= 10,  emoji: '🌟', text: '봉사 10시간을 채우면 봉사왕이 돼요' },
    { hide: stats.volunteerSum >= 100, emoji: '🏆', text: '봉사 100시간을 채우면 봉사대왕이 되어요' },
    // ── 후원 (donation) ───────────────────────────────────────────────────
    { hide: stats.donationCount >= 1,  emoji: '💝', text: '나눔을 실천한 마음도 발자국이 돼요' },
    { hide: stats.donationCount >= 10, emoji: '💖', text: '나눔 10번을 채우면 나눔천사가 돼요' },
    { hide: stats.donationCount >= 50, emoji: '✨', text: '나눔 50번을 채우면 나눔의신이 되어요' },
    // ── 연속활동 (streak) ─────────────────────────────────────────────────
    { hide: stats.streakWeeks >= 1,  emoji: '🔥', text: '매주 꾸준히 활동하면 연속활동 발자국이 생겨요' },
    { hide: stats.streakWeeks >= 8,  emoji: '💪', text: '8주 연속 활동하면 성실왕이 돼요' },
    { hide: stats.streakWeeks >= 26, emoji: '🏅', text: '26주를 이어가면 불굴의의지가 되어요' },
    // ── 티어 승급 ─────────────────────────────────────────────────────────
    { hide: points >= 500,  emoji: '🌿', text: '활동이 무르익으면 새싹 단계로 올라서요' },
    { hide: points >= 1500, emoji: '🌸', text: '1500P를 쌓으면 꽃 단계로 피어나요' },
    { hide: points >= 3000, emoji: '🍎', text: '3000P를 쌓으면 열매 단계를 맺어요' },
    { hide: points >= 6000, emoji: '🏮', text: '6000P를 쌓으면 등대 단계에 올라서요' },
    // ── 특별 이정표 ───────────────────────────────────────────────────────
    { hide: days >= 100, emoji: '🗓️', text: '패밀로그와 100일을 함께하면 특별한 자리가 생겨요' },
    // ── 준비 중인 기능 (stub) ─────────────────────────────────────────────
    { hide: false, emoji: '👥', text: '소그룹에 함께하면 이곳에도 발자국이 생겨요',   stub: true },
    { hide: false, emoji: '📨', text: '가족을 초대하면 새로운 발자국이 시작돼요',     stub: true },
    { hide: false, emoji: '🙏', text: '감사를 나누면 따뜻한 발자국이 새겨져요',      stub: true },
    { hide: false, emoji: '⚡', text: '챌린지에 도전하면 용감한 발자국이 찍혀요',    stub: true },
  ]
  return steps.filter(s => !s.hide).map(({ emoji, text, stub }) => ({ emoji, text, stub }))
}
