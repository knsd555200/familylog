// 피드 정렬 로직 — 최신순(기본) / 인기순(옵션)
//
// 인기순은 "참여도 + 시간 감쇠 + 인증 글 부스트"를 합친 가벼운 점수식.
// 트래픽이 늘면 아래 상수만 조정해 감쇠 강도·부스트를 튜닝하면 된다.

export type SortMode = 'latest' | 'popular'

// 정렬에 필요한 최소 형태만 받는다 (CardPost / FeedPost 등이 구조적으로 만족)
export interface RankablePost {
  likes: number
  comments: number
  category: string      // 이미 한글 라벨로 매핑된 값 — '인증' = 인증 글
  createdAt?: string
}

// ── 튜닝 상수 ───────────────────────────────────────────────
const COMMENT_WEIGHT = 2     // 댓글은 좋아요보다 노력 비용이 커 가중
const VERIFIED_BOOST = 1.5   // 인증 글 부스트 배수
const VERIFIED_LABEL = '인증'
const TIME_OFFSET_HOURS = 12 // 클수록 신선도 영향 완만 (HN 기본 2 → 가족 서비스용 12)
const GRAVITY = 1.3          // 클수록 오래된 글이 빠르게 가라앉음 (HN 기본 1.8)
// ───────────────────────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000

/** 인기 점수 — 높을수록 상단. now는 한 번의 정렬 호출 내내 고정값으로 전달 */
export function popularityScore(post: RankablePost, now: number = Date.now()): number {
  const engagement = post.likes + post.comments * COMMENT_WEIGHT
  const boost = post.category === VERIFIED_LABEL ? VERIFIED_BOOST : 1
  const ageHours = post.createdAt
    ? Math.max(0, (now - new Date(post.createdAt).getTime()) / HOUR_MS)
    : Number.MAX_SAFE_INTEGER // 작성시각 없으면 사실상 맨 아래로
  return (boost * (engagement + 1)) / Math.pow(ageHours + TIME_OFFSET_HOURS, GRAVITY)
}

/** 최신순 비교자 — createdAt 내림차순 */
export function byNewest(a: RankablePost, b: RankablePost): number {
  return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
}

/** 인기순 비교자 생성 — now를 고정해 정렬 중 점수가 흔들리지 않게 */
export function makePopularComparator(now: number = Date.now()) {
  return (a: RankablePost, b: RankablePost): number =>
    popularityScore(b, now) - popularityScore(a, now)
}
