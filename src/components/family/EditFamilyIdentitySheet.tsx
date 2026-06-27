'use client'
import { useState, useRef, useCallback } from 'react'
import { Camera, X } from 'lucide-react'
import FocalPointPicker from '@/components/FocalPointPicker'
import { useAuth } from '@/context/AuthContext'
import { updateFamilyIdentity } from '@/lib/api/family'
import { uploadImages } from '@/lib/upload'

/**
 * 가족 정체성 편집 시트. 대표 사진·환영 문구·가족 공지·가정명을 다룬다.
 * 필드 위계: 대표 사진(이야기 카드) → 환영 문구(주인공) → 공지 → 가정명(보조).
 */
export default function EditFamilyIdentitySheet({
  familyId,
  initialName,
  initialWelcomeMessage,
  initialDescription,
  initialAvatarUrl,
  initialAvatarFocalX,
  initialAvatarFocalY,
  onClose,
  onSaved,
}: {
  familyId: string
  initialName: string
  initialWelcomeMessage: string | null
  initialDescription: string | null
  initialAvatarUrl: string | null
  initialAvatarFocalX?: number | null
  initialAvatarFocalY?: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const { refreshUser } = useAuth()
  const [welcomeMessage, setWelcomeMessage] = useState(initialWelcomeMessage ?? '')
  const [description, setDescription] = useState(initialDescription ?? '')
  const [name, setName] = useState(initialName)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl)
  const [avatarFocal, setAvatarFocal] = useState({ x: initialAvatarFocalX ?? 50, y: initialAvatarFocalY ?? 50 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const processingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarFocal({ x: 50, y: 50 })
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  const handleSave = useCallback(async () => {
    if (!name.trim()) return
    if (processingRef.current) return
    processingRef.current = true
    setLoading(true)
    setError('')

    let finalAvatarUrl = initialAvatarUrl
    if (avatarFile) {
      // 가족 대표 사진은 기존 R2 업로드 헬퍼를 그대로 사용해 URL만 가족 정보에 저장한다.
      const { urls, error: uploadError } = await uploadImages([avatarFile])
      if (uploadError) {
        setError(uploadError)
        setLoading(false)
        processingRef.current = false
        return
      }
      finalAvatarUrl = urls[0] ?? null
    }

    const result = await updateFamilyIdentity(
      familyId,
      name.trim(),
      welcomeMessage.trim(),
      description.trim(),
      finalAvatarUrl,
      avatarFocal.x,
      avatarFocal.y,
    )
    if (result.error) {
      setError(result.error)
      setLoading(false)
      processingRef.current = false
      return
    }

    setLoading(false)
    processingRef.current = false
    await refreshUser()
    onSaved()
  }, [familyId, name, welcomeMessage, description, initialAvatarUrl, avatarFile, avatarFocal, refreshUser, onSaved])

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white w-full max-w-md rounded-t-3xl lg:rounded-3xl px-6 pt-6 pb-10 lg:pb-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-brand-muted">
          <X size={20} />
        </button>

        <h2 className="font-serif text-lg font-semibold text-brand-text mb-1">가족 정보 수정</h2>
        <p className="text-sm text-brand-sub mb-5">환영 문구와 공지, 가정명을 다듬어 보세요</p>

        {/* 가족 대표 사진 — 우리가족 배너에 맞춰 16:9로 잡고, 이웃 3:4 카드는 같은 좌표로 근사한다. */}
        <label className="block text-xs font-medium text-brand-muted mb-1.5">가족 대표 사진</label>
        <div className="flex items-center gap-4 mb-5">
          <div className="relative w-20 flex-shrink-0">
            {avatarPreview ? (
              <FocalPointPicker
                imageUrl={avatarPreview}
                value={avatarFocal}
                onChange={(x, y) => setAvatarFocal({ x, y })}
                aspectRatio="16:9"
              />
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[16/9] rounded-xl bg-brand-green flex items-center justify-center border border-brand-line"
              >
                <span className="text-2xl text-white">{name.trim().charAt(0) || '가'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-brand-green rounded-full flex items-center justify-center border-2 border-white shadow"
            >
              <Camera size={13} className="text-white" />
            </button>
          </div>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-full bg-brand-card text-xs font-medium text-brand-text"
            >
              사진 선택
            </button>
            <p className="text-[11px] text-brand-muted mt-2">jpg, png, gif, webp · 5MB 이하</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </div>

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
