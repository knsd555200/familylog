import { supabase } from '@/lib/supabase'

// merit_type별 하루 최대 적립 횟수 (없으면 무제한)
const DAILY_LIMITS: Record<string, number> = {
  post_created:    1,
  comment_created: 3,
  like_received:   5,
}

export async function addMerit({
  userId,
  meritType,
  points,
  category,
  rawValue,
  referenceType,
  referenceId,
  note,
}: {
  userId: string
  meritType: string
  points: number
  category: string
  rawValue?: number
  referenceType?: string
  referenceId?: string
  note?: string
}): Promise<boolean> {
  try {
    const dailyLimit = DAILY_LIMITS[meritType]

    // 하루 제한이 있는 meritType은 오늘 적립 횟수를 먼저 확인
    if (dailyLimit !== undefined) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { count, error: countError } = await supabase
        .from('merits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('merit_type', meritType)
        .gte('created_at', todayStart.toISOString())

      if (countError) {
        console.error('[addMerit] 일일 횟수 조회 실패:', countError.message)
        return false
      }

      if ((count ?? 0) >= dailyLimit) {
        // 하루 한도 초과 — INSERT 스킵
        console.log(
          `[addMerit] 스킵 — ${meritType} 하루 최대 ${dailyLimit}회 초과 (userId: ${userId})`
        )
        return false
      }
    }

    // merits 테이블에 적립 내역 INSERT
    const { data: userSnapshot, error: userSnapshotError } = await supabase
      .from('users')
      .select('family_id')
      .eq('id', userId)
      .maybeSingle()

    if (userSnapshotError) {
      console.error('[addMerit] family_id 조회 실패:', userSnapshotError.message)
    }

    const { error: insertError } = await supabase.from('merits').insert({
      user_id:        userId,
      family_id:      userSnapshot?.family_id ?? null,
      merit_type:     meritType,
      category:       category,
      points:         points,
      raw_value:      rawValue ?? null,
      reference_type: referenceType ?? null,
      reference_id:   referenceId ?? null,
      note:           note ?? null,
    })

    if (insertError) {
      console.error('[addMerit] INSERT 실패:', insertError.message)
      return false
    }

    return true
  } catch (err) {
    console.error('[addMerit] 예상치 못한 에러:', err)
    return false
  }
}
