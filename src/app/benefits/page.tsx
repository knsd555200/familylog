'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { X, Check, ChevronRight, ArrowRight, Sparkles } from 'lucide-react'
import {
  TIER_CONFIG, getTierProgress,
  getWeeklyMissions, fetchGrowthStats,
  type GrowthStats, type WeeklyMission,
} from '@/lib/growth'
import { addMerit } from '@/lib/api/merits'
import { getEventPosts } from '@/lib/api/events'

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

// ── 미션 한 줄 (링크로 이동하거나 기록 시트를 연다) ────────────────────────────
function MissionRow({ m, onVolunteer, onDonation }: {
  m: WeeklyMission
  onVolunteer: () => void
  onDonation: () => void
}) {
  const inner = (
    <>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${m.done ? 'bg-brand-green' : 'bg-brand-card'}`}>
        {m.done ? <Check size={18} className="text-white" strokeWidth={3} /> : m.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${m.done ? 'text-brand-muted line-through' : 'text-brand-text'}`}>{m.title}</p>
        {!m.done && m.target > 1 ? (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 bg-brand-card rounded-full overflow-hidden">
              <div className="h-1 bg-brand-green rounded-full transition-all" style={{ width: `${Math.min(100, (m.value / m.target) * 100)}%` }} />
            </div>
            <span className="text-[10px] text-brand-muted flex-shrink-0">{m.value}/{m.target}</span>
          </div>
        ) : !m.done && m.hint ? (
          <p className="text-[11px] text-brand-muted mt-0.5 leading-snug">{m.hint}</p>
        ) : null}
      </div>
      <span className={`text-xs font-medium flex-shrink-0 ${m.done ? 'text-brand-muted' : 'text-brand-green'}`}>{m.reward}</span>
      {!m.done && <ChevronRight size={15} className="text-brand-muted flex-shrink-0" />}
    </>
  )
  const cls = `w-full flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${m.done ? 'bg-brand-green-light/50 border-brand-green/20' : 'bg-white border-brand-line hover:bg-brand-card'}`
  if (m.action.type === 'link') {
    return <Link href={m.action.href} className={cls}>{inner}</Link>
  }
  const sheet = m.action.sheet
  return (
    <button type="button" onClick={() => (sheet === 'volunteer' ? onVolunteer() : onDonation())} className={cls}>
      {inner}
    </button>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function BenefitsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [stats,      setStats]      = useState<GrowthStats | null>(null)
  const [postImage,  setPostImage]  = useState<string | null>(null)
  const [eventImage, setEventImage] = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [showTier,   setShowTier]   = useState(false)
  const [showVol,    setShowVol]    = useState(false)
  const [showDon,    setShowDon]    = useState(false)

  const loadStats = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !user) return
    try { setStats(await fetchGrowthStats(user.id, session.access_token)) }
    catch { setStats(null) }
    // 배너 커버용 — 사진이 있는 최신 공개 게시글 1개
    try {
      const { data } = await supabase
        .from('posts')
        .select('media_urls')
        .is('deleted_at', null)
        .neq('visibility', 'family')
        .not('media_urls', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
      const url = (data?.[0] as any)?.media_urls?.[0]
      if (url) setPostImage(url)
    } catch { /* ignore */ }
    // 배너 커버용 — 다가오는 공식 행사 이미지 1개
    try {
      const e = (await getEventPosts())[0] as any
      if (e?.thumbnail_url) setEventImage(e.thumbnail_url)
    } catch { /* ignore */ }
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
        <p className="font-serif text-lg text-brand-text mb-1.5">이번 주, 우리 가족의 미션</p>
        <p className="text-sm text-brand-muted leading-relaxed mb-5">로그인하면 오늘 우리 가족이<br />뗄 수 있는 한 걸음을 알려드려요.</p>
        <Link href="/login" className="px-5 py-2.5 rounded-full bg-brand-green text-white text-sm font-semibold">
          로그인
        </Link>
      </div>
    )
  }

  // ── 파생 데이터 ──────────────────────────────────────────────────────────
  const tier = getTierProgress(user.points)

  const todayDow  = new Date().getDay()
  const todayIdx  = todayDow === 0 ? 6 : todayDow - 1
  const weekDays  = stats?.weekDays ?? [false, false, false, false, false, false, false]
  const activeCnt = weekDays.filter(Boolean).length

  const missions   = stats ? getWeeklyMissions(stats) : []
  const doneCnt    = missions.filter(m => m.done).length
  const allDone    = missions.length > 0 && doneCnt === missions.length
  const heroBanner = missions.find(m => !m.done) ?? null

  // 히어로 커버: event 미션 → 행사 이미지, write/comment 미션 → 최신 사진 게시글
  const heroCover = heroBanner
    ? heroBanner.id === 'event' && eventImage
      ? { src: eventImage, href: '/events' }
      : (heroBanner.id === 'write' || heroBanner.id === 'comment') && postImage
      ? { src: postImage, href: '/community' }
      : null
    : null

  const streakStr = (stats?.streakWeeks ?? 0) >= 1 ? `🔥 ${stats!.streakWeeks}주 연속` : null
  const weekLabels = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6 bg-brand-bg min-h-screen">

      {/* 상단 제목 + 한 줄 동기 */}
      <div className="px-5 pt-5 pb-1">
        <h1 className="font-serif text-2xl font-bold text-brand-text">미션</h1>
        <p className="text-sm text-brand-muted mt-1">
          이번 주, 우리 가족의 한 걸음
          {streakStr && <span className="text-brand-green font-medium"> · {streakStr}</span>}
        </p>
      </div>

      <div className="px-4 lg:px-6 py-5 space-y-6">

        {/* ── ① 이번 주 다음 미션 (히어로 배너) ──────────────────────────── */}
        <section>
          {loading ? (
            <div className="h-44 bg-brand-card rounded-3xl animate-pulse" />
          ) : allDone ? (
            <div className="bg-white rounded-3xl border border-brand-line px-6 py-10 text-center">
              <span className="text-4xl leading-none">🎉</span>
              <p className="font-serif text-lg text-brand-text mt-4 leading-snug">이번 주 미션을 모두 마쳤어요</p>
              <Link href="/community" className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-brand-green">
                오늘의 피드 둘러보기 <ArrowRight size={15} />
              </Link>
            </div>
          ) : heroBanner ? (
            <div className="bg-white rounded-3xl border border-brand-line overflow-hidden">
              {/* 커버 이미지 — 있을 때만 */}
              {heroCover && (
                <Link href={heroCover.href} className="block h-36 relative">
                  <img src={heroCover.src} alt="" className="w-full h-full object-cover" />
                </Link>
              )}
              <div className="p-6">
                <p className="text-xs font-medium text-brand-green mb-2.5">오늘의 한 걸음</p>
                <div className="flex items-start gap-2.5">
                  {!heroCover && <span className="text-2xl leading-none flex-shrink-0">{heroBanner.emoji}</span>}
                  <p className="flex-1 font-serif text-xl leading-snug text-brand-text">{heroBanner.title}</p>
                </div>
                {heroBanner.hint && <p className="text-sm text-brand-sub mt-2">{heroBanner.hint}</p>}
                {heroBanner.target > 1 && (
                  <div className="mt-3 flex items-center gap-2.5">
                    <div className="flex-1 h-1.5 bg-brand-card rounded-full overflow-hidden">
                      <div className="h-1.5 bg-brand-green rounded-full transition-all" style={{ width: `${Math.min(100, (heroBanner.value / heroBanner.target) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-brand-muted flex-shrink-0">{heroBanner.value}/{heroBanner.target}</span>
                  </div>
                )}
                <div className="mt-5 flex items-center justify-between">
                  {heroBanner.action.type === 'link' ? (
                    <Link href={heroBanner.action.href} className="inline-flex items-center gap-1.5 pl-5 pr-4 py-2.5 rounded-full bg-brand-green text-white text-sm font-semibold hover:bg-brand-green-dark transition-colors">
                      {heroBanner.cta} <ArrowRight size={15} />
                    </Link>
                  ) : (
                    <button type="button" onClick={() => { if (heroBanner.action.type === 'sheet') { heroBanner.action.sheet === 'volunteer' ? setShowVol(true) : setShowDon(true) } }} className="inline-flex items-center gap-1.5 pl-5 pr-4 py-2.5 rounded-full bg-brand-green text-white text-sm font-semibold hover:bg-brand-green-dark transition-colors">
                      {heroBanner.cta} <ArrowRight size={15} />
                    </button>
                  )}
                  <span className="text-sm font-semibold text-brand-green">{heroBanner.reward}</span>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* ── ② 이번 주 미션 (행동 목록) ─────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h2 className="text-sm font-semibold text-brand-text flex items-center gap-1.5">
              <Sparkles size={15} className="text-brand-green" /> 이번 주 미션
            </h2>
            {!loading && <span className="text-xs text-brand-muted">{doneCnt}/{missions.length} 완료</span>}
          </div>
          {loading ? (
            <div className="space-y-2">
              <div className="h-14 bg-brand-card rounded-2xl animate-pulse" />
              <div className="h-14 bg-brand-card rounded-2xl animate-pulse" />
              <div className="h-14 bg-brand-card rounded-2xl animate-pulse" />
            </div>
          ) : (
            <>
              <div className="w-full bg-brand-card rounded-full h-1.5 mb-3">
                <div
                  className="bg-brand-green h-1.5 rounded-full transition-all"
                  style={{ width: `${missions.length ? (doneCnt / missions.length) * 100 : 0}%` }}
                />
              </div>
              <div className="space-y-2">
                {missions.map(m => (
                  <MissionRow
                    key={m.id}
                    m={m}
                    onVolunteer={() => setShowVol(true)}
                    onDonation={() => setShowDon(true)}
                  />
                ))}
              </div>
            </>
          )}
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
            <p className="mt-3.5 text-center text-xs text-brand-sub">
              {activeCnt === 0 ? '이번 주, 아직 첫 발자국 전이에요' : `이번 주 ${activeCnt}일 함께했어요`}
            </p>
          </div>
        </section>

        {/* ── ④ 보상으로 가는 길 (티어 + 사용처) ──────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-brand-text mb-2.5 px-1">보상으로 가는 길</h2>
          <button
            type="button"
            onClick={() => setShowTier(true)}
            className="w-full bg-white rounded-2xl border border-brand-line px-4 py-4 text-left hover:bg-brand-card transition-colors"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-medium text-brand-text">{tier.currentLabel} 단계</span>
              <span className="flex items-center text-[11px] text-brand-muted">
                {tier.nextLabel ? `다음 ${tier.nextLabel}` : '최고 단계'} <ChevronRight size={13} />
              </span>
            </div>
            <div className="w-full bg-brand-card rounded-full h-2">
              <div className="bg-brand-green h-2 rounded-full transition-all" style={{ width: `${tier.progress}%` }} />
            </div>
            <p className="text-[11px] text-brand-muted mt-2">
              {tier.nextLabel
                ? <>{tier.remaining.toLocaleString()}P 더 모으면 다음 계절로 자라나요</>
                : <>가장 높은 계절에 닿았어요 🎉</>}
            </p>
          </button>
          <Link
            href="/store"
            className="mt-2 flex items-center gap-3 bg-white rounded-2xl border border-brand-line px-4 py-3.5 hover:bg-brand-card transition-colors"
          >
            <span className="text-xl leading-none flex-shrink-0">🎁</span>
            <span className="flex-1 text-sm font-medium text-brand-text">모은 마음, 어디에 쓸까요?</span>
            <ChevronRight size={16} className="text-brand-muted flex-shrink-0" />
          </Link>
        </section>

        {/* ── ⑤ 더 깊이 (장기 도전 / 발자취) ──────────────────────────────── */}
        <section className="space-y-2 pt-1">
          <Link
            href="/benefits/missions"
            className="flex items-center gap-3 bg-white rounded-2xl border border-brand-line px-4 py-3.5 hover:bg-brand-card transition-colors"
          >
            <span className="text-xl leading-none flex-shrink-0">🏅</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-text">장기 도전 과제</p>
              <p className="text-xs text-brand-muted mt-0.5">한 주를 넘어, 차근차근 피워낼 목표들</p>
            </div>
            <ChevronRight size={16} className="text-brand-muted flex-shrink-0" />
          </Link>
          <Link
            href="/mypage"
            className="flex items-center gap-3 bg-white rounded-2xl border border-brand-line px-4 py-3.5 hover:bg-brand-card transition-colors"
          >
            <span className="text-xl leading-none flex-shrink-0">🌳</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-text">성장 발자취 돌아보기</p>
              <p className="text-xs text-brand-muted mt-0.5">우리 가족이 걸어온 길</p>
            </div>
            <ChevronRight size={16} className="text-brand-muted flex-shrink-0" />
          </Link>
        </section>
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
