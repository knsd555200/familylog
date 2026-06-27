import { supabase } from '@/lib/supabase'
import { MILONE_SYSTEM_USER_ID } from '@/lib/constants'

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type Family = {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  avatar_focal_x?: number | null
  avatar_focal_y?: number | null
  created_by: string | null
  created_at: string
}

export type FamilyAvatarSummary = {
  id: string
  name: string
  avatar_url: string | null
  avatar_focal_x?: number | null
  avatar_focal_y?: number | null
  seq: number | null
}

// ── 가족 생성 ─────────────────────────────────────────────────────────────────

/**
 * 새 가족을 만들고 현재 유저를 owner로 등록한다.
 * 이미 family_id가 있으면 에러를 반환한다.
 */
export async function createFamily(
  userId: string,
  currentFamilyId: string | null | undefined,
  familyName: string,
): Promise<{ family: Family; error: null } | { family: null; error: string }> {
  // 이미 가족이 있으면 막기
  if (currentFamilyId) {
    return { family: null, error: '이미 가족이 연결되어 있어요.' }
  }

  // seq 최댓값 조회 — seq=NULL 행(밀로네 마스코트 가정)은 제외하고 실제 가정만 카운트
  const { data: seqRow } = await supabase
    .from('families')
    .select('seq')
    .not('seq', 'is', null)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 기존 seq 있는 행이 없으면 1, 있으면 MAX + 1
  const nextSeq = (seqRow?.seq ?? 0) + 1

  // 1) families 테이블에 새 행 추가
  const { data: familyRow, error: familyErr } = await supabase
    .from('families')
    .insert({ name: familyName, created_by: userId, seq: nextSeq })
    .select('id, name, description, avatar_url, avatar_focal_x, avatar_focal_y, created_by, created_at')
    .single()

  if (familyErr || !familyRow) {
    return { family: null, error: '가족 생성에 실패했어요.' }
  }

  const familyId = familyRow.id

  // 1-1) 밀로네 시스템 계정 명의의 환영 글 1건 생성 — 가족당 1회(가족 생성 직후 단 한 번 실행되는 지점)
  // posts INSERT RLS가 auth.uid()=author_id를 요구해 직접 insert는 막힘 → SECURITY DEFINER RPC로 우회(문구·사진은 RPC 내부 보유)
  // 실패해도 가족 생성 흐름은 막지 않도록 try/catch로 격리하고 로그만 남긴다
  try {
    // 클라이언트는 가족 id와 이름만 넘기고, 작성자/문구/미디어는 RPC가 처리
    const { error: welcomeErr } = await supabase.rpc('create_welcome_post', {
      p_family_id: familyId,
      p_family_name: familyName,
    })
    if (welcomeErr) console.error('[createFamily] 환영 글 생성 실패(무시):', welcomeErr.message)
  } catch (e) {
    console.error('[createFamily] 환영 글 생성 예외(무시):', e)
  }

  // 2) family_members에 owner로 등록
  const { error: memberErr } = await supabase
    .from('family_members')
    .insert({
      family_id: familyId,
      user_id: userId,
      is_account_user: true,
      role: 'parent',
      status: 'active',
      invited_by: userId,
    })

  if (memberErr) {
    // families 행은 남지만 정합성 깨지므로 에러 반환 (추후 운영자 정리)
    return { family: null, error: '가족 멤버 등록에 실패했어요.' }
  }

  // 3) users.family_id 업데이트
  const { error: userErr } = await supabase
    .from('users')
    .update({ family_id: familyId })
    .eq('id', userId)

  if (userErr) {
    return { family: null, error: '유저 정보 업데이트에 실패했어요.' }
  }

  return { family: familyRow, error: null }
}

// ── 초대 링크 생성 ────────────────────────────────────────────────────────────

// 추측하기 어려운 랜덤 코드 생성 (URL-safe 8자)
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/**
 * 현재 유저의 가족에 대한 초대 링크를 생성한다.
 * 기존 활성 링크가 있으면 재사용하고, 없으면 새로 만든다.
 */
export async function createInviteLink(
  userId: string,
  familyId: string,
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  // 기존 활성 링크가 있으면 재사용 (과도 생성 방지)
  const { data: existing } = await supabase
    .from('invite_codes')
    .select('code')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const url = `${window.location.origin}/invite/${existing.code}`
    return { url, error: null }
  }

  // 새 코드 생성 (충돌 가능성 매우 낮으나 실패 시 에러 반환)
  const code = generateCode()
  const { error: insertErr } = await supabase
    .from('invite_codes')
    .insert({
      code,
      family_id: familyId,
      created_by: userId,
      max_uses: 20,
      use_count: 0,
      is_active: true,
    })

  if (insertErr) {
    return { url: null, error: '초대 링크 생성에 실패했어요.' }
  }

  const url = `${window.location.origin}/invite/${code}`
  return { url, error: null }
}

