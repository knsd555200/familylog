'use client'
import { useState, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { updateFamilyIdentity } from '@/lib/api/family'

/**
 * 가족 정체성 편집 시트. 환영 문구·가족 공지·가정명 세 필드.
 * 필드 위계: 환영 문구(위·주인공) → 공지(가운데) → 가정명(아래·보조).
 */
export default function EditFamilyIdentitySheet({
  familyId,
  initialName,
  initialWelcomeMessage,
  initialDescription,
  onClose,
  onSaved,
}: {
  familyId: string
  initialName: string
  initialWelcomeMessage: string | null
  initialDescription: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const [welcomeMessage, setWelcomeMessage] = useState(initialWelcomeMessage ?? '')
  const [description, setDescription] = useState(initialDescription ?? '')
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const processingRef = useRef(false)

  const handleSave = useCallback(async () => {
    if (!name.trim()) return
    if (processingRef.current) return
    processingRef.current = true
    setLoading(true)
    setError('')

    const result = await updateFamilyIdentity(
      familyId,
      name.trim(),
      welcomeMessage.trim(),
      description.trim(),
    )
    if (result.error) {
      setError('저장에 실패했어요. 잠시 후 다시 시도해 주세요.')
      setLoading(false)
      processingRef.current = false
      return
    }

    setLoading(false)
    processingRef.current = false
    onSaved()
  }, [familyId, name, welcomeMessage, description, onSaved])

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white w-full max-w-md rounded-t-3xl lg:rounded-3xl px-6 pt-6 pb-10 lg:pb-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-brand-muted">
          <X size={20} />
        </button>

        <h2 className="font-serif text-lg font-semibold text-brand-text mb-1">가족 정보 수정</h2>
        <p className="text-sm text-brand-sub mb-5">환영 문구와 공지, 가정명을 다듬어 보세요</p>

        {/* 환영 문구 — 선택, 30자 */}
        <label className="block text-xs font-medium text-brand-muted mb-1.5">환영 문구</label>
        <input
          type="text"
          value={welcomeMessage}
          onChange={e => setWelcomeMessage(e.target.value)}
          placeholder="예: 오늘도 함께라서 다행이야"
          maxLength={30}
          autoFocus
          className="w-full border border-brand-line rounded-xl px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-green mb-4"
        />

        {/* 가족 공지 — 선택, 100자 */}
        <label className="block text-xs font-medium text-brand-muted mb-1.5">가족 공지</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="이번 주 가족 소식을 남겨보세요"
          maxLength={100}
          className="w-full border border-brand-line rounded-xl px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-green mb-4"
        />

        {/* 가정명 — 필수, 20자 */}
        <label className="block text-xs font-medium text-brand-muted mb-1">가정명</label>
        <p className="text-[11px] text-brand-muted/70 mb-1.5">가족 이름은 잘 바뀌지 않아요</p>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="예: 김씨네, 성호·유라 가족"
          maxLength={20}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          className="w-full border border-brand-line rounded-xl px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-green mb-2"
        />
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={!name.trim() || loading}
          className="w-full py-3 bg-brand-green text-white text-sm font-medium rounded-full disabled:opacity-40 mt-3"
        >
          {loading ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}
