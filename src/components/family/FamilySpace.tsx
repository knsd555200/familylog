'use client'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Users } from 'lucide-react'
import InviteFamilyButton from '@/components/family/InviteFamilyButton'
import CreateFamilySheet from '@/components/family/CreateFamilySheet'

// ── 가족 공간 진입 (발자취 탭 내부 임베드용) ──────────────────────────────────
/**
 * 발자취 탭 상단에 박는 컴팩트한 가족 진입 바.
 * - 미연동: "가족 만들기" 카드 → 생성 시트
 * - 연동됨: "가족 초대하기" 버튼 (InviteFamilyButton 재사용)
 */
export default function FamilySpace() {
  const { user } = useAuth()
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  // 가족 생성 직후 1회 — 초대 시트 자동 오픈 트리거
  const [justCreated, setJustCreated] = useState(false)

  if (!user) return null

  // 연동됨 + 평상시: 표시할 진입점 없음 — 초대는 '구성원 기여도' 카드의 + 아이콘이 담당(중복 제거).
  // 단, 가족 생성 직후(justCreated)엔 초대 시트 자동 오픈을 위해 버튼을 한 번 렌더.
  if (user.family_id && !justCreated) return null

  return (
    <div className="mb-5">
      {user.family_id ? (
        /* 생성 직후 — 초대 버튼 렌더 + 시트 자동 오픈 */
        <InviteFamilyButton variant="button" autoOpen={justCreated} />
      ) : (
        /* 미연동 — 가족 만들기 카드 */
        <div className="bg-brand-green-light rounded-2xl px-5 py-5 text-center">
          <div className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center mx-auto mb-3">
            <Users size={22} className="text-brand-green" />
          </div>
          <p className="text-sm font-semibold text-brand-text leading-snug mb-1">가족을 연결하면</p>
          <p className="text-sm text-brand-sub leading-snug mb-4">우리 가족의 여정이 함께 쌓여요</p>
          <button
            onClick={() => setShowCreateSheet(true)}
            className="w-full py-2.5 bg-brand-green text-white text-sm font-medium rounded-full"
          >
            가족 만들기
          </button>
        </div>
      )}

      {/* 가족 생성 시트 */}
      {showCreateSheet && (
        <CreateFamilySheet
          onClose={() => setShowCreateSheet(false)}
          onCreated={() => {
            setShowCreateSheet(false)
            setJustCreated(true)
          }}
        />
      )}
    </div>
  )
}
