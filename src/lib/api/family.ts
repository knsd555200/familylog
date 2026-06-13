import { supabase } from '@/lib/supabase'

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type Family = {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  created_by: string | null
  created_at: string
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

  // 1) families 테이블에 새 행 추가
  const { data: familyRow, error: familyErr } = await supabase
    .from('families')
    .insert({ name: familyName, created_by: userId })
    .select('id, name, description, avatar_url, created_by, created_at')
    .single()

  if (familyErr || !familyRow) {
    return { family: null, error: '가족 생성에 실패했어요.' }
  }

  const familyId = familyRow.id

  // 2) family_members에 owner로 등록
  const { error: memberErr } = await supabase
    .from('family_members')
    .insert({
      family_id: familyId,
      user_id: userId,
      is_account_user: true,
      role: 'owner',
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
  const { error: memberErr } = await supabase
    .from('family_members')
    .insert({
      family_id: invite.family_id,
      user_id: userId,
      is_account_user: true,
      role: 'member',
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
