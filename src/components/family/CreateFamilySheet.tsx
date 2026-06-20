'use client'
import { useState, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { X, Home } from 'lucide-react'
import { createFamily } from '@/lib/api/family'

/**
 * 가족 생성 바텀시트.
 * 가정명 입력 → createFamily → Context의 family_id 즉시 갱신 → onCreated().
 * 발자취 탭(FamilySpace) / 모델하우스(우리 가족 탭) 양쪽에서 재사용.
 */
export default function CreateFamilySheet({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // 생성 후 축하 단계 — 바로 닫지 않고 환영 모먼트를 보여줌
  const [step, setStep] = useState<'form' | 'done'>('form')
  // 따닥 클릭 방지용 ref (버튼 disabled와 이중 방어)
  const processingRef = useRef(false)

  const handleCreate = useCallback(async () => {
    if (!user || !name.trim()) return
    if (processingRef.current) return
    processingRef.current = true
    setLoading(true)
    setError('')

    const result = await createFamily(user.id, user.family_id, name.trim())
    if (result.error) {
      setError(result.error)
      setLoading(false)
      processingRef.current = false
      return
    }

    // Context 즉시 갱신 — 가족 만들기 카드가 사라지고 초대 진입점이 뜨도록
    updateUser({ family_id: result.family!.id })
    setLoading(false)
    processingRef.current = false
    // onCreated는 보류 — 먼저 축하 화면을 보여주고 "시작하기"에서 이어감
    setStep('done')
  }, [user, name, updateUser])

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      {/* 배경 딤 — 축하 단계에선 클릭으로 닫지 않음(시작하기로만 진행) */}
      <div className="absolute inset-0 bg-black/40" onClick={step === 'form' ? onClose : undefined} />

      <div className="relative bg-white w-full max-w-md rounded-t-3xl lg:rounded-3xl px-6 pt-6 pb-10 lg:pb-8">
        {step === 'form' ? (
          <>
            <button onClick={onClose} className="absolute top-4 right-4 p-1 text-brand-muted">
              <X size={20} />
            </button>

            <h2 className="font-serif text-lg font-semibold text-brand-text mb-1">우리 가족 공간 만들기</h2>
            <p className="text-sm text-brand-sub mb-5">우리 가족 이름을 정하면 초대 링크가 만들어져요</p>

            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 김씨 가족, 우리집"
              maxLength={20}
              className="w-full border border-brand-line rounded-xl px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-green mb-2"
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

            <button
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              className="w-full py-3 bg-brand-green text-white text-sm font-medium rounded-full disabled:opacity-40 mt-3"
            >
              {loading ? '만드는 중…' : '만들기'}
            </button>
            {/* 가정 생성 없이 개인 회원으로 둘러보는 보조 이탈 경로. */}
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-4 py-2 text-sm font-medium text-brand-muted hover:text-brand-text transition-colors"
            >
              개인 회원으로 둘러볼게요
            </button>
          </>
        ) : (
          /* ── 축하 단계 — 환영 모먼트 ─────────────────────────────────────── */
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-2xl bg-brand-green-light flex items-center justify-center mx-auto mb-5">
              <Home size={30} className="text-brand-green" />
            </div>
            <h2 className="font-serif text-xl font-bold text-brand-text mb-2">
              {name.trim()} 공간이 열렸어요
            </h2>
            <p className="text-sm text-brand-sub leading-relaxed mb-8">
              먼 훗날 함께 꺼내볼<br />우리 가족의 오늘이 지금부터 쌓여요
            </p>
            <button
              onClick={onCreated}
              className="w-full py-3.5 bg-brand-green text-white text-sm font-semibold rounded-2xl"
            >
              시작하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
