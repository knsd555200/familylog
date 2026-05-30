'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  BADGES, getBadgeValue, getAchievedStage, getNudgeText,
  fetchGrowthStats, type GrowthStats, type BadgeDef,
} from '@/lib/growth'
import { addMerit } from '@/lib/api/merits'

// ── 봉사 기록 시트 ───────────────────────────────────────────────────────────
function RecordSheet({ kind, userId, onClose, onSuccess }: {
  kind: 'volunteer' | 'donation'
  userId: string
  onClose: () => void
  onSuccess: () => void
}) {
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
    if (submitting) return
    let ok = false
    if (kind === 'volunteer') {
      const h = parseFloat(hours)
      if (!h || h <= 0) return
      setSubmitting(true)
      ok = await addMerit({ userId, meritType: 'volunteer_activity', category: 'volunteer', points: Math.round(h * 5), rawValue: h })
    } else {
      setSubmitting(true)
      ok = await addMerit({ userId, meritType: 'donation', category: 'donation', points: 15 })
    }
    setSubmitting(false)
    if (ok) { onSuccess(); handleClose() }
    else alert('기록에 실패했어요. 다시 시도해주세요.')
  }

  const h = parseFloat(hours)
  const renderContent = () => (
    <>
      <h3 className="text-base font-bold mb-1 text-center">{kind === 'volunteer' ? '봉사 시간 기록' : '후원 기록'}</h3>
      <p className="text-xs text-brand-muted text-center mb-5">
        {kind === 'volunteer'
          ? '봉사한 시간을 기록하면 발자취에 남아요'
          : <>나눔을 실천한 마음이 발자취로 남아요<br />후원 1회 +15P 적립</>}
      </p>
      {kind === 'volunteer' && (
        <div className="mb-3">
          <label className="text-sm font-medium text-brand-text mb-1.5 block">봉사 시간 (시간 단위)</label>
          <input
            type="number" min="0.5" step="0.5" value={hours}
            onChange={e => setHours(e.target.value)} placeholder="예: 2"
            className="w-full border border-brand-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-green"
          />
          {h > 0 && <p className="text-xs text-brand-muted mt-1.5">{Math.round(h * 5)}P 적립 예정</p>}
        </div>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || (kind === 'volunteer' && (!h || h <= 0))}
        className="w-full py-3 rounded-full bg-brand-green text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
      >
        {submitting ? '기록 중...' : '기록하기'}
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

// ── 도전 과제 한 장 ───────────────────────────────────────────────────────────
function ChallengeCard({ badge, stats }: { badge: BadgeDef; stats: GrowthStats }) {
  const value       = getBadgeValue(badge.id, stats)
  const achievedIdx = getAchievedStage(value, badge.stages)
  const nextStage   = achievedIdx + 1 < badge.stages.length ? badge.stages[achievedIdx + 1] : null
  const cleared     = !nextStage

  const prevThreshold = achievedIdx >= 0 ? badge.stages[achievedIdx].threshold : 0
  const progress = nextStage
    ? Math.min(100, Math.max(0, ((value - prevThreshold) / (nextStage.threshold - prevThreshold)) * 100))
    : 100
  const stageName = achievedIdx >= 0 ? badge.stages[achievedIdx].label : '도전 전'

  return (
    <div className={`rounded-2xl border px-4 py-4 ${cleared ? 'bg-brand-green-light/50 border-brand-green/20' : 'bg-white border-brand-line'}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl leading-none flex-shrink-0">{badge.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-brand-text">{badge.name}</p>
            <span className="text-[11px] text-brand-muted flex-shrink-0">{cleared ? '완료' : stageName}</span>
          </div>
          {nextStage ? (
            <>
              <div className="mt-2 w-full bg-brand-card rounded-full h-1.5">
                <div className="bg-brand-green h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[11px] text-brand-sub mt-1.5 leading-snug">
                {getNudgeText(badge.id, nextStage.label, nextStage.threshold - value)}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-brand-green mt-1.5">모든 단계를 피워냈어요 🎉</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
export default function MissionChallengePage() {
  const { user, isLoading: authLoading } = useAuth()
  const [stats,   setStats]   = useState<GrowthStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sheet,   setSheet]   = useState<'volunteer' | 'donation' | null>(null)

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

  if (authLoading || loading) {
    return <div className="flex items-center justify-center py-24 text-brand-muted text-sm">불러오는 중...</div>
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center text-center py-24 px-8">
        <span className="text-4xl mb-4">🏅</span>
        <p className="font-serif text-lg text-brand-text mb-1.5">장기 도전 과제</p>
        <p className="text-sm text-brand-muted leading-relaxed mb-5">로그인하면 우리 가족이<br />차근차근 피워낼 목표를 보여드려요.</p>
        <Link href="/login" className="px-5 py-2.5 rounded-full bg-brand-green text-white text-sm font-semibold">로그인</Link>
      </div>
    )
  }

  const active = BADGES.filter(b => !b.stub)
  const upcoming = BADGES.filter(b => b.stub)

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6 bg-brand-bg min-h-screen">
      {/* 상단 제목 (데스크탑) */}
      <div className="px-5 pt-5 pb-1">
        <h1 className="font-serif text-2xl font-bold text-brand-text">도전 과제</h1>
        <p className="text-sm text-brand-muted mt-1">한 주를 넘어, 차근차근 피워낼 목표들</p>
      </div>

      <div className="px-4 lg:px-6 py-5 space-y-6">

        {/* 손으로 남기기 (봉사·후원) */}
        <section>
          <h2 className="text-sm font-semibold text-brand-text mb-2.5 px-1">손으로 남기기</h2>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setSheet('volunteer')}
              className="w-full flex items-center gap-3 bg-white rounded-2xl border border-brand-line px-4 py-3.5 hover:bg-brand-card transition-colors text-left"
            >
              <span className="text-xl leading-none flex-shrink-0">🤝</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-text">봉사 시간 기록하기</p>
                <p className="text-xs text-brand-muted mt-0.5">봉사한 시간만큼 발자국이 남아요 · 시간당 5P</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSheet('donation')}
              className="w-full flex items-center gap-3 bg-white rounded-2xl border border-brand-line px-4 py-3.5 hover:bg-brand-card transition-colors text-left"
            >
              <span className="text-xl leading-none flex-shrink-0">💝</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-text">후원 기록하기</p>
                <p className="text-xs text-brand-muted mt-0.5">나눔을 실천한 마음도 발자국이 돼요 · 1회 +15P</p>
              </div>
            </button>
          </div>
        </section>

        {/* 진행 중인 도전 */}
        <section>
          <h2 className="text-sm font-semibold text-brand-text mb-2.5 px-1">도전 중</h2>
          <div className="space-y-2">
            {stats && active.map(b => <ChallengeCard key={b.id} badge={b} stats={stats} />)}
          </div>
          <Link href="/mypage/badges" className="block text-center text-xs text-brand-muted mt-3 hover:text-brand-text transition-colors">
            뱃지 전체와 단계 기준 보기 →
          </Link>
        </section>

        {/* 준비 중인 도전 */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-brand-text mb-2.5 px-1">곧 열릴 도전</h2>
            <div className="grid grid-cols-2 gap-2">
              {upcoming.map(b => (
                <div key={b.id} className="flex items-center gap-2.5 bg-brand-card rounded-2xl px-3.5 py-3 opacity-70">
                  <span className="text-xl leading-none flex-shrink-0">{b.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-sub truncate">{b.name}</p>
                    <p className="text-[10px] text-brand-muted">준비 중</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 마음이 쌓이는 규칙 */}
        <PointRules />
      </div>

      {sheet && (
        <RecordSheet
          kind={sheet}
          userId={user.id}
          onClose={() => setSheet(null)}
          onSuccess={loadStats}
        />
      )}
    </div>
  )
}
