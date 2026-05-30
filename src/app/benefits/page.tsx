'use client'
import { useState, useEffect, useRef, Fragment } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { X, Check, ChevronRight, ChevronDown, ArrowRight } from 'lucide-react'
import {
  TIER_CONFIG, getTierProgress, BADGES, getAchievedStage, getBadgeValue,
  getNudgeText, getTodayStep, fetchGrowthStats, type GrowthStats,
} from '@/lib/growth'
import { addMerit } from '@/lib/api/merits'

// ── 티어 상세 시트 ───────────────────────────────────────────────────────────
function TierSheet({ currentPoints, onClose }: { currentPoints: number; onClose: () => void }) {
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

  const currentIdx = TIER_CONFIG.reduce<number>((b, t, i) => (currentPoints >= t.threshold ? i : b), 0)

  const renderContent = () => (
    <>
      <h3 className="text-base font-bold mb-4 text-center">티어 기준</h3>
      <div className="space-y-2">
        {TIER_CONFIG.map((t, i) => {
          const isActive = i === currentIdx
          return (
            <div
              key={t.label}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive ? 'bg-brand-green' : 'bg-brand-card'
              }`}
            >
              <span className="text-xl leading-none w-7 text-center flex-shrink-0">{t.label.split(' ')[0]}</span>
              <span className={`flex-1 text-sm font-medium ${isActive ? 'text-white' : 'text-brand-text'}`}>
                {t.label}
              </span>
              <span className={`text-xs flex-shrink-0 ${isActive ? 'text-white/80' : 'text-brand-muted'}`}>
                {t.threshold.toLocaleString()}P~
              </span>
              {isActive && <Check size={15} className="text-white flex-shrink-0" strokeWidth={2.5} />}
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-center text-[11px] text-brand-muted">
        현재 {currentPoints.toLocaleString()}P 보유
      </p>
    </>
  )

  return (
    <>
      {/* 딤 배경 */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* 모바일: 하단 슬라이드 시트 */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl
          transition-transform duration-300 ease-out
          ${show ? 'translate-y-0' : 'translate-y-full'}`}
        onTouchStart={e => { touchY.current = e.touches[0].clientY }}
        onTouchEnd={e => { if (e.changedTouches[0].clientY - touchY.current > 80) handleClose() }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-brand-line rounded-full" />
        </div>
        <div className="px-6 pb-10">
          {renderContent()}
        </div>
      </div>

      {/* 데스크탑: 중앙 모달 */}
      <div
        className={`hidden lg:flex fixed top-0 right-0 bottom-0 left-64 z-50 items-center justify-center px-4
          transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      >
        <div
          className={`relative bg-white rounded-2xl shadow-xl max-w-md w-full px-6 pt-6 pb-8
            transition-all duration-300 ease-out
            ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
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

// ── 봉사 기록 시트 ───────────────────────────────────────────────────────────
function VolunteerSheet({ userId, onClose, onSuccess }: { userId: string; onClose: () => void; onSuccess: () => void }) {
  const [show, setShow] = useState(false)
  const [hours, setHours] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const touchY = useRef(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleClose = () => { setShow(false); setTimeout(onClose, 300) }

  const handleSubmit = async () => {
    const h = parseFloat(hours)
    if (!h || h <= 0) return
    setSubmitting(true)
    try {
      const ok = await addMerit({
        userId,
        meritType: 'volunteer_activity',
        category: 'volunteer',
        points: Math.round(h * 5),
        rawValue: h,
      })
      if (ok) { onSuccess(); handleClose() }
      else alert('기록에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const h = parseFloat(hours)
  const renderContent = () => (
    <>
      <h3 className="text-base font-bold mb-1 text-center">봉사 시간 기록</h3>
      <p className="text-xs text-brand-muted text-center mb-5">봉사한 시간을 기록하면 발자취에 남아요</p>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-brand-text mb-1.5 block">봉사 시간 (시간 단위)</label>
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={hours}
            onChange={e => setHours(e.target.value)}
            placeholder="예: 2"
            className="w-full border border-brand-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-green"
          />
          {h > 0 && (
            <p className="text-xs text-brand-muted mt-1.5">{Math.round(h * 5)}P 적립 예정</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !h || h <= 0}
          className="w-full py-3 rounded-full bg-brand-green text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
        >
          {submitting ? '기록 중...' : '기록하기'}
        </button>
      </div>
    </>
  )

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose} />
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ease-out ${show ? 'translate-y-0' : 'translate-y-full'}`}
        onTouchStart={e => { touchY.current = e.touches[0].clientY }}
        onTouchEnd={e => { if (e.changedTouches[0].clientY - touchY.current > 80) handleClose() }}
      >
        <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-brand-line rounded-full" /></div>
        <div className="px-6 pb-10">{renderContent()}</div>
      </div>
      <div className={`hidden lg:flex fixed top-0 right-0 bottom-0 left-64 z-50 items-center justify-center px-4 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose}>
        <div className={`relative bg-white rounded-2xl shadow-xl max-w-md w-full px-6 pt-6 pb-8 transition-all duration-300 ease-out ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} onClick={e => e.stopPropagation()}>
          <button type="button" onClick={handleClose} className="absolute top-3 right-4 p-1 text-brand-muted hover:text-brand-text transition-colors"><X size={18} /></button>
          {renderContent()}
        </div>
      </div>
    </>
  )
}

// ── 후원 기록 시트 ───────────────────────────────────────────────────────────
function DonationSheet({ userId, onClose, onSuccess }: { userId: string; onClose: () => void; onSuccess: () => void }) {
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const touchY = useRef(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleClose = () => { setShow(false); setTimeout(onClose, 300) }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const ok = await addMerit({
        userId,
        meritType: 'donation',
        category: 'donation',
        points: 15,
      })
      if (ok) { onSuccess(); handleClose() }
      else alert('기록에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderContent = () => (
    <>
      <h3 className="text-base font-bold mb-1 text-center">후원 기록</h3>
      <p className="text-xs text-brand-muted text-center mb-6">나눔을 실천한 마음이 발자취로 남아요<br />후원 1회 +15P 적립</p>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 rounded-full bg-brand-green text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
      >
        {submitting ? '기록 중...' : '후원 기록하기'}
      </button>
    </>
  )

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose} />
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ease-out ${show ? 'translate-y-0' : 'translate-y-full'}`}
        onTouchStart={e => { touchY.current = e.touches[0].clientY }}
        onTouchEnd={e => { if (e.changedTouches[0].clientY - touchY.current > 80) handleClose() }}
      >
        <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-brand-line rounded-full" /></div>
        <div className="px-6 pb-10">{renderContent()}</div>
      </div>
      <div className={`hidden lg:flex fixed top-0 right-0 bottom-0 left-64 z-50 items-center justify-center px-4 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose}>
        <div className={`relative bg-white rounded-2xl shadow-xl max-w-md w-full px-6 pt-6 pb-8 transition-all duration-300 ease-out ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} onClick={e => e.stopPropagation()}>
          <button type="button" onClick={handleClose} className="absolute top-3 right-4 p-1 text-brand-muted hover:text-brand-text transition-colors"><X size={18} /></button>
          {renderContent()}
        </div>
      </div>
    </>
  )
}

// ── 포인트 적립 규칙 안내 (접이식) ───────────────────────────────────────────
function PointRules() {
  const [open, setOpen] = useState(false)
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-brand-sub flex-shrink-0">{label}</span>
      <span className="text-xs text-brand-text text-right">{value}</span>
    </div>
  )
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between bg-white rounded-2xl border border-brand-line px-4 py-3.5 hover:bg-brand-card transition-colors"
      >
        <span className="text-sm font-medium text-brand-text">마음은 어떻게 쌓이나요?</span>
        <ChevronDown size={18} className={`text-brand-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 bg-white rounded-2xl border border-brand-line px-4 py-4">
          <p className="text-[11px] font-semibold text-brand-green-dark mb-1">쌓일 때</p>
          <div className="divide-y divide-brand-line/60">
            <Row label="이야기 작성" value="전체공개 +10 · 멤버공개 +5 · 가족만 0 (하루 1회)" />
            <Row label="댓글 작성"   value="+5 (하루 3회 · 내 글 제외)" />
            <Row label="공감 받음"   value="+2 (하루 5회)" />
            <Row label="행사 인증"   value="행사마다 정해진 보상" />
            <Row label="봉사 기록"   value="1시간당 +5" />
            <Row label="후원 기록"   value="1회 +15" />
          </div>
          <p className="text-[11px] font-semibold text-brand-green-dark mt-4 mb-1">되돌릴 때</p>
          <div className="divide-y divide-brand-line/60">
            <Row label="직접 삭제·취소" value="24시간 안의 글·댓글·공감은 점수도 함께 돌아가요" />
            <Row label="운영자 정리"     value="운영자가 정리한 글은 점수를 회수하지 않아요" />
          </div>
          <p className="mt-4 text-center text-[11px] text-brand-muted leading-relaxed">
            포인트는 꾸준함이 남긴 흔적일 뿐,<br />자랑하기 위한 점수가 아니에요.
          </p>
        </div>
      )}
    </section>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function BenefitsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [stats,    setStats]    = useState<GrowthStats | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [showTier, setShowTier] = useState(false)
  const [showVol,  setShowVol]  = useState(false)
  const [showDon,  setShowDon]  = useState(false)

  const loadStats = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !user) return
    try { setStats(await fetchGrowthStats(user.id, session.access_token)) }
    catch { setStats(null) }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    loadStats().finally(() => setLoading(false))
  }, [authLoading, user])

  if (authLoading) {
    return <div className="flex items-center justify-center py-24 text-brand-muted text-sm">불러오는 중...</div>
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center text-center py-24 px-8">
        <span className="text-4xl mb-4">🌱</span>
        <p className="font-serif text-lg text-brand-text mb-1.5">오늘의 한 걸음</p>
        <p className="text-sm text-brand-muted leading-relaxed mb-5">로그인하면 오늘 우리 가족이<br />뗄 수 있는 한 걸음을 알려드려요.</p>
        <Link href="/login" className="px-5 py-2.5 rounded-full bg-brand-green text-white text-sm font-semibold">
          로그인
        </Link>
      </div>
    )
  }

  // ── 파생 데이터 ──────────────────────────────────────────────────────────
  const tier = getTierProgress(user.points)
  const currentIdx = TIER_CONFIG.reduce<number>((b, t, i) => (user.points >= t.threshold ? i : b), 0)
  const nextSeason = tier.nextLabel ? tier.nextLabel.split(' ')[1] : null
  const curSeason  = TIER_CONFIG[currentIdx].label.split(' ')[1]

  const todayDow  = new Date().getDay()
  const todayIdx  = todayDow === 0 ? 6 : todayDow - 1
  const weekDays  = stats?.weekDays ?? [false, false, false, false, false, false, false]
  const activeCnt = weekDays.filter(Boolean).length

  const step = getTodayStep({
    postedToday:     stats?.postedToday ?? false,
    postedThisWeek:  stats?.postedThisWeek ?? false,
    weekActiveToday: weekDays[todayIdx] ?? false,
    lifeStage:       user.life_stage,
  })

  // 곧 피어날 것 — 가장 가까운 미완료 뱃지 하나
  const nextGoal = stats
    ? BADGES
        .filter(b => !b.stub)
        .map(b => {
          const value       = getBadgeValue(b.id, stats)
          const achievedIdx = getAchievedStage(value, b.stages)
          const nextIdx     = achievedIdx + 1
          if (nextIdx >= b.stages.length) return null
          const nextStage = b.stages[nextIdx]
          return { badge: b, nextStage, gap: nextStage.threshold - value }
        })
        .filter((x): x is { badge: typeof BADGES[number]; nextStage: { label: string; threshold: number; desc: string }; gap: number } => x !== null)
        .sort((a, b) => a.gap - b.gap)[0] ?? null
    : null

  const rhythmText =
    activeCnt === 0
      ? '이번 주, 아직 첫 발자국 전이에요'
      : `이번 주 ${activeCnt}일 함께했어요${(stats?.streakWeeks ?? 0) >= 1 ? ` · ${stats!.streakWeeks}주 연속 🔥` : ''}`

  const weekLabels = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6 bg-brand-bg min-h-screen">

      {/* 상단 제목 */}
      <div className="px-5 pt-5 pb-1">
        <h1 className="font-serif text-2xl font-bold text-brand-text">미션</h1>
        <p className="text-sm text-brand-muted mt-1">오늘, 우리 가족의 한 걸음</p>
      </div>

      <div className="px-4 lg:px-6 py-5 space-y-6">

        {/* ── ① 오늘의 한 걸음 (히어로) ──────────────────────────────────── */}
        <section>
          {loading ? (
            <div className="h-40 bg-brand-card rounded-2xl animate-pulse" />
          ) : step.done ? (
            <div className="bg-white rounded-2xl border border-brand-line px-5 py-6 text-center">
              <span className="text-3xl leading-none">{step.emoji}</span>
              <p className="font-serif text-lg text-brand-text mt-3 leading-snug">{step.headline}</p>
              <Link href={step.href} className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-brand-green">
                {step.cta} <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="bg-brand-green-light rounded-2xl border border-brand-green/30 px-5 py-6">
              <p className="text-xs font-semibold text-brand-green-dark mb-3">오늘의 한 걸음</p>
              <div className="flex items-start gap-3">
                <span className="text-3xl leading-none flex-shrink-0">{step.emoji}</span>
                <p className="flex-1 font-serif text-lg leading-snug text-brand-text">{step.headline}</p>
              </div>
              <Link
                href={step.href}
                className="mt-5 w-full flex items-center justify-center gap-1.5 py-3 rounded-full bg-brand-green text-white text-sm font-semibold hover:bg-brand-green-dark transition-colors"
              >
                {step.cta} <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </section>

        {/* ── ② 나의 계절 (티어) — 탭하면 단계 기준 ──────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-brand-text mb-2.5 px-1">나의 계절</h2>
          <button
            type="button"
            onClick={() => setShowTier(true)}
            className="w-full bg-white rounded-2xl border border-brand-line px-4 py-5 text-left hover:bg-brand-card transition-colors"
          >
            <div className="flex items-center px-1">
              {TIER_CONFIG.map((t, i) => {
                const emoji    = t.label.split(' ')[0]
                const achieved = i <= currentIdx
                const isCur    = i === currentIdx
                return (
                  <Fragment key={t.label}>
                    {i > 0 && (
                      <div className={`flex-1 h-0.5 mx-0.5 ${i <= currentIdx ? 'bg-brand-green' : 'bg-brand-line'}`} />
                    )}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-all ${
                        isCur
                          ? 'bg-brand-green ring-2 ring-brand-green/30 ring-offset-2 ring-offset-white scale-110'
                          : achieved
                            ? 'bg-brand-green-light'
                            : 'bg-brand-card opacity-50'
                      }`}
                    >
                      {emoji}
                    </div>
                  </Fragment>
                )
              })}
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-brand-sub">
                {nextSeason
                  ? <>지금은 <span className="font-semibold text-brand-text">{curSeason}</span> 단계 · {nextSeason} 계절을 향해 자라는 중</>
                  : <>가장 높은 단계, <span className="font-semibold text-brand-text">{curSeason}</span>에 닿았어요 🎉</>}
              </p>
              <span className="flex items-center text-[11px] text-brand-muted flex-shrink-0">
                기준 <ChevronRight size={13} />
              </span>
            </div>
          </button>
        </section>

        {/* ── ③ 이번 주 리듬 ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-brand-text mb-2.5 px-1">이번 주 리듬</h2>
          <div className="bg-white rounded-2xl border border-brand-line px-4 py-4">
            <div className="flex items-center justify-between">
              {weekLabels.map((d, i) => {
                const active  = weekDays[i]
                const isToday = i === todayIdx
                return (
                  <div key={d} className="flex flex-col items-center gap-1.5">
                    <span className={`text-[10px] ${isToday ? 'font-bold text-brand-green' : 'text-brand-muted'}`}>{d}</span>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                        active ? 'bg-brand-green' : 'bg-brand-card'
                      } ${isToday && !active ? 'ring-2 ring-brand-green/40' : ''}`}
                    >
                      {active && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-3.5 text-center text-xs text-brand-sub">{rhythmText}</p>
          </div>
        </section>

        {/* ── ④ 곧 피어날 것 (다음 목표 하나) ─────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-brand-text mb-2.5 px-1">곧 피어날 것</h2>
          {loading ? (
            <div className="h-16 bg-brand-card rounded-2xl animate-pulse" />
          ) : !nextGoal ? (
            <p className="text-sm text-brand-muted text-center py-6">모든 뱃지를 피워냈어요 🎉</p>
          ) : (
            <Link
              href="/mypage/badges"
              className="flex items-center gap-3 bg-brand-green-light border border-brand-green/30 rounded-2xl px-4 py-4 hover:border-brand-green/50 transition-colors"
            >
              <span className="text-2xl leading-none flex-shrink-0">{nextGoal.badge.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-text leading-snug">{nextGoal.badge.name}</p>
                <p className="text-xs text-brand-sub leading-snug mt-0.5">
                  {getNudgeText(nextGoal.badge.id, nextGoal.nextStage.label, nextGoal.gap)}
                </p>
              </div>
              <ChevronRight size={16} className="text-brand-muted flex-shrink-0" />
            </Link>
          )}
          <Link href="/mypage/badges" className="block text-center text-xs text-brand-muted mt-2.5 hover:text-brand-text transition-colors">
            다른 목표와 뱃지 전체 보기 →
          </Link>
        </section>

        {/* ── ⑤ 손으로 남기기 (봉사·후원) ─────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-brand-text mb-2.5 px-1">손으로 남기기</h2>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowVol(true)}
              className="w-full flex items-center gap-3 bg-white rounded-2xl border border-brand-line px-4 py-3.5 hover:bg-brand-card transition-colors text-left"
            >
              <span className="text-xl leading-none flex-shrink-0">🤝</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-text">봉사 시간 기록하기</p>
                <p className="text-xs text-brand-muted mt-0.5">봉사한 시간만큼 발자국이 남아요 · 시간당 5P</p>
              </div>
              <ChevronRight size={16} className="text-brand-muted flex-shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => setShowDon(true)}
              className="w-full flex items-center gap-3 bg-white rounded-2xl border border-brand-line px-4 py-3.5 hover:bg-brand-card transition-colors text-left"
            >
              <span className="text-xl leading-none flex-shrink-0">💝</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-text">후원 기록하기</p>
                <p className="text-xs text-brand-muted mt-0.5">나눔을 실천한 마음도 발자국이 돼요 · 1회 +15P</p>
              </div>
              <ChevronRight size={16} className="text-brand-muted flex-shrink-0" />
            </button>
          </div>
        </section>

        {/* ── ⑥ 마음이 쌓이는 규칙 (접이식) ───────────────────────────────── */}
        <PointRules />
      </div>

      {/* 티어 상세 시트 */}
      {showTier && <TierSheet currentPoints={user.points} onClose={() => setShowTier(false)} />}

      {/* 봉사 기록 시트 */}
      {showVol && (
        <VolunteerSheet
          userId={user.id}
          onClose={() => setShowVol(false)}
          onSuccess={loadStats}
        />
      )}

      {/* 후원 기록 시트 */}
      {showDon && (
        <DonationSheet
          userId={user.id}
          onClose={() => setShowDon(false)}
          onSuccess={loadStats}
        />
      )}
    </div>
  )
}
