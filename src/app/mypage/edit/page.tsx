'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { uploadImages } from '@/lib/upload'

const LIFE_STAGES = [
  { id: 'pre_married', label: '예비부부', icon: '💍' },
  { id: 'newlywed',    label: '신혼부부', icon: '🏠' },
  { id: 'parenting',   label: '부모',     icon: '👨‍👩‍👧' },
  { id: 'empty_nest',  label: '황혼부부',  icon: '🕊️' },
] as const

async function patchUser(
  userId: string,
  token: string,
  payload: { nickname: string; bio: string; life_stage: string | null; avatar_url: string }
): Promise<boolean> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: {
        apikey:           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization:    `Bearer ${token}`,
        'Content-Type':   'application/json',
        Prefer:           'return=minimal',
      },
      body: JSON.stringify(payload),
    }
  )
  return res.ok
}

export default function ProfileEditPage() {
  const router = useRouter()
  const { user, updateUser } = useAuth()

  const [nickname,   setNickname]   = useState(user?.nickname  ?? '')
  const [bio,        setBio]        = useState(user?.bio        ?? '')
  const [lifeStage,  setLifeStage]  = useState<string | null>(user?.life_stage ?? null)
  const [avatarUrl,  setAvatarUrl]  = useState(user?.avatar     ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [preview,    setPreview]    = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!user) return
    if (!nickname.trim()) { setError('닉네임을 입력해주세요'); return }

    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('로그인이 필요해요'); return }

      // 아바타 업로드
      let finalAvatarUrl = avatarUrl
      if (avatarFile) {
        const { urls, error: uploadError } = await uploadImages([avatarFile])
        if (uploadError) { setError(uploadError); return }
        finalAvatarUrl = urls[0]
      }

      const payload = {
        nickname:   nickname.trim(),
        bio:        bio.trim(),
        life_stage: lifeStage,
        avatar_url: finalAvatarUrl,
      }

      const ok = await patchUser(user.id, session.access_token, payload)
      if (!ok) { setError('저장에 실패했어요. 다시 시도해주세요.'); return }

      // AuthContext user 상태 즉시 갱신
      updateUser({
        nickname:   payload.nickname,
        bio:        payload.bio,
        life_stage: payload.life_stage,
        avatar:     finalAvatarUrl,
      })

      router.back()
    } finally {
      setLoading(false)
    }
  }

  const displayAvatar = preview ?? avatarUrl

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      {/* 상단 바 */}
      <div className="sticky top-14 lg:top-0 z-20 bg-brand-bg/95 backdrop-blur-sm border-b border-brand-line px-4 lg:px-6 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-brand-sub">
          <ArrowLeft size={18} />
          <span className="text-sm">취소</span>
        </button>
        <span className="font-medium text-sm">프로필 수정</span>
        <button
          onClick={handleSave}
          disabled={loading || !nickname.trim()}
          className="text-sm font-medium text-brand-green disabled:text-brand-muted transition-colors"
        >
          {loading ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {/* 아바타 */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative"
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-brand-line" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-brand-card flex items-center justify-center border-2 border-brand-line" />
            )}
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-brand-green rounded-full flex items-center justify-center border-2 border-white shadow">
              <Camera size={14} className="text-white" />
            </div>
          </button>
          <p className="text-xs text-brand-muted mt-2">사진 변경</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </div>

        {/* 닉네임 */}
        <div>
          <label className="text-xs text-brand-sub mb-1.5 block">닉네임 <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={30}
            placeholder="예: 성호·유라 가정"
            className="w-full px-4 py-3 bg-white border border-brand-line rounded-xl text-sm outline-none focus:border-brand-green transition-colors"
          />
        </div>

        {/* 한 줄 소개 */}
        <div>
          <label className="text-xs text-brand-sub mb-1.5 block">한 줄 소개</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={100}
            rows={3}
            placeholder="우리 가정을 한 줄로 소개해주세요"
            className="w-full px-4 py-3 bg-white border border-brand-line rounded-xl text-sm outline-none focus:border-brand-green transition-colors resize-none"
          />
          <p className="text-right text-[11px] text-brand-muted mt-1">{bio.length}/100</p>
        </div>

        {/* 생애주기 */}
        <div>
          <label className="text-xs text-brand-sub mb-2 block">생애주기</label>
          <div className="grid grid-cols-2 gap-2">
            {LIFE_STAGES.map(s => {
              const selected = lifeStage === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setLifeStage(selected ? null : s.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    selected
                      ? 'border-brand-green bg-brand-green-light text-brand-green-dark'
                      : 'border-brand-line bg-white text-brand-sub'
                  }`}
                >
                  <span className="text-xl leading-none">{s.icon}</span>
                  <span className="flex-1 text-left">{s.label}</span>
                  {selected && <Check size={14} className="text-brand-green flex-shrink-0" strokeWidth={3} />}
                </button>
              )
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  )
}
