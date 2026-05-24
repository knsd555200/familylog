'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, Check } from 'lucide-react'

const STATUSES = [
  { id: 'single', label: '미혼', icon: '👤', desc: '아직 결혼 전이에요' },
  { id: 'dating', label: '연애 중', icon: '💕', desc: '소중한 사람과 만나고 있어요' },
  { id: 'engaged', label: '결혼 준비', icon: '💍', desc: '곧 결혼해요' },
  { id: 'newlywed', label: '신혼', icon: '🏠', desc: '결혼 5년차 이하' },
  { id: 'family', label: '가족', icon: '👨‍👩‍👧', desc: '결혼 5년차 이상' },
] as const

const INTERESTS = ['부부 관계', '자녀 양육', '일상 기록', '가정 문화', '봉사·기여', '커뮤니티'] as const

export default function SignupPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [status, setStatus] = useState<string>('')
  const [interests, setInterests] = useState<string[]>([])
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      // Supabase users 테이블에 저장
      setLoading(true)
      if (user?.id) {
        await supabase.from('users').upsert({
          id: user.id,
          nickname: nickname.trim(),
          bio: status,
        })
      }
      router.push('/feed')
    }
  }

  const canProceed =
    (step === 1 && !!status) ||
    (step === 2 && interests.length > 0) ||
    (step === 3 && nickname.trim().length > 0)

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="p-1 text-brand-sub">
          <ChevronLeft size={22} />
        </button>
        <div className="text-xs text-brand-muted">{step}/3 단계</div>
        <div className="w-7" />
      </div>

      <div className="px-4">
        <div className="w-full bg-brand-card rounded-full h-1">
          <div className="bg-brand-green h-1 rounded-full transition-all" style={{ width: `${(step/3)*100}%` }} />
        </div>
      </div>

      <div className="flex-1 px-6 py-6 max-w-md mx-auto w-full">
        {step === 1 && (
          <>
            <div className="mb-6">
              <h1 className="font-serif font-bold text-xl mb-2">지금 어떤 시기를 보내고 있나요?</h1>
              <p className="text-sm text-brand-sub leading-relaxed">우리 가정과 비슷한 단계의 이야기를 추천해드릴게요.</p>
            </div>
            <div className="space-y-2">
              {STATUSES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-colors ${
                    status === s.id ? 'border-brand-green bg-brand-green-light' : 'border-brand-line bg-white'
                  }`}
                >
                  <div className="text-2xl">{s.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{s.label}</div>
                    <div className="text-[11px] text-brand-muted mt-0.5">{s.desc}</div>
                  </div>
                  {status === s.id && (
                    <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="mb-6">
              <h1 className="font-serif font-bold text-xl mb-2">어떤 이야기에 관심 있으세요?</h1>
              <p className="text-sm text-brand-sub leading-relaxed">여러 개 선택할 수 있어요. 피드 추천에 사용돼요.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {INTERESTS.map(i => {
                const selected = interests.includes(i)
                return (
                  <button
                    key={i}
                    onClick={() => setInterests(prev => selected ? prev.filter(x => x !== i) : [...prev, i])}
                    className={`p-4 rounded-2xl border-2 text-sm font-medium transition-colors ${
                      selected ? 'border-brand-green bg-brand-green-light text-brand-green-dark' : 'border-brand-line bg-white text-brand-sub'
                    }`}
                  >
                    {i}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="mb-6">
              <h1 className="font-serif font-bold text-xl mb-2">마지막이에요, 어떻게 불러드릴까요?</h1>
              <p className="text-sm text-brand-sub leading-relaxed">가정명 또는 닉네임을 입력해주세요. 나중에 바꿀 수 있어요.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-brand-muted mb-1.5 block">가정명 / 닉네임</label>
                <input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="예: 성호·유라 가정"
                  className="w-full px-4 py-3 bg-white border border-brand-line rounded-xl text-sm outline-none focus:border-brand-green"
                />
              </div>
            </div>
            <div className="mt-6 p-4 bg-brand-card rounded-2xl">
              <p className="text-xs text-brand-sub leading-relaxed">
                가입 시 패밀로그 <Link href="#" className="underline">이용약관</Link>과 <Link href="#" className="underline">개인정보 처리방침</Link>에 동의하게 됩니다.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="px-6 pb-8 max-w-md mx-auto w-full">
        <button
          onClick={handleNext}
          disabled={!canProceed || loading}
          className={`w-full py-3.5 rounded-2xl font-medium text-sm ${
            canProceed ? 'bg-brand-green text-white' : 'bg-brand-card text-brand-muted'
          }`}
        >
          {loading ? '저장 중...' : step < 3 ? '다음' : '시작하기'}
        </button>
      </div>
    </div>
  )
}