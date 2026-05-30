'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, Lock, X } from 'lucide-react'
import {
  BADGES, getAchievedStage, getBadgeValue, getBadgeFirstDate, getStoryText,
  fetchGrowthStats, type BadgeDef, type GrowthStats,
} from '@/lib/growth'

// ── 뱃지 상세 시트 ─────────────────────────────────────────────────────────────
interface SheetState { badge: BadgeDef; achievedStage: number; value: number; firstDate: string | null }

function BadgeSheet({ state, nickname, onClose }: { state: SheetState; nickname: string; onClose: () => void }) {
  const [show, setShow] = useState(false)
  const touchY = useRef(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleClose = () => {
    setShow(false)
    setTimeout(onClose, 300)
  }

  const { badge, achievedStage, value, firstDate } = state
  const achieved = achievedStage >= 0 && !badge.stub

  const renderContent = () => (
    <>
      <div className="text-center mb-5">
        <span className={`text-5xl leading-none ${!achieved ? 'grayscale opacity-40' : ''}`}>{badge.emoji}</span>
        <h3 className="text-base font-bold mt-2">{badge.name}</h3>
        {achieved && (
          <span className="inline-block mt-1.5 text-xs px-3 py-0.5 bg-brand-green-light text-brand-green rounded-full font-medium">
            {badge.stages[achievedStage].label}
          </span>
        )}
      </div>
      {badge.stub ? (
        <p className="text-sm text-brand-muted text-center">아직 준비 중인 뱃지예요. 곧 만나요! 👋</p>
      ) : achieved ? (
        <p className="text-sm text-brand-sub text-center leading-relaxed whitespace-pre-line">
          {getStoryText(badge, value, firstDate, nickname)}
        </p>
      ) : (
        <div className="text-center">
          <p className="text-sm text-brand-muted mb-2">아직 달성하지 못했어요.</p>
          <p className="text-sm text-brand-sub">
            다음 목표: <span className="font-medium text-brand-text">{badge.stages[0].label}</span>
          </p>
          <p className="text-xs text-brand-muted mt-0.5">{badge.stages[0].desc}</p>
        </div>
      )}
      {!badge.stub && (
        <div className="flex justify-center gap-6 mt-6">
          {badge.stages.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full border-2 ${i <= achievedStage ? 'bg-brand-green border-brand-green' : 'bg-white border-brand-line'}`} />
              <span className="text-[10px] text-brand-muted">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      {/* 모바일: 하단 시트 */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl
          transition-transform duration-300 ease-out ${show ? 'translate-y-0' : 'translate-y-full'}`}
        onTouchStart={e => { touchY.current = e.touches[0].clientY }}
        onTouchEnd={e => { if (e.changedTouches[0].clientY - touchY.current > 80) handleClose() }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-brand-line rounded-full" />
        </div>
        <div className="px-6 pb-10">{renderContent()}</div>
      </div>
      {/* 데스크탑: 중앙 모달 */}
      <div
        className={`hidden lg:flex fixed top-0 right-0 bottom-0 left-64 z-50 items-center justify-center px-4
          transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      >
        <div
          className={`relative bg-white rounded-2xl shadow-xl max-w-md w-full px-6 pt-6 pb-8
            transition-all duration-300 ease-out ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
          onClick={e => e.stopPropagation()}
        >
          <button type="button" onClick={handleClose}
            className="absolute top-3 right-4 p-1 text-brand-muted hover:text-brand-text transition-colors">
            <X size={18} />
          </button>
          {renderContent()}
        </div>
      </div>
    </>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function BadgesPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [badgeData, setBadgeData] = useState<GrowthStats | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [sheet,     setSheet]     = useState<SheetState | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      try { setBadgeData(await fetchGrowthStats(user.id, session.access_token)) }
      catch { setBadgeData(null) }
      finally { setLoading(false) }
    })
  }, [authLoading, user])

  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-brand-line">
          <div className="w-6 h-6 bg-brand-card rounded animate-pulse" />
          <div className="w-20 h-4 bg-brand-card rounded animate-pulse" />
        </div>
        <div className="px-4 py-5 grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-28 bg-brand-card rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!user) return <div className="flex items-center justify-center py-24 text-brand-muted text-sm">로그인이 필요해요</div>

  // 달성 뱃지 수 집계
  const achievedCount = badgeData
    ? BADGES.filter(b => !b.stub && getAchievedStage(getBadgeValue(b.id, badgeData), b.stages) >= 0).length
    : 0

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6 bg-brand-bg min-h-screen">

      {/* 상단 헤더 */}
      <div className="flex items-center gap-1 px-4 py-4 border-b border-brand-line bg-white sticky top-0 z-10">
        <button type="button" onClick={() => router.back()} className="p-1.5 -ml-1.5 text-brand-sub">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-base font-bold text-brand-text">내 뱃지</h1>
        <span className="ml-1.5 text-sm text-brand-muted">{achievedCount} / {BADGES.length}</span>
      </div>

      {/* 뱃지 그리드 */}
      <div className="px-4 py-5 grid grid-cols-3 gap-3">
        {BADGES.map(badge => {
          const value         = badgeData ? getBadgeValue(badge.id, badgeData) : 0
          const firstDate     = badgeData ? getBadgeFirstDate(badge.id, badgeData) : null
          const achievedStage = badge.stub ? -1 : getAchievedStage(value, badge.stages)
          const achieved      = achievedStage >= 0

          return (
            <button key={badge.id} type="button"
              onClick={() => setSheet({ badge, achievedStage, value, firstDate })}
              className="relative rounded-2xl border border-brand-line bg-white p-4 flex flex-col items-center gap-2 text-center active:scale-95 transition-transform"
            >
              {/* 달성 뱃지는 테두리만 brand-green으로 구분 */}
              {achieved && !badge.stub && (
                <div className="absolute inset-0 rounded-2xl border-2 border-brand-green pointer-events-none" />
              )}
              <span className={`text-3xl leading-none ${(!achieved || badge.stub) ? 'grayscale opacity-40' : ''}`}>
                {badge.emoji}
              </span>
              <div>
                <p className={`text-[12px] font-semibold leading-tight ${achieved && !badge.stub ? 'text-brand-text' : 'text-brand-muted'}`}>
                  {badge.name}
                </p>
                <p className={`text-[11px] leading-tight mt-0.5 ${achieved && !badge.stub ? 'text-brand-green' : 'text-brand-muted'}`}>
                  {badge.stub ? '준비 중' : achieved ? badge.stages[achievedStage].label : '미달성'}
                </p>
              </div>
              {badge.stub && <Lock size={10} className="absolute top-2 right-2 text-brand-muted opacity-60" />}
            </button>
          )
        })}
      </div>

      {/* 뱃지 상세 시트 */}
      {sheet && <BadgeSheet state={sheet} nickname={user.nickname} onClose={() => setSheet(null)} />}
    </div>
  )
}
