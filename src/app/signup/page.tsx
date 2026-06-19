'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { consumePendingInvite } from '@/lib/pendingInvite'
import { peekPendingFamilyCreate } from '@/lib/pendingFamilyCreate'
import { ChevronLeft } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const { user, updateUser } = useAuth()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)

  // 온보딩은 닉네임만 받는다 — 생애주기(life_stage)·관심사는 여기서 받지 않음(life_stage는 프로필 수정에서 선택)
  const handleSubmit = async () => {
    if (!user?.id || !nickname.trim() || loading) return
    setLoading(true)
    // users에 닉네임 저장 (life_stage는 건드리지 않음 — 컬럼은 프로필 수정에서 계속 사용)
    await supabase.from('users').upsert({ id: user.id, nickname: nickname.trim() })
    // 컨텍스트 즉시 갱신 — 완료 sentinel(nickname)이 채워져 AppShell 가드가 /signup으로 되튕기지 않도록
    updateUser({ nickname: nickname.trim() })
    // 온보딩 후 분기: 초대 합류 > 가정 생성 예약(모델하우스 CTA) > 일반 피드
    const inviteCode = consumePendingInvite()
    if (inviteCode) { router.push(`/invite/${inviteCode}`); return }
    // 예약 플래그는 community가 소비(여기선 peek만) → 우리 가족 탭으로 보내 생성 시트가 뜨게 함
    if (peekPendingFamilyCreate()) { router.push('/community?tab=family'); return }
    router.push('/feed')
  }

  const canProceed = nickname.trim().length > 0 && !!user?.id

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => router.back()} className="p-1 text-brand-sub">
          <ChevronLeft size={22} />
        </button>
        <div className="w-7" />
      </div>

      <div className="flex-1 px-6 py-6 max-w-md mx-auto w-full">
        <div className="mb-6">
          <h1 className="font-serif font-bold text-xl mb-2">어떻게 불러드릴까요?</h1>
          <p className="text-sm text-brand-sub leading-relaxed">패밀로그에서 사용할 닉네임을 입력해주세요. 나중에 바꿀 수 있어요.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block">닉네임</label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              placeholder="예: 김성호"
              className="w-full px-4 py-3 bg-white border border-brand-line rounded-xl text-sm outline-none focus:border-brand-green"
            />
          </div>
        </div>
        <div className="mt-6 p-4 bg-brand-card rounded-2xl">
          <p className="text-xs text-brand-sub leading-relaxed">
            가입 시 패밀로그 <Link href="#" className="underline">이용약관</Link>과 <Link href="#" className="underline">개인정보 처리방침</Link>에 동의하게 됩니다.
          </p>
        </div>
      </div>

      <div className="px-6 pb-8 max-w-md mx-auto w-full">
        <button
          onClick={handleSubmit}
          disabled={!canProceed || loading}
          className={`w-full py-3.5 rounded-2xl font-medium text-sm ${
            canProceed ? 'bg-brand-green text-white' : 'bg-brand-card text-brand-muted'
          }`}
        >
          {loading ? '저장 중...' : '시작하기'}
        </button>
      </div>
    </div>
  )
}
