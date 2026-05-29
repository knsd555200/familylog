'use client'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Users, Clock, Star } from 'lucide-react'

// ── 샘플 더미 데이터 ──────────────────────────────────────────────────────────
const SAMPLE_MEMBERS = [
  { name: '아빠', contribution: 72, color: 'bg-brand-green' },
  { name: '엄마', contribution: 58, color: 'bg-blue-400' },
  { name: '자녀', contribution: 34, color: 'bg-orange-400' },
]

// ── 토스트 훅 ─────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const show = (msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(msg)
    timerRef.current = setTimeout(() => setToast(null), 2800)
  }

  return { toast, show }
}

// ── 샘플 발자취 카드 (흐릿하게 보일 콘텐츠) ──────────────────────────────────
function SampleContent() {
  const maxContrib = Math.max(...SAMPLE_MEMBERS.map(m => m.contribution))

  return (
    <div className="space-y-3">
      {/* 합산 지표 */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Clock,  label: '함께한 날',  value: '365일' },
          { icon: Star,   label: '합산 포인트', value: '2,400P' },
          { icon: Users,  label: '봉사 시간',   value: '12시간' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-brand-line p-3 text-center">
            <Icon size={16} className="text-brand-green mx-auto mb-1" />
            <p className="text-[10px] text-brand-muted">{label}</p>
            <p className="text-sm font-bold text-brand-text mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* 구성원 기여도 */}
      <div className="bg-white rounded-2xl border border-brand-line p-4">
        <p className="text-xs font-semibold text-brand-text mb-3">구성원 기여도</p>
        <div className="space-y-2.5">
          {SAMPLE_MEMBERS.map(m => (
            <div key={m.name} className="flex items-center gap-2">
              <span className="text-xs text-brand-sub w-6 flex-shrink-0">{m.name}</span>
              <div className="flex-1 h-2 bg-brand-card rounded-full overflow-hidden">
                <div
                  className={`h-full ${m.color} rounded-full`}
                  style={{ width: `${(m.contribution / maxContrib) * 100}%` }}
                />
              </div>
              <span className="text-xs text-brand-muted w-6 text-right flex-shrink-0">{m.contribution}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function MypageFamilyPage() {
  const { user, isLoading } = useAuth()
  const { toast, show: showToast } = useToast()

  if (isLoading) {
    return (
      <div className="px-4 lg:px-6 py-5 space-y-3 animate-pulse">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(n => <div key={n} className="h-20 bg-brand-card rounded-2xl" />)}
        </div>
        <div className="h-32 bg-brand-card rounded-2xl" />
      </div>
    )
  }

  // 가족 연동 시: 추후 실제 데이터 연결
  if (user?.family_id) {
    return (
      <div className="flex items-center justify-center py-24 text-brand-muted text-sm">
        가족 피드를 준비 중이에요.
      </div>
    )
  }

  // 미연동 상태
  return (
    <div className="px-4 lg:px-6 py-5">
      {/* 샘플 데이터 (흐릿) + 오버레이 */}
      <div className="relative">
        <div className="opacity-40 pointer-events-none select-none">
          <SampleContent />
        </div>

        {/* 오버레이 안내 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-5 text-center shadow-sm w-full max-w-xs">
            <div className="w-12 h-12 rounded-full bg-brand-green-light flex items-center justify-center mx-auto mb-3">
              <Users size={22} className="text-brand-green" />
            </div>
            <p className="text-sm font-semibold text-brand-text leading-snug mb-1">
              가족을 연결하면
            </p>
            <p className="text-sm text-brand-sub leading-snug mb-4">
              우리 가족의 여정이 여기 쌓여요
            </p>
            <button
              onClick={() => showToast('준비 중이에요')}
              className="w-full py-2.5 bg-brand-green text-white text-sm font-medium rounded-full"
            >
              연결하기
            </button>
          </div>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-brand-text text-white text-sm px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
