import { supabase } from '@/lib/supabase'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

/** event_manager_applications 테이블 — 업체·단체의 행사 관리자 신청 */
export interface EventManagerApplication {
  id: string
  user_id: string
  org_name: string          // 단체·업체명
  contact: string           // 담당자 연락처(이메일/전화)
  description: string | null // 소개 / 사업자 정보
  status: ApplicationStatus
  created_at: string
  reviewed_at: string | null
  // 신청자 프로필 (join)
  applicant_nickname?: string | null
  applicant_avatar?: string | null
}

// ─── 권한 헬퍼 ────────────────────────────────────────────────────────────────

/** 행사 작성·관리 권한 보유 여부 — 수퍼관리자(admin) 또는 행사관리자(event_manager) */
export function canManageEvents(role: string | undefined): boolean {
  return role === 'admin' || role === 'event_manager'
}

// ─── 신청 (일반 유저) ─────────────────────────────────────────────────────────

/** 행사 관리자 신청을 제출한다 — 이미 대기·승인 상태가 있으면 막는다 */
export async function applyEventManager(params: {
  org_name: string
  contact: string
  description?: string
}): Promise<{ success: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return { success: false, error: '로그인이 필요해요' }

  // 이미 진행 중(대기)이거나 승인된 신청이 있으면 중복 제출 방지
  const { data: existing } = await supabase
    .from('event_manager_applications')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (existing) {
    return {
      success: false,
      error: existing.status === 'approved'
        ? '이미 승인된 행사 관리자예요'
        : '이미 심사 중인 신청이 있어요',
    }
  }

  const { error } = await supabase
    .from('event_manager_applications')
    .insert({
      user_id:     user.id,
      org_name:    params.org_name,
      contact:     params.contact,
      description: params.description ?? null,
      status:      'pending',
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/** 내 신청 상태(가장 최근 1건)를 조회한다 — 없으면 null */
export async function getMyApplication(): Promise<EventManagerApplication | null> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return null

  const { data } = await supabase
    .from('event_manager_applications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
}

// ─── 심사 (수퍼관리자) ────────────────────────────────────────────────────────

/** 대기 중인 신청 목록을 신청 순(오래된→최신)으로 조회한다 */
export async function getPendingApplications(): Promise<EventManagerApplication[]> {
  // users로 가는 FK가 2개(user_id, reviewed_by)라 임베드가 모호 → user_id FK 명시 (PGRST201 방지)
  const { data, error } = await supabase
    .from('event_manager_applications')
    .select('*, users!event_manager_applications_user_id_fkey(nickname, avatar_url)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map((r: any) => ({
    id:                r.id,
    user_id:           r.user_id,
    org_name:          r.org_name,
    contact:           r.contact,
    description:       r.description ?? null,
    status:            r.status,
    created_at:        r.created_at,
    reviewed_at:       r.reviewed_at ?? null,
    applicant_nickname: r.users?.nickname ?? null,
    applicant_avatar:   r.users?.avatar_url ?? null,
  }))
}

/**
 * 신청 승인 — RPC(approve_event_manager) 호출.
 * RPC 내부에서 (1) 호출자 admin 확인 (2) 신청 status='approved'
 * (3) 신청자 users.role='event_manager'로 변경을 SECURITY DEFINER로 처리한다.
 */
export async function approveApplication(
  applicationId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('approve_event_manager', { application_id: applicationId })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

/** 신청 거절 — RPC(reject_event_manager) 호출 (status='rejected') */
export async function rejectApplication(
  applicationId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('reject_event_manager', { application_id: applicationId })
  if (error) return { success: false, error: error.message }
  return { success: true }
}