// ── 초대 코드로 합류 ──────────────────────────────────────────────────────────

type JoinResult =
  | { familyName: string; error: null }
  | { familyName: null; error: string; alreadyMember?: boolean }

/**
 * 초대 코드를 검증하고 현재 유저를 해당 가족에 합류시킨다.
 * 중복 호출 방지: 이미 해당 가족 멤버이면 에러 없이 성공 처리.
 */
export async function joinFamilyByCode(
  userId: string,
  currentFamilyId: string | null | undefined,
  code: string,
): Promise<JoinResult> {
  // 코드 조회 (없으면 null — maybeSingle로 406 방지)
  const { data: invite, error: inviteErr } = await supabase
    .from('invite_codes')
    .select('id, family_id, created_by, is_active, use_count, max_uses, expires_at')
    .eq('code', code)
    .maybeSingle()

  if (inviteErr) return { familyName: null, error: '초대 링크를 확인할 수 없어요.' }
  if (!invite)   return { familyName: null, error: '유효하지 않은 초대 링크예요.' }

  // 유효성 검증
  if (!invite.is_active)                  return { familyName: null, error: '이미 만료된 초대 링크예요.' }
  if (invite.use_count >= invite.max_uses) return { familyName: null, error: '초대 인원이 다 찼어요.' }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { familyName: null, error: '초대 링크 유효기간이 지났어요.' }
  }

  // 이미 다른 가족에 속한 경우 막기 (한 사람 한 가족)
  if (currentFamilyId && currentFamilyId !== invite.family_id) {
    return { familyName: null, error: '이미 다른 가족에 연결되어 있어요.' }
  }

  // 이미 이 가족 멤버이면 중복 처리 방지 (자기 링크 클릭 / 중복 호출)
  const { data: existingMember } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_id', invite.family_id)
    .eq('user_id', userId)
    .maybeSingle()

  // 가족명 조회
  const { data: familyRow } = await supabase
    .from('families')
    .select('name')
    .eq('id', invite.family_id)
    .single()

  const familyName = familyRow?.name ?? '가족'

  if (existingMember) {
    // 이미 멤버 — users.family_id만 확실히 동기화하고 성공 반환
    await supabase.from('users').update({ family_id: invite.family_id }).eq('id', userId)
    return { familyName, error: null }
  }

  // 합류 처리 (3단계 — 정합성 묶기)
  // role: 배우자 제한 트리거 삭제 후 전원 'parent' (역할 구분 없는 평평한 모델)
  const { error: memberErr } = await supabase
    .from('family_members')
    .insert({
      family_id: invite.family_id,
      user_id: userId,
      is_account_user: true,
      role: 'parent',
      status: 'active',
      invited_by: invite.created_by,
    })

  if (memberErr) return { familyName: null, error: '가족 합류에 실패했어요.' }

  const { error: userErr } = await supabase
    .from('users')
    .update({ family_id: invite.family_id })
    .eq('id', userId)

  if (userErr) return { familyName: null, error: '유저 정보 업데이트에 실패했어요.' }

  await supabase
    .from('invite_code_uses')
    .insert({ code_id: invite.id, used_by: userId })

  // use_count 증가 (실패해도 치명적이지 않으므로 에러 무시)
  await supabase
    .from('invite_codes')
    .update({ use_count: invite.use_count + 1 })
    .eq('id', invite.id)

  return { familyName, error: null }
}

// 가족 이름만 가볍게 조회 — 환영 문구용(통계 전체 끌어오는 getFamilyStats와 분리)
export async function getFamilyName(familyId: string): Promise<string | null> {
  const { data } = await supabase
    .from('families')
    .select('name')
    .eq('id', familyId)
    .maybeSingle() // 결과 없을 때 406 방지
  return data?.name ?? null
}

