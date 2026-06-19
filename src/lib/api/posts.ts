import { supabase } from '@/lib/supabase'
import { addMerit } from '@/lib/api/merits'
import { FeedPost } from '@/types/post'
import { CommunityPost } from '@/types/post'

export function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d === 1) return '어제'
  if (d < 7) return `${d}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

// posts.comment_count 대신 comments 테이블 실제 행 수 사용 (중복 집계 방지)
async function fetchCommentCountsByPostId(postIds: string[]): Promise<Record<string, number>> {
  const validIds = postIds.filter(isUUID)
  if (validIds.length === 0) return {}

  const { data, error } = await supabase
    .from('comments')
    .select('post_id')
    .in('post_id', validIds)
    .is('deleted_at', null)

  if (error || !data) return {}

  const counts: Record<string, number> = {}
  for (const row of data) {
    counts[row.post_id] = (counts[row.post_id] ?? 0) + 1
  }
  return counts
}

// 피드 카드에 인라인으로 보여줄 댓글 미리보기 1줄 단위
export interface CommentPreview {
  id: string
  postId: string
  author: string
  avatar: string
  content: string
  likeCount: number
  createdAt: string
}

// 여러 글의 댓글 미리보기를 한 번의 쿼리로 가져와 글별로 선별 (글마다 개별 쿼리 방지)
//  · mode 'best'   → 좋아요 많은 순 (전체 피드: 대표 반응 1개)
//  · mode 'recent' → 최신 순 (가족 피드: 최근 대화 흐름)
// 반환은 표시 순서(오래된→최신)로 정렬해서 자연스럽게 읽히게 함
export async function getCommentPreviews(
  postIds: string[],
  mode: 'best' | 'recent',
  perPost: number,
): Promise<Record<string, CommentPreview[]>> {
  const validIds = postIds.filter(isUUID)
  if (validIds.length === 0) return {}

  const { data, error } = await supabase
    .from('comments')
    .select('id, post_id, content, like_count, created_at, author:users(nickname, avatar_url)')
    .in('post_id', validIds)
    .is('deleted_at', null)

  if (error || !data) return {}

  // 글별로 묶기
  const byPost: Record<string, any[]> = {}
  for (const c of data) {
    (byPost[c.post_id] ??= []).push(c)
  }

  const result: Record<string, CommentPreview[]> = {}
  for (const [postId, comments] of Object.entries(byPost)) {
    const sorted = mode === 'best'
      ? [...comments].sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
      : [...comments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // 선별 후 표시용으로 시간 오름차순 재정렬 (대화 읽기 순서)
    const picked = sorted.slice(0, perPost).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    result[postId] = picked.map((c: any) => ({
      id: c.id,
      postId: c.post_id,
      author: c.author?.nickname ?? '패밀로그 회원',
      avatar: c.author?.avatar_url ?? '',
      content: c.content,
      likeCount: c.like_count ?? 0,
      createdAt: c.created_at,
    }))
  }
  return result
}

function dbToFeedPost(p: any): FeedPost {
  return {
    id: p.id,
    type: p.media_urls?.length > 0 ? 'image' : 'text',
    isMemberOnly: false,
    author: {
      nickname: p.users?.nickname ?? '패밀로그 회원',
      avatar: p.users?.avatar_url ?? 'https://i.pravatar.cc/100?img=30',
      status: p.users?.bio ?? '',
    },
    title: p.title,
    description: p.content,
    images: p.media_urls ?? [],
    likes: p.like_count ?? 0,
    comments: p.comment_count ?? 0,
    category: p.category ?? 'daily',
    authorId: p.author_id,
    // DB post_type 전달 — CommentDrawer에서 event 여부 판단에 사용
    postType: p.post_type ?? undefined,
    createdAt: p.created_at,
  }
}

function dbToCommunityPost(p: any): CommunityPost {
  return {
    id: p.id,
    category: p.category as CommunityPost['category'],
    title: p.title,
    preview: (p.content ?? '').slice(0, 120),
    content: p.content ?? '',
    author: p.users?.nickname ?? '패밀로그 회원',
    avatar: p.users?.avatar_url ?? 'https://i.pravatar.cc/100?img=30',
    status: p.users?.bio ?? '',
    time: formatTime(p.created_at),
    likes: p.like_count ?? 0,
    comments: p.comment_count ?? 0,
    thumbnail: p.thumbnail_url ?? undefined,
    mediaUrls: Array.isArray(p.media_urls) && p.media_urls.length > 0 ? p.media_urls : undefined,
    visibility: (p.visibility ?? 'public') as 'public' | 'family' | 'private',
    commentList: [],
    authorId: p.author_id,
    createdAt: p.created_at,
  }
}

export async function getDbFeedPosts(): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, users(nickname, avatar_url, bio, role, tier)')
    .eq('visibility', 'public')
    .neq('post_type', 'event')
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
    .limit(100)

  if (error || !data) return []

  const now = Date.now()

  const filtered = data.filter(p => {
    if (p.is_pinned) return true

    const daysSinceCreated = (now - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)

    // 운영자 → 7일 기본 노출 보장, 이후 점수로 생존
    if (p.users?.role === 'admin') {
      if (daysSinceCreated <= 7) return true
    }

    // 신규 공개글 → 24시간 기본 노출 보장 (모든 유저)
    if (daysSinceCreated <= 1) return true

    // 핵심 가정 → 3일 기본 노출 보장, 이후 점수로 생존
    if (p.users?.tier === 'fruit' || p.users?.tier === 'beacon') {
      if (daysSinceCreated <= 3) return true
    }

    // 모든 공개글 → 좋아요 1개 이상이면 노출 (기간 제한 없음)
    if (p.like_count >= 1) return true

    // 댓글 3개 이상이면 노출 (기간 제한 없음)
    if (p.comment_count >= 3) return true

    return false
  })

  const scored = filtered.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    const scoreA = (a.like_count * 2) + (a.comment_count * 3)
    const scoreB = (b.like_count * 2) + (b.comment_count * 3)
    return scoreB - scoreA
  })

  const commentCounts = await fetchCommentCountsByPostId(scored.map(p => p.id))
  return scored.map(p =>
    dbToFeedPost({ ...p, comment_count: commentCounts[p.id] ?? 0 })
  )
}

export async function getDbCommunityPosts(): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, users(nickname, avatar_url, bio)')
    .eq('post_type', 'text')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []

  const commentCounts = await fetchCommentCountsByPostId(data.map(p => p.id))
  return data.map(p =>
    dbToCommunityPost({ ...p, comment_count: commentCounts[p.id] ?? 0 })
  )
}

// 가족 피드 조회 — 가족 멤버 글 + visibility='family' 글을 합산해서 반환
export async function getFamilyFeedPosts(familyId: string): Promise<FeedPost[]> {
  // 가족 구성원 user_id 목록 조회
  const { data: members } = await supabase
    .from('family_members')
    .select('user_id')
    .eq('family_id', familyId)
    .eq('status', 'active')

  const memberIds = (members ?? [])
    .map((m: { user_id: string | null }) => m.user_id)
    .filter((id): id is string => id !== null)

  if (memberIds.length === 0) return []

  // 멤버가 쓴 public/family 글 + 가족 공개(family) 글 (private는 본인만 볼 수 있으므로 제외)
  const { data, error } = await supabase
    .from('posts')
    .select('*, users(nickname, avatar_url, bio, role, tier)')
    .neq('post_type', 'event')
    .is('deleted_at', null)
    .or(
      `and(author_id.in.(${memberIds.join(',')}),visibility.neq.private),and(visibility.eq.family,family_id.eq.${familyId})`
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !data) return []

  const commentCounts = await fetchCommentCountsByPostId(data.map(p => p.id))
  return data.map(p => dbToFeedPost({ ...p, comment_count: commentCounts[p.id] ?? 0 }))
}

export async function createPost(params: {
  post_type: 'feed' | 'community' | 'event'
  title: string
  content: string
  category: string
  visibility: 'public' | 'family' | 'private'
  media_urls?: string[]
  thumbnail_url?: string
  // 행사 글 전용 필드 (post_type='event'일 때만 사용)
  event_start_at?: string | null
  event_end_at?: string | null
  event_location?: string | null
  event_max_participants?: number | null
  event_merit_reward?: number
  event_is_closed?: boolean
  // 인증 게시물 전용 — 행사 참여 인증 시 지급할 포인트
  verify_merit_reward?: number
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return { success: false, error: '로그인이 필요해요' }

  // post_type별 DB 저장 값 결정
  const dbPostType =
    params.post_type === 'community' ? 'text' :
    params.post_type === 'event'     ? 'event' :
    'short'

  // visibility='family'일 때 family_id 필요 — 없으면 에러 반환 (자동생성 제거)
  let familyId: string | null = null
  if (params.visibility === 'family') {
    const { data: profile } = await supabase
      .from('users')
      .select('family_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.family_id) {
      familyId = profile.family_id
    } else {
      return { success: false, error: 'NO_FAMILY' }
    }
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      family_id: familyId,
      post_type: dbPostType,
      category: params.category,
      title: params.title,
      content: params.content,
      visibility: params.visibility,
      media_urls: params.media_urls ?? [],
      thumbnail_url: params.thumbnail_url ?? null,
      like_count: 0,
      comment_count: 0,
      view_count: 0,
      // 행사 전용 컬럼 — 일반 글은 모두 null/false로 저장됨
      event_start_at:          params.event_start_at          ?? null,
      event_end_at:            params.event_end_at            ?? null,
      event_location:          params.event_location          ?? null,
      event_max_participants:  params.event_max_participants  ?? null,
      event_merit_reward:      params.event_merit_reward      ?? 0,
      event_is_closed:         params.event_is_closed         ?? false,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  // 게시글 작성 포인트 적립 — 공개범위별 차등 (하루 1회 제한은 addMerit 내부에서 처리)
  const POST_VISIBILITY_POINTS: Record<string, number> = { public: 10, family: 0, private: 0 }
  const postPoints = POST_VISIBILITY_POINTS[params.visibility] ?? 10
  if (postPoints > 0) {
    await addMerit({
      userId: user.id,
      meritType: 'post_created',
      points: postPoints,
      category: 'activity',
      referenceType: 'post',
      referenceId: data.id,
      note: '게시글 작성',
    })
  }

  // 행사 인증 게시물 포인트 적립
  if (params.category === 'practice' && params.verify_merit_reward) {
    await addMerit({
      userId:        user.id,
      meritType:     'event_joined',
      points:        params.verify_merit_reward,
      category:      'events',
      referenceType: 'post',
      referenceId:   data.id,
      note:          '행사 참여 인증',
    })
  }

  return { success: true, id: data.id }
}

// 게시글 소프트 삭제 (작성자 또는 admin만)
export async function deletePost(postId: string): Promise<{ success: boolean; error?: string }> {
  if (!isUUID(postId)) return { success: false, error: '삭제할 수 없는 글입니다' }

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return { success: false, error: '로그인이 필요해요' }

  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('author_id, created_at, visibility')
    .eq('id', postId)
    .is('deleted_at', null)
    .maybeSingle()

  if (fetchError || !post) return { success: false, error: '글을 찾을 수 없어요' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAuthor = post.author_id === user.id
  const isAdmin = profile?.role === 'admin'
  if (!isAuthor && !isAdmin) return { success: false, error: '삭제 권한이 없어요' }

  const { error } = await supabase
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', postId)

  if (error) return { success: false, error: error.message }

  // 작성자 본인 삭제 + 작성 24시간 이내일 때만 포인트 회수
  const ageMs = Date.now() - new Date(post.created_at).getTime()
  if (isAuthor && ageMs < 24 * 60 * 60 * 1000) {
    const POST_VISIBILITY_POINTS: Record<string, number> = { public: 10, family: 0, private: 0 }
    const revokePoints = POST_VISIBILITY_POINTS[post.visibility] ?? 10
    if (revokePoints > 0) {
      await addMerit({
        userId: post.author_id,
        meritType: 'post_deleted',
        points: -revokePoints,
        category: 'activity',
        referenceType: 'post',
        referenceId: postId,
        note: '게시글 삭제',
      })
    }
  }

  return { success: true }
}

// 게시글 수정 (작성자 본인만)
export async function updatePost(
  postId: string,
  params: {
    title: string
    content: string
    category: string
    visibility: 'public' | 'family' | 'private'
    media_urls?: string[]
    thumbnail_url?: string | null
    // 행사 글 전용 필드
    event_start_at?: string | null
    event_end_at?: string | null
    event_location?: string | null
    event_max_participants?: number | null
    event_merit_reward?: number | null
  }
): Promise<{ success: boolean; error?: string }> {
  if (!isUUID(postId)) return { success: false, error: '수정할 수 없는 글입니다' }

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return { success: false, error: '로그인이 필요해요' }

  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .is('deleted_at', null)
    .maybeSingle()

  if (fetchError || !post) return { success: false, error: '글을 찾을 수 없어요' }

  // 작성자 본인 또는 수퍼관리자(admin)만 수정 가능 — admin은 모든 글 수정 권한 보유
  if (post.author_id !== user.id) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'admin') return { success: false, error: '수정 권한이 없어요' }
  }

  // visibility='family'로 바꿀 때 family_id 필요 — 없으면 에러 반환 (자동생성 제거)
  let familyId: string | null | undefined = undefined
  if (params.visibility === 'family') {
    const { data: profile } = await supabase
      .from('users')
      .select('family_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.family_id) {
      familyId = profile.family_id
    } else {
      return { success: false, error: 'NO_FAMILY' }
    }
  }

  const { error } = await supabase
    .from('posts')
    .update({
      title: params.title,
      content: params.content,
      category: params.category,
      visibility: params.visibility,
      ...(familyId !== undefined && { family_id: familyId }),
      ...(params.media_urls !== undefined && { media_urls: params.media_urls }),
      ...(params.thumbnail_url !== undefined && { thumbnail_url: params.thumbnail_url }),
      ...(params.event_start_at !== undefined && { event_start_at: params.event_start_at }),
      ...(params.event_end_at !== undefined && { event_end_at: params.event_end_at }),
      ...(params.event_location !== undefined && { event_location: params.event_location }),
      ...(params.event_max_participants !== undefined && { event_max_participants: params.event_max_participants }),
      ...(params.event_merit_reward !== undefined && { event_merit_reward: params.event_merit_reward }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── 좋아요 ───────────────────────────────────────────────────────────────

export async function getMyLikes(postIds: string[]): Promise<Set<string>> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return new Set()

  const validIds = postIds.filter(isUUID)
  if (validIds.length === 0) return new Set()

  const { data } = await supabase
    .from('likes')
    .select('target_id')
    .eq('user_id', user.id)
    .eq('target_type', 'post')
    .in('target_id', validIds)

  return new Set((data ?? []).map(d => d.target_id))
}

export async function toggleLike(postId: string): Promise<{ liked: boolean; error?: string }> {
  if (!isUUID(postId)) return { liked: true }

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return { liked: false, error: '로그인이 필요해요' }

  const { data: existing } = await supabase
    .from('likes')
    .select('id, created_at')
    .eq('user_id', user.id)
    .eq('target_type', 'post')
    .eq('target_id', postId)
    .maybeSingle()

  if (existing) {
    const { error: deleteError } = await supabase.from('likes').delete().eq('id', existing.id)
    if (deleteError) return { liked: true, error: deleteError.message }

    // 공감 취소 포인트 회수 — 자기 글 제외, 24시간 이내 공감만
    const likeAgeMs = Date.now() - new Date(existing.created_at).getTime()
    if (likeAgeMs < 24 * 60 * 60 * 1000) {
      const { data: post } = await supabase
        .from('posts')
        .select('author_id')
        .eq('id', postId)
        .maybeSingle()

      if (post && post.author_id !== user.id) {
        await addMerit({
          userId: post.author_id,
          meritType: 'like_removed',
          points: -2,
          category: 'activity',
          referenceType: 'post',
          referenceId: postId,
          note: '공감 취소',
        })
      }
    }

    return { liked: false }
  } else {
    const { error: insertError } = await supabase.from('likes').insert({
      user_id: user.id,
      target_type: 'post',
      target_id: postId,
    })
    if (insertError) return { liked: false, error: insertError.message }

    // 공감 받음 포인트 적립 (글 작성자 기준, 자기 글 공감은 제외)
    const { data: post } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .maybeSingle()

    if (post && post.author_id !== user.id) {
      await addMerit({
        userId: post.author_id,
        meritType: 'like_received',
        points: 2,
        category: 'activity',
        referenceType: 'post',
        referenceId: postId,
        note: '공감 받음',
      })
    }

    return { liked: true }
  }
}
// ─── 댓글 ───────────────────────────────────────────────────────────────

export interface DbComment {
  id: string
  post_id: string
  author_id: string
  parent_comment_id: string | null
  content: string
  like_count: number
  created_at: string
  deleted_at: string | null
  // 댓글 첨부 이미지 URLs (event 글 댓글에서만 사용, 최대 1장)
  media_urls?: string[]
  author?: {
    nickname: string
    avatar_url: string
    bio: string
  }
}

export async function getComments(postId: string): Promise<DbComment[]> {
  if (!isUUID(postId)) return []

  const { data, error } = await supabase
    .from('comments')
    .select('*, author:users(nickname, avatar_url, bio)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data
}

export async function createComment(params: {
  post_id: string
  content: string
  parent_comment_id?: string
  // 댓글 첨부 이미지 URLs (event 글 댓글에서만 전달, 최대 1장)
  media_urls?: string[]
}): Promise<{ success: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return { success: false, error: '로그인이 필요해요' }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: params.post_id,
      author_id: user.id,
      content: params.content,
      parent_comment_id: params.parent_comment_id ?? null,
      like_count: 0,
      // 이미지가 있을 때만 저장, 없으면 빈 배열
      media_urls: params.media_urls ?? [],
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  // 댓글 작성 포인트 적립 — 자기 글 댓글 제외, 하루 3회 제한은 addMerit 내부에서 처리
  const { data: parentPost } = await supabase.from('posts').select('author_id').eq('id', params.post_id).maybeSingle()
  if (!parentPost || parentPost.author_id !== user.id) {
    await addMerit({
      userId: user.id,
      meritType: 'comment_created',
      points: 5,
      category: 'activity',
      referenceType: 'comment',
      referenceId: data.id,
      note: '댓글 작성',
    })
  }

  return { success: true }
}

export async function deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return { success: false, error: '로그인이 필요해요' }

  const { data: comment, error: fetchError } = await supabase
    .from('comments')
    .select('author_id, created_at')
    .eq('id', commentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (fetchError || !comment) return { success: false, error: '댓글을 찾을 수 없어요' }
  if (comment.author_id !== user.id) return { success: false, error: '삭제 권한이 없어요' }

  const { error } = await supabase
    .from('comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('author_id', user.id)

  if (error) return { success: false, error: error.message }

  // 작성 24시간 이내일 때만 포인트 회수
  const ageMs = Date.now() - new Date(comment.created_at).getTime()
  if (ageMs < 24 * 60 * 60 * 1000) {
    await addMerit({
      userId: comment.author_id,
      meritType: 'comment_deleted',
      points: -5,
      category: 'activity',
      referenceType: 'comment',
      referenceId: commentId,
      note: '댓글 삭제',
    })
  }

  return { success: true }
}

export async function getMyCommentLikes(commentIds: string[]): Promise<Set<string>> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user || commentIds.length === 0) return new Set()

  const validIds = commentIds.filter(isUUID)
  if (validIds.length === 0) return new Set()

  const { data, error } = await supabase
    .from('likes')
    .select('target_id')
    .eq('user_id', user.id)
    .eq('target_type', 'comment')
    .in('target_id', validIds)

  if (error || !data) return new Set()
  return new Set(data.map(d => d.target_id))
}

export async function toggleCommentLike(commentId: string): Promise<{ liked: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return { liked: false, error: '로그인이 필요해요' }

  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', 'comment')
    .eq('target_id', commentId)
    .maybeSingle()

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id)
    return { liked: false }
  }

  await supabase.from('likes').insert({
    user_id: user.id,
    target_type: 'comment',
    target_id: commentId,
  })
  return { liked: true }
}

// ─── 알림 ───────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string | null
  related_type: string | null
  related_id: string | null
  is_read: boolean
  created_at: string
}

export async function getNotifications(): Promise<Notification[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return data
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
}

// RLS를 우회해 visibility만 반환하는 RPC 호출
// Supabase SQL: CREATE OR REPLACE FUNCTION get_post_visibility(post_id uuid)
//   RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
//   SELECT visibility FROM posts WHERE id = post_id AND deleted_at IS NULL; $$;
export async function getPostVisibility(
  postId: string
): Promise<'public' | 'family' | 'private' | null> {
  if (!isUUID(postId)) return null

  const { data, error } = await supabase.rpc('get_post_visibility', { post_id: postId })
  if (error || data == null) return null
  return data as 'public' | 'family' | 'private'
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return 0

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return count ?? 0
}