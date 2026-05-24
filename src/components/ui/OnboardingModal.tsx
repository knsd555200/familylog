'use client'
import { useState } from 'react'
import { X, Sparkles, MessageSquare, Heart, Users } from 'lucide-react'

const missions = [
  { icon: Heart, label: '좋아요 누르기', points: 5, color: 'text-pink-500' },
  { icon: MessageSquare, label: '첫 댓글 달기', points: 30, color: 'text-brand-blue' },
  { icon: Users, label: '모임 신청하기', points: 50, color: 'text-brand-green' },
  { icon: Sparkles, label: '첫 게시글 올리기', points: 100, color: 'text-orange-500' },
]

const HIDE_DURATION_MS = 3 * 24 * 60 * 60 * 1000

export default function OnboardingModal({ onClose }: { onClose: () => void }) {
  const handleHideForDays = () => {
    localStorage.setItem('familog_onboarding_hide_until', String(Date.now() + HIDE_DURATION_MS))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end lg:items-center justify-center animate-fade-in">
      <div className="bg-white rounded-t-3xl lg:rounded-3xl w-full lg:max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="relative p-6 pb-4">
          <button onClick={onClose} className="absolute top-4 right-4 p-1 text-brand-muted">
            <X size={22} />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} className="text-brand-green" />
            <span className="text-xs font-medium text-brand-green">환영합니다</span>
          </div>
          <h2 className="font-serif font-bold text-xl mb-2">패밀로그에 오신 것을 환영해요</h2>
          <p className="text-sm text-brand-sub leading-relaxed">
            첫 발걸음을 응원하는 작은 미션을 준비했어요. 부담 없이 하나씩 시작해보세요.
          </p>
        </div>

        <div className="px-6 pb-6 space-y-2.5">
          {missions.map((m, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl border border-brand-line">
              <div className={`w-10 h-10 rounded-xl bg-brand-card flex items-center justify-center ${m.color}`}>
                <m.icon size={20} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-brand-text">{m.label}</div>
                <div className="text-xs text-brand-muted">완료 시 +{m.points}P 적립</div>
              </div>
              <div className="text-xs text-brand-green font-medium">대기 중</div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 space-y-2">
          <button onClick={onClose} className="w-full py-3.5 bg-brand-green text-white rounded-2xl font-medium text-sm">
            지금 시작하기
          </button>
          <button onClick={handleHideForDays} className="w-full py-2.5 text-brand-muted text-xs">
            3일간 안 보이기
          </button>
        </div>
      </div>
    </div>
  )
}