// 이야기 탭 전체 보기용 가족 목록 — families 행이 있는 가정만 seq 순서로 가져온다.
export async function getAllFamilies(): Promise<FamilyAvatarSummary[]> {
  const { data: systemUser } = await supabase
    .from('users')
    .select('family_id')
    .eq('id', MILONE_SYSTEM_USER_ID)
    .maybeSingle()

  const { data, error } = await supabase
    .from('families')
    .select('id, name, avatar_url, avatar_focal_x, avatar_focal_y, seq')
    .order('seq', { ascending: true })

  if (error || !data) return []

  // 이웃 1기 명부에서는 환영봇이 속한 시스템 가정만 제외한다.
  const systemFamilyId = systemUser?.family_id ?? null

  return data.filter(family => family.id !== systemFamilyId).map(family => ({
    id: family.id,
    name: family.name,
    avatar_url: family.avatar_url ?? null,
    avatar_focal_x: family.avatar_focal_x ?? 50,
    avatar_focal_y: family.avatar_focal_y ?? 50,
    seq: family.seq ?? null,
  }))
}

// 가족 공간 상단 정체성 영역 전용 조회
// 가족 구성 박스용 멤버 목록(본인 포함, 아바타·닉네임만). getFamilyStats와 달리 통계 없이 경량.
export async function getFamilyIdentity(
  familyId: string,
): Promise<{
  name: string
  seq: number | null
  avatarUrl: string | null
  avatarFocalX?: number | null
  avatarFocalY?: number | null
  welcomeMessage: string | null
  description: string | null
  createdAt: string
  members: { userId: string; nickname: string; avatar: string | null; avatarFocalX?: number | null; avatarFocalY?: number | null }[]
} | null> {
  const { data } = await supabase
    .from('families')
    .select('name, seq, avatar_url, avatar_focal_x, avatar_focal_y, welcome_message, description, created_at')
    .eq('id', familyId)
    .maybeSingle() // 결과 없을 때 406 방지
  if (!data) return null

  // 활성 멤버 조회 — user_id/invited_by FK 모호성 방지를 위해 FK 이름 명시
  const { data: members } = await supabase
    .from('family_members')
    .select('user_id, users!family_members_user_id_fkey(nickname, avatar_url, avatar_focal_x, avatar_focal_y)')
    .eq('family_id', familyId)
    .eq('status', 'active')

  const memberList = (members ?? [])
    .filter(m => m.user_id && m.users)
    .map(m => ({
      userId:   m.user_id as string,
      nickname: (m.users as any).nickname  ?? '가족',
      avatar:   (m.users as any).avatar_url ?? null,
      avatarFocalX: (m.users as any).avatar_focal_x ?? 50,
      avatarFocalY: (m.users as any).avatar_focal_y ?? 50,
    }))

  return {
    name:           data.name,
    seq:            data.seq ?? null,
    avatarUrl:      (data as any).avatar_url ?? null,
    avatarFocalX:   (data as any).avatar_focal_x ?? 50,
    avatarFocalY:   (data as any).avatar_focal_y ?? 50,
    welcomeMessage: (data as any).welcome_message ?? null,
    description:    data.description ?? null,
    createdAt:      data.created_at,
    members:        memberList,
  }
}

// 가족 정체성(가정명·환영 문구·소개) 수정. RLS member update 정책으로 active 멤버만 통과.
export async function updateFamilyIdentity(
  familyId: string,
  name: string,
  welcomeMessage: string | null,
  description: string | null,
  avatarUrl: string | null,
  avatarFocalX?: number | null,
  avatarFocalY?: number | null,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('families')
    .update({
      name,
      welcome_message: welcomeMessage && welcomeMessage.trim() ? welcomeMessage : null,
      description: description && description.trim() ? description : null,
      avatar_url: avatarUrl,
      avatar_focal_x: avatarFocalX ?? 50,
      avatar_focal_y: avatarFocalY ?? 50,
    })
    .eq('id', familyId)
    .select('id')
  if (!error && (!data || data.length === 0)) {
    return { error: '가족 정보를 수정할 권한이 없거나 대상 가족을 찾지 못했어요.' }
  }
  return { error: error ? error.message : null }
}

