import { supabase } from '@/lib/supabase'

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

/** posts 테이블에서 post_type='event'인 행사 글 */
export interface EventPost {
  id: string
  author_id: string | null
  title: string | null
  content: string | null
  thumbnail_url: string | null
  visibility: string
  post_type: string
  category: string | null
  like_count: number
  created_at: string
  updated_at: string
  // 행사 전용 컬럼
  event_start_at: string | null
  event_end_at: string | null
  event_location: string | null
  event_max_participants: number | null
  event_merit_reward: number
  event_is_closed: boolean
  // 작성자 프로필 (join)
  author_nickname: string | null
  author_avatar_url: string | null
  author_avatar_focal_x?: number | null
  author_avatar_focal_y?: number | null
}

/** likes 테이블 기반 행사 참여 신청 레코드 */
export interface EventJoin {
  id: string
  user_id: string
  target_id: string   // posts.id (행사 글)
  target_type: string // 'event_join'
  created_at: string
}

// ─── 내부 유틸 ────────────────────────────────────────────────────────────────

/** DB raw row를 EventPost로 변환한다 */
function rowToEventPost(p: any): EventPost {
  return {
    id:                     p.id,
    author_id:              p.author_id ?? null,
    title:                  p.title ?? null,
    content:                p.content ?? null,
    thumbnail_url:          p.thumbnail_url ?? null,
    visibility:             p.visibility,
    post_type:              p.post_type,
    category:               p.category ?? null,
    like_count:             p.like_count ?? 0,
    created_at:             p.created_at,
    updated_at:             p.updated_at,
    event_start_at:         p.event_start_at ?? null,
    event_end_at:           p.event_end_at ?? null,
    event_location:         p.event_location ?? null,
    event_max_participants: p.event_max_participants ?? null,
    event_merit_reward:     p.event_merit_reward ?? 0,
    event_is_closed:        p.event_is_closed ?? false,
    author_nickname:        p.users?.nickname ?? null,
    author_avatar_url:      p.users?.avatar_url ?? null,
    author_avatar_focal_x:  p.users?.avatar_focal_x ?? 50,
    author_avatar_focal_y:  p.users?.avatar_focal_y ?? 50,
  }
}

// ─── 행사 글 목록 조회 ────────────────────────────────────────────────────────

/**
 * post_type='event'이고 visibility='public'인 행사 글을 최신순으로 조회한다.
 * current_participants는 현재 미포함 (추후 likes 집계로 추가 예정).
 */
export async function getEventPosts(): Promise<EventPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, users(nickname, avatar_url, avatar_focal_x, avatar_focal_y)')
    .eq('post_type', 'event')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getEventPosts] 조회 실패:', error.message)
    return []
  }

  return (data ?? []).map(rowToEventPost)
}

// ─── 관리용 행사 목록 조회 ────────────────────────────────────────────────────

/**
 * 행사 관리 페이지용 조회.
 * - isAdmin=true(수퍼관리자): 전체 행사
 * - isAdmin=false(행사관리자): authorId 본인이 올린 행사만
 * visibility 무관(비공개 포함), 마감된 행사도 포함해 최신순 반환.
 */
export async function getManagedEventPosts(
  authorId: string,
  isAdmin: boolean,
): Promise<EventPost[]> {
  let query = supabase
    .from('posts')
    .select('*, users(nickname, avatar_url, avatar_focal_x, avatar_focal_y)')
    .eq('post_type', 'event')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 수퍼관리자가 아니면 본인이 올린 행사로 제한
  if (!isAdmin) query = query.eq('author_id', authorId)

  const { data, error } = await query

  if (error) {
    console.error('[getManagedEventPosts] 조회 실패:', error.message)
    return []
  }

  return (data ?? []).map(rowToEventPost)
}

// ─── 단일 행사 글 조회 ────────────────────────────────────────────────────────

/**
 * id로 행사 글 한 건을 조회한다.
 * 삭제된 글이거나 존재하지 않으면 null 반환.
 */
export async function getEventPostById(id: string): Promise<EventPost | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, users(nickname, avatar_url, avatar_focal_x, avatar_focal_y)')
    .eq('id', id)
    .eq('post_type', 'event')
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    console.error('[getEventPostById] 조회 실패:', error.message)
    return null
  }

  if (!data) return null

  return rowToEventPost(data)
}

// ─── 행사 참여 신청 ───────────────────────────────────────────────────────────

/**
 * 행사 글에 참여 신청한다.
 * - likes 테이블에 target_type='event_join'으로 INSERT
 * - 이미 신청한 경우 중복 INSERT 없이 false 반환
 * - 신청 성공 시 addMerit() 호출 (meritType: 'event_joined', category: 'events')
 */
export async function joinEvent(
  postId: string,
  userId: string,
): Promise<boolean> {
  try {
    // 중복 신청 여부 확인
    const { data: existing, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_type', 'event_join')
      .eq('target_id', postId)
      .maybeSingle()

    if (checkError) {
      console.error('[joinEvent] 중복 확인 실패:', checkError.message)
      return false
    }

    if (existing) {
      // 이미 신청한 행사 — 스킵
      console.log(`[joinEvent] 스킵 — 이미 신청한 행사 (postId: ${postId}, userId: ${userId})`)
      return false
    }

    // likes 테이블에 행사 참여 신청 기록 INSERT
    const { error: insertError } = await supabase
      .from('likes')
      .insert({
        user_id:     userId,
        target_type: 'event_join',
        target_id:   postId,
      })

    if (insertError) {
      console.error('[joinEvent] 신청 INSERT 실패:', insertError.message)
      return false
    }

    return true
  } catch (err) {
    console.error('[joinEvent] 예상치 못한 에러:', err)
    return false
  }
}

// ─── 내 행사 신청 목록 조회 ───────────────────────────────────────────────────

/**
 * 특정 유저가 신청한 행사 목록을 최신순으로 조회한다.
 * likes 테이블에서 target_type='event_join'인 행을 찾아,
 * 연결된 행사 글(posts) 정보를 함께 반환한다.
 */
export async function getMyEventJoins(userId: string): Promise<EventPost[]> {
  // 내가 신청한 행사 글의 id 목록 조회
  const { data: joins, error: joinsError } = await supabase
    .from('likes')
    .select('target_id, created_at')
    .eq('user_id', userId)
    .eq('target_type', 'event_join')
    .order('created_at', { ascending: false })

  if (joinsError) {
    console.error('[getMyEventJoins] 신청 목록 조회 실패:', joinsError.message)
    return []
  }

  if (!joins || joins.length === 0) return []

  const postIds = joins.map((j) => j.target_id)

  // 신청한 행사 글 상세 조회
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*, users(nickname, avatar_url, avatar_focal_x, avatar_focal_y)')
    .in('id', postIds)
    .eq('post_type', 'event')
    .is('deleted_at', null)

  if (postsError) {
    console.error('[getMyEventJoins] 행사 글 조회 실패:', postsError.message)
    return []
  }

  // 신청 순서(joins 기준)를 유지하도록 정렬
  const postMap: Record<string, any> = {}
  for (const p of posts ?? []) {
    postMap[p.id] = p
  }

  return postIds
    .filter((id) => postMap[id])
    .map((id) => rowToEventPost(postMap[id]))
}