// 활성 가족 멤버 수만 가볍게 조회 — 초대 배너 자가소멸 판정용
export async function getFamilyMemberCount(familyId: string): Promise<number> {
  const { count } = await supabase
    .from('family_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('family_id', familyId)
    .eq('status', 'active')

  return count ?? 0
}

// ── 가족 합산 통계 ─────────────────────────────────────────────────────────────

export interface FamilyMemberStats {
  userId: string
  nickname: string
  avatar: string | null
  avatarFocalX?: number | null
  avatarFocalY?: number | null
  points: number
}

export interface FamilyStats {
  familyId: string
  familyName: string
  familyCreatedAt: string
  familyDays: number
  members: FamilyMemberStats[]
  totalPoints: number
}

// 가족 생성일·멤버별 포인트를 단일 쿼리로 취득해 합산 통계 반환
export async function getFamilyStats(familyId: string): Promise<FamilyStats | null> {
  // families 기본 정보 조회
  const { data: family } = await supabase
    .from('families')
    .select('id, name, created_at')
    .eq('id', familyId)
    .single()

  if (!family) return null

  // family_members + users 조인으로 멤버 닉네임·아바타·포인트 한 번에 취득
  // users로 가는 FK가 2개(user_id, invited_by)라 임베드가 모호 → user_id FK 명시 (PGRST201 방지)
  const { data: members } = await supabase
    .from('family_members')
    .select('user_id, users!family_members_user_id_fkey(nickname, avatar_url, avatar_focal_x, avatar_focal_y, merit_total)')
    .eq('family_id', familyId)
    .eq('status', 'active')

  const memberStats: FamilyMemberStats[] = (members ?? [])
    .filter(m => m.user_id && m.users)
    .map(m => ({
      userId:   m.user_id as string,
      nickname: (m.users as any).nickname     ?? '가족',
      avatar:   (m.users as any).avatar_url    ?? null,
      avatarFocalX: (m.users as any).avatar_focal_x ?? 50,
      avatarFocalY: (m.users as any).avatar_focal_y ?? 50,
      points:   (m.users as any).merit_total   ?? 0,
    }))

  const totalPoints = memberStats.reduce((s, m) => s + m.points, 0)
  // 가족 생성일 기준 경과 일수 계산
  const familyDays = Math.max(0, Math.floor((Date.now() - new Date(family.created_at).getTime()) / 86400000))

  return {
    familyId:       family.id,
    familyName:     family.name,
    familyCreatedAt: family.created_at,
    familyDays,
    members: memberStats,
    totalPoints,
  }
}

// ── 가족 이야기 탭 포스트 ──────────────────────────────────────────────────────

export interface FamilyPostItem {
  id: string
  title: string
  content: string | null
  media_urls: string[] | null
  thumbnail_url: string | null
  like_count: number
  comment_count: number
  created_at: string
  visibility: string
  author_id: string
  authorNickname: string
  authorAvatar: string | null
  authorAvatarFocalX?: number | null
  authorAvatarFocalY?: number | null
}

// 가족 구성원 전체 글 조회 — offset 기반 페이지네이션, count: 'exact'로 총 건수 동시 반환
export async function getFamilyPosts(
  familyId: string,
  offset: number = 0,
  limit:  number = 10,
): Promise<{ posts: FamilyPostItem[]; totalCount: number }> {
  // 가족 활성 멤버 user_id 목록 조회
  const { data: members } = await supabase
    .from('family_members')
    .select('user_id')
    .eq('family_id', familyId)
    .eq('status', 'active')

  const memberIds = (members ?? [])
    .map(m => m.user_id)
    .filter((id): id is string => id !== null)

  if (memberIds.length === 0) return { posts: [], totalCount: 0 }

  // 멤버 글 + 작성자 닉네임·아바타 조인, count: 'exact'로 총 건수 동시 취득
  const { data, count } = await supabase
    .from('posts')
    .select(
      'id, title, content, media_urls, thumbnail_url, like_count, comment_count, created_at, visibility, author_id, users(nickname, avatar_url, avatar_focal_x, avatar_focal_y)',
      { count: 'exact' },
    )
    .in('author_id', memberIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (!data) return { posts: [], totalCount: 0 }

  return {
    posts: data.map(p => ({
      id:             p.id,
      title:          p.title,
      content:        p.content        ?? null,
      media_urls:     Array.isArray(p.media_urls) ? p.media_urls : null,
      thumbnail_url:  p.thumbnail_url  ?? null,
      like_count:     p.like_count     ?? 0,
      comment_count:  p.comment_count  ?? 0,
      created_at:     p.created_at,
      visibility:     p.visibility,
      author_id:      p.author_id,
      authorNickname: (p.users as any)?.nickname  ?? '가족',
      authorAvatar:   (p.users as any)?.avatar_url ?? null,
      authorAvatarFocalX: (p.users as any)?.avatar_focal_x ?? 50,
      authorAvatarFocalY: (p.users as any)?.avatar_focal_y ?? 50,
    })),
    totalCount: count ?? 0,
  }
}
