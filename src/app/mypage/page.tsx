'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Settings, Heart, MessageSquare, Lock, X, Check,
  Users, Clock, Star, LogOut, Pencil,
} from 'lucide-react'

// ── 생애주기 라벨 ────────────────────────────────────────────────────────────
const LIFE_STAGE_LABELS: Record<string, string> = {
  pre_married: '예비부부',
  newlywed:    '신혼부부',
  parenting:   '부모',
  empty_nest:  '황혼부부',
}

// ── 탭 ───────────────────────────────────────────────────────────────────────
const PAGE_TABS = ['발자취', '가족', '활동'] as const
type PageTab = typeof PAGE_TABS[number]

// ── 티어 ─────────────────────────────────────────────────────────────────────
const TIER_CONFIG = [
  { label: '🌱 씨앗', threshold: 0 },
  { label: '🌿 새싹', threshold: 500 },
  { label: '🌸 꽃',   threshold: 1500 },
  { label: '🍎 열매', threshold: 3000 },
  { label: '🏮 등대', threshold: 6000 },
] as const

function getTierProgress(points: number) {
  const idx  = TIER_CONFIG.reduce<number>((b, t, i) => (points >= t.threshold ? i : b), 0)
  const cur  = TIER_CONFIG[idx]
  const next = idx < TIER_CONFIG.length - 1 ? TIER_CONFIG[idx + 1] : null
  if (!next) return { currentLabel: cur.label, nextLabel: null, progress: 100, remaining: 0 }
  const range = next.threshold - cur.threshold
  return {
    currentLabel: cur.label,
    nextLabel:    next.label,
    progress:     Math.min(100, Math.floor(((points - cur.threshold) / range) * 100)),
    remaining:    next.threshold - points,
  }
}

function getDaysElapsed(iso: string | null) {
  if (!iso) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
}

// ── 뱃지 ─────────────────────────────────────────────────────────────────────
interface BadgeStage { label: string; threshold: number; desc: string }
interface BadgeDef   { id: string; name: string; emoji: string; stages: BadgeStage[]; stub: boolean }

const BADGES: BadgeDef[] = [
  { id: 'writing',   name: '글쓰기',   emoji: '✍️', stub: false,
    stages: [{ label: '첫 마디',    threshold: 1,   desc: '글 1개' },
             { label: '이야기꾼',   threshold: 30,  desc: '글 30개' },
             { label: '스토리텔러', threshold: 100, desc: '글 100개' }] },
  { id: 'volunteer', name: '봉사',     emoji: '🤝', stub: false,
    stages: [{ label: '첫 발걸음',  threshold: 1,   desc: '봉사 1시간' },
             { label: '봉사왕',     threshold: 10,  desc: '10시간' },
             { label: '봉사대왕',   threshold: 100, desc: '100시간' }] },
  { id: 'donation',  name: '후원',     emoji: '💝', stub: false,
    stages: [{ label: '첫 나눔',    threshold: 1,  desc: '후원 1회' },
             { label: '나눔천사',   threshold: 10, desc: '10회' },
             { label: '나눔의신',   threshold: 50, desc: '50회' }] },
  { id: 'event',     name: '행사',     emoji: '🎉', stub: false,
    stages: [{ label: '첫 참여',    threshold: 1,  desc: '행사 1회' },
             { label: '행사마니아', threshold: 10, desc: '10회' },
             { label: '행사중독자', threshold: 30, desc: '30회' }] },
  { id: 'streak',    name: '연속활동', emoji: '🔥', stub: false,
    stages: [{ label: '첫 습관',    threshold: 1,  desc: '1주 활동' },
             { label: '성실왕',     threshold: 8,  desc: '8주 연속' },
             { label: '불굴의의지', threshold: 26, desc: '26주 연속' }] },
  { id: 'group',     name: '소그룹',   emoji: '👥', stub: true,
    stages: [{ label: '첫 모임',    threshold: 1, desc: '소그룹 1회' },
             { label: '그룹리더',   threshold: 1, desc: '리드 1회' },
             { label: '그룹마스터', threshold: 5, desc: '리드 5회' }] },
  { id: 'invite',    name: '초대',     emoji: '📨', stub: true,
    stages: [{ label: '첫 초대',    threshold: 1,  desc: '초대 1가정' },
             { label: '씨앗전파자', threshold: 5,  desc: '5가정' },
             { label: '확장의달인', threshold: 20, desc: '20가정' }] },
  { id: 'gratitude', name: '감사',     emoji: '🙏', stub: true,
    stages: [{ label: '첫 감사',   threshold: 1,   desc: '감사 수신 1회' },
             { label: '감사천사',   threshold: 20,  desc: '20회' },
             { label: '감사의신',   threshold: 100, desc: '100회' }] },
  { id: 'challenge', name: '챌린지',   emoji: '⚡', stub: true,
    stages: [{ label: '첫 도전',   threshold: 1,  desc: '챌린지 1회' },
             { label: '챌린저',    threshold: 5,  desc: '5회' },
             { label: '챌린지킹',  threshold: 20, desc: '20회' }] },
]

function getAchievedStage(value: number, stages: BadgeStage[]) {
  return stages.reduce<number>((b, s, i) => (value >= s.threshold ? i : b), -1)
}

function getBadgeValue(id: string, d: PageData) {
  switch (id) {
    case 'writing':   return d.postCount
    case 'volunteer': return d.volunteerSum
    case 'donation':  return d.donationCount
    case 'event':     return d.eventCount
    case 'streak':    return d.streakWeeks
    default:          return 0
  }
}

function getBadgeFirstDate(id: string, d: PageData) {
  switch (id) {
    case 'writing':   return d.postFirstDate
    case 'volunteer': return d.volunteerFirstDate
    case 'donation':  return d.donationFirstDate
    case 'event':     return d.eventFirstDate
    default:          return null
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return '알 수 없는 날'
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getStoryText(badge: BadgeDef, value: number, firstDate: string | null, nick: string) {
  const d = fmtDate(firstDate)
  switch (badge.id) {
    case 'writing':   return firstDate ? `${nick}님이 처음 글을 쓴 건 ${d}이었어요.\n그날부터 오늘까지 ${value}편의 이야기를 남겼어요.`                          : `${nick}님은 ${value}편의 글을 남겼어요.`
    case 'volunteer': return firstDate ? `${nick}님이 처음 봉사에 나선 건 ${d}이었어요.\n그날부터 오늘까지 ${Math.floor(value)}시간 지역사회를 빛냈어요.`         : `${nick}님은 ${Math.floor(value)}시간 봉사했어요.`
    case 'donation':  return firstDate ? `${nick}님이 처음 나눔을 실천한 건 ${d}이었어요.\n그날부터 오늘까지 ${value}번 따뜻한 마음을 전했어요.`                 : `${nick}님은 ${value}번 후원했어요.`
    case 'event':     return firstDate ? `${nick}님이 처음 행사에 참여한 건 ${d}이었어요.\n그날부터 오늘까지 ${value}번의 자리를 함께했어요.`                    : `${nick}님은 ${value}번의 행사를 함께했어요.`
    case 'streak':    return `${nick}님은 ${value}주 연속으로 패밀로그에서 활동하고 있어요.`
    default:          return ''
  }
}

function getHighlight(d: PageData, nick: string) {
  for (const badge of [...BADGES].reverse()) {
    if (badge.stub) continue
    const val   = getBadgeValue(badge.id, d)
    const stage = getAchievedStage(val, badge.stages)
    if (stage >= 0) return `${badge.stages[stage].label} 뱃지를 달성했어요 ${badge.emoji}`
  }
  if (d.totalLikes > 0) return `내 이야기가 ${d.totalLikes}명에게 닿았어요`
  return `${nick}님의 이야기가 시작됐어요 🌱`
}

// ── 넛지 ─────────────────────────────────────────────────────────────────────
interface NudgeInfo {
  badge: BadgeDef; nextStage: BadgeStage; gap: number
  achievedStage: number; value: number; firstDate: string | null
}

function getNudgeBadge(data: PageData): NudgeInfo | null {
  let best: NudgeInfo | null = null
  for (const badge of BADGES) {
    if (badge.stub) continue
    const value       = getBadgeValue(badge.id, data)
    const achievedIdx = getAchievedStage(value, badge.stages)
    const nextIdx     = achievedIdx + 1
    if (nextIdx >= badge.stages.length) continue
    const nextStage = badge.stages[nextIdx]
    const gap       = nextStage.threshold - value
    if (!best || gap < best.gap) {
      best = { badge, nextStage, gap, achievedStage: achievedIdx, value, firstDate: getBadgeFirstDate(badge.id, data) }
    }
  }
  return best
}

function getNudgeText(id: string, stageName: string, rawGap: number): string {
  const n = id === 'volunteer' ? Math.ceil(rawGap) : rawGap
  switch (id) {
    case 'writing':
      return n === 1 ? `${stageName}까지 글 1개만 더 작성하면 돼요` : `${stageName}까지 글 ${n}개 더 작성하면 돼요`
    case 'volunteer':
      return n <= 1 ? `${stageName}까지 봉사활동에 한 번만 참여해봐요` : `${stageName}까지 ${n}시간 더 봉사하면 돼요`
    case 'donation':
      return n === 1 ? `${stageName}까지 한 번만 더 후원해봐요` : `${stageName}까지 ${n}번 더 후원하면 돼요`
    case 'event':
      return n === 1 ? `${stageName}까지 행사에 한 번만 더 참여해봐요` : `${stageName}까지 ${n}번 더 참여하면 돼요`
    case 'streak':
      return n === 1 ? `${stageName}까지 이번 주만 활동하면 돼요` : `${stageName}까지 ${n}주 더 활동하면 돼요`
    default:
      return `${stageName}에 도전해봐요`
  }
}

// ── 연속활동 ──────────────────────────────────────────────────────────────────
function mondayOf(date: Date) {
  const d = new Date(date); const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); d.setHours(0, 0, 0, 0)
  return d.getTime()
}
function calcStreakWeeks(dates: string[]) {
  if (!dates.length) return 0
  const sorted = Array.from(new Set(dates.map(s => mondayOf(new Date(s))))).sort((a, b) => b - a)
  let streak = 1; const W = 7 * 86400000
  for (let i = 1; i < sorted.length; i++) { if (sorted[i - 1] - sorted[i] === W) streak++; else break }
  return streak
}

// ── 날짜 포맷 ─────────────────────────────────────────────────────────────────
function formatRelativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000); if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60);       if (h < 24) return `${h}시간 전`
  const day = Math.floor(h / 24);     if (day < 7) return `${day}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

const MERIT_LABELS: Record<string, string> = {
  post_created: '글 작성', comment_created: '댓글 작성',
  like_received: '공감 받음', event_joined: '행사 참여',
}

// ── 가족 탭 샘플 ──────────────────────────────────────────────────────────────
const SAMPLE_MEMBERS = [
  { name: '아빠', contribution: 72, color: 'bg-brand-green' },
  { name: '엄마', contribution: 58, color: 'bg-blue-400' },
  { name: '자녀', contribution: 34, color: 'bg-orange-400' },
]

// ── 데이터 타입 & fetch ───────────────────────────────────────────────────────
interface PostItem  { id: string; title: string; content: string | null; like_count: number; comment_count: number; created_at: string }
interface MeritItem { id: string; merit_type: string; category: string; raw_value: number | null; points: number; created_at: string }

interface PageData {
  totalLikes: number; postCount: number; postFirstDate: string | null; posts: PostItem[]
  volunteerSum: number; volunteerFirstDate: string | null
  donationCount: number; donationFirstDate: string | null
  eventCount: number; eventFirstDate: string | null
  streakWeeks: number; meritsDesc: MeritItem[]
}

async function fetchPageData(uid: string, token: string): Promise<PageData> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const h    = { apikey: key, Authorization: `Bearer ${token}` }

  const [postsRes, meritsRes] = await Promise.all([
    fetch(`${base}/rest/v1/posts?author_id=eq.${uid}&deleted_at=is.null&select=id,title,content,like_count,comment_count,created_at&order=created_at.asc`, { headers: h, cache: 'no-store' }),
    fetch(`${base}/rest/v1/merits?user_id=eq.${uid}&select=id,merit_type,category,raw_value,points,created_at&order=created_at.asc&limit=1000`,             { headers: h, cache: 'no-store' }),
  ])

  const postsAsc:  PostItem[]  = postsRes.ok  ? await postsRes.json()  : []
  const meritsAsc: MeritItem[] = meritsRes.ok ? await meritsRes.json() : []

  const vols = meritsAsc.filter(m => m.category   === 'volunteer')
  const dons = meritsAsc.filter(m => m.merit_type === 'donation')
  const evts = meritsAsc.filter(m => m.merit_type === 'event_joined')

  return {
    totalLikes:         postsAsc.reduce((s, p) => s + (p.like_count ?? 0), 0),
    postCount:          postsAsc.length,
    postFirstDate:      postsAsc[0]?.created_at ?? null,
    posts:              [...postsAsc].reverse(),
    volunteerSum:       vols.reduce((s, m) => s + (m.raw_value ?? 0), 0),
    volunteerFirstDate: vols[0]?.created_at ?? null,
    donationCount:      dons.length,
    donationFirstDate:  dons[0]?.created_at ?? null,
    eventCount:         evts.length,
    eventFirstDate:     evts[0]?.created_at ?? null,
    streakWeeks:        calcStreakWeeks(meritsAsc.map(m => m.created_at)),
    meritsDesc:         [...meritsAsc].reverse().slice(0, 10),
  }
}

// ── 뱃지 카드 ─────────────────────────────────────────────────────────────────
interface SheetState { badge: BadgeDef; achievedStage: number; value: number; firstDate: string | null }

function BadgeCard({ badge, value, firstDate, onOpen }: {
  badge: BadgeDef; value: number; firstDate: string | null; onOpen: (s: SheetState) => void
}) {
  const achievedStage = badge.stub ? -1 : getAchievedStage(value, badge.stages)
  const achieved      = achievedStage >= 0
  return (
    <button type="button" onClick={() => onOpen({ badge, achievedStage, value, firstDate })}
      className={`relative rounded-2xl border border-brand-line p-3 flex flex-col items-center gap-1 text-center active:scale-95 transition-transform ${achieved && !badge.stub ? 'bg-brand-green-light' : 'bg-white'}`}>
      <span className={`text-3xl leading-none ${(!achieved || badge.stub) ? 'grayscale opacity-50' : ''}`}>{badge.emoji}</span>
      <p className={`text-[11px] font-semibold leading-tight mt-0.5 ${achieved && !badge.stub ? 'text-brand-text' : 'text-brand-muted'}`}>{badge.name}</p>
      <p className={`text-[10px] leading-tight ${achieved && !badge.stub ? 'text-brand-green' : 'text-brand-muted'}`}>
        {badge.stub ? '준비 중' : achieved ? badge.stages[achievedStage].label : '미달성'}
      </p>
      {badge.stub && <Lock size={10} className="absolute top-1.5 right-1.5 text-brand-muted opacity-60" />}
    </button>
  )
}

// ── 뱃지 시트 ─────────────────────────────────────────────────────────────────
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
      {/* 딤 배경 — 모바일·데스크탑 공통 */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* 모바일: 하단 슬라이드 시트 (lg 미만) */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl
          transition-transform duration-300 ease-out
          ${show ? 'translate-y-0' : 'translate-y-full'}`}
        onTouchStart={e => { touchY.current = e.touches[0].clientY }}
        onTouchEnd={e => { if (e.changedTouches[0].clientY - touchY.current > 80) handleClose() }}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-brand-line rounded-full" />
        </div>
        <div className="px-6 pb-10">
          {renderContent()}
        </div>
      </div>

      {/* 데스크탑: 중앙 모달 (lg 이상) */}
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
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-3 right-4 p-1 text-brand-muted hover:text-brand-text transition-colors"
          >
            <X size={18} />
          </button>
          {renderContent()}
        </div>
      </div>
    </>
  )
}

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

// ── 설정 드롭다운 ─────────────────────────────────────────────────────────────
function SettingsMenu({ onSettings, onLogout, onClose }: {
  onSettings: () => void; onLogout: () => void; onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute top-full right-0 mt-1 z-40 bg-white rounded-xl shadow-lg border border-brand-line overflow-hidden min-w-[130px]">
        <button onClick={() => { onSettings(); onClose() }}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-brand-text hover:bg-brand-card transition-colors text-left">
          계정 설정
        </button>
        <div className="border-t border-brand-line" />
        <button onClick={() => { onLogout(); onClose() }}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors text-left">
          <LogOut size={14} /> 로그아웃
        </button>
      </div>
    </>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function MypagePage() {
  const router = useRouter()
  const { user, isLoading: authLoading, logout } = useAuth()
  const [activeTab,    setActiveTab]    = useState<PageTab>('발자취')
  const [data,         setData]         = useState<PageData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [sheet,         setSheet]         = useState<SheetState | null>(null)
  const [showMenu,      setShowMenu]      = useState(false)
  const [showTierSheet, setShowTierSheet] = useState(false)
  const [toast,        setToast]        = useState<string | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string) => {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast(msg)
    toastRef.current = setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current) }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      try { setData(await fetchPageData(user.id, session.access_token)) }
      catch { setData(null) }
      finally { setLoading(false) }
    })
  }, [authLoading, user])

  if (authLoading) return <div className="flex items-center justify-center py-24 text-brand-muted text-sm">불러오는 중...</div>
  if (!user)       return <div className="flex items-center justify-center py-24 text-brand-muted text-sm">로그인이 필요해요</div>

  const days = getDaysElapsed(user.created_at)
  const tier = getTierProgress(user.points)

  const handleLogout = () => { logout(); router.push('/community') }

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6 bg-brand-bg min-h-screen">

      {/* ── 상단 고정 영역 + 탭 바 ────────────────────────────────────────── */}
      <div>

        {/* 프로필 헤더 */}
        <div className="relative px-4 pt-5 pb-4 border-b border-brand-line bg-brand-bg">

          {/* 설정 아이콘 — 우측 상단 고정 */}
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setShowMenu(v => !v)}
              className="p-1.5 rounded-lg bg-brand-card hover:bg-brand-line transition-colors"
            >
              <Settings size={18} className="text-brand-sub" />
            </button>
            {showMenu && (
              <SettingsMenu
                onSettings={() => router.push('/mypage/settings')}
                onLogout={handleLogout}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>

          {/* 프로필 본문 */}
          <div className="flex items-center gap-4 pr-10">

            {/* 프로필 사진 */}
            <div className="relative flex-shrink-0 w-20 h-20">
              <img
                src={user.avatar || '/default-avatar.png'}
                alt=""
                className="w-20 h-20 rounded-full object-cover border-2 border-brand-line"
              />
              <button
                onClick={() => router.push('/mypage/edit')}
                className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow"
              >
                <Pencil size={11} className="text-brand-green" />
              </button>
            </div>

            {/* 우측 영역 */}
            <div className="flex-1 min-w-0">

              {/* 1행: 닉네임 + 생애주기 */}
              <div className="flex items-center gap-2 mb-3">
                <span className="font-bold text-lg leading-tight truncate text-brand-text">{user.nickname}</span>
                {user.life_stage && (
                  <span className="text-sm text-brand-sub flex-shrink-0">
                    {LIFE_STAGE_LABELS[user.life_stage] ?? user.life_stage}
                  </span>
                )}
              </div>

              {/* 2행: 지표 3개 균등 3열 */}
              <div className="grid grid-cols-3">
                <div>
                  <p className="font-semibold text-base text-brand-text">{user.points.toLocaleString()}P</p>
                  <p className="text-xs text-brand-sub">누적 포인트</p>
                </div>
                <div className="border-l border-brand-line pl-3">
                  <p className="font-semibold text-base text-brand-text">{days}일</p>
                  <p className="text-xs text-brand-sub">활동일수</p>
                </div>
                <div className="border-l border-brand-line pl-3">
                  <p className="font-semibold text-base text-brand-text">
                    {loading ? '—' : `${data?.totalLikes ?? 0}명`}
                  </p>
                  <p className="text-xs text-brand-sub">받은 공감</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* X 언더라인 탭 바 */}
        <div className="flex bg-white border-b border-brand-line">
          {PAGE_TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                activeTab === t ? 'border-brand-green text-brand-text' : 'border-transparent text-brand-sub'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── 발자취 탭 — 티어 진행률 바 + 뱃지 ─────────────────────────────────── */}
      {activeTab === '발자취' && (
        <div className="px-4 lg:px-6 py-4 space-y-4">
          {/* 티어 진행률 바 — 탭하면 티어 상세 팝업 */}
          <button
            type="button"
            onClick={() => setShowTierSheet(true)}
            className="w-full bg-brand-card rounded-2xl border border-brand-line px-4 py-4 text-left hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-semibold">{tier.currentLabel}</span>
              {tier.nextLabel ? (
                <span className="text-xs text-brand-muted">
                  {tier.nextLabel}까지 <span className="font-medium text-brand-text">{tier.remaining}P</span>
                </span>
              ) : (
                <span className="text-xs text-brand-muted">최고 티어 달성 🎉</span>
              )}
            </div>
            <div className="w-full h-2 bg-brand-line rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-green rounded-full transition-all duration-500"
                style={{ width: `${tier.progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-right text-[11px] text-brand-muted">{user.points.toLocaleString()}P 보유</p>
          </button>

          {/* 뱃지 */}
          <div>
            <div className="flex items-baseline gap-1.5 mb-3">
              <h2 className="text-sm font-semibold text-brand-text">뱃지</h2>
              {data && (
                <span className="text-xs text-brand-muted">
                  {BADGES.filter(b => !b.stub && getAchievedStage(getBadgeValue(b.id, data), b.stages) >= 0).length}
                  {' / '}{BADGES.length}
                </span>
              )}
            </div>
            {loading ? (
              <div className="grid grid-cols-3 gap-2 animate-pulse">
                {Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-24 bg-brand-card rounded-2xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {BADGES.map(badge => (
                  <BadgeCard key={badge.id} badge={badge}
                    value={data ? getBadgeValue(badge.id, data) : 0}
                    firstDate={data ? getBadgeFirstDate(badge.id, data) : null}
                    onOpen={setSheet} />
                ))}
              </div>
            )}
          </div>

          {/* 넛지 카드 — 가장 달성에 가까운 미달성 뱃지 */}
          {(() => {
            if (!data) return null
            const nudge = getNudgeBadge(data)
            if (!nudge) return null
            return (
              <button
                type="button"
                onClick={() => setSheet({
                  badge:         nudge.badge,
                  achievedStage: nudge.achievedStage,
                  value:         nudge.value,
                  firstDate:     nudge.firstDate,
                })}
                className="w-full bg-brand-green-light rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left"
              >
                <span className="text-2xl leading-none flex-shrink-0">{nudge.badge.emoji}</span>
                <p className="text-sm text-brand-green-dark leading-snug">
                  {getNudgeText(nudge.badge.id, nudge.nextStage.label, nudge.gap)}
                </p>
              </button>
            )
          })()}
        </div>
      )}

      {/* ── 가족 탭 ──────────────────────────────────────────────────────────── */}
      {activeTab === '가족' && (
        <div className="px-4 lg:px-6 py-5">
          {user.family_id ? (
            <p className="text-sm text-brand-muted text-center py-6">가족 피드를 준비 중이에요.</p>
          ) : (
            <div className="relative">
              {/* 샘플 (흐릿) */}
              <div className="opacity-40 pointer-events-none select-none space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[{ icon: Clock, label: '함께한 날', value: '365일' },
                    { icon: Star,  label: '합산 포인트', value: '2,400P' },
                    { icon: Users, label: '봉사 시간',  value: '12시간' }].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-white rounded-2xl border border-brand-line p-3 text-center">
                      <Icon size={16} className="text-brand-green mx-auto mb-1" />
                      <p className="text-[10px] text-brand-muted">{label}</p>
                      <p className="text-sm font-bold text-brand-text mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl border border-brand-line p-4">
                  <p className="text-xs font-semibold text-brand-text mb-3">구성원 기여도</p>
                  <div className="space-y-2.5">
                    {SAMPLE_MEMBERS.map(m => (
                      <div key={m.name} className="flex items-center gap-2">
                        <span className="text-xs text-brand-sub w-6 flex-shrink-0">{m.name}</span>
                        <div className="flex-1 h-2 bg-brand-card rounded-full overflow-hidden">
                          <div className={`h-full ${m.color} rounded-full`} style={{ width: `${(m.contribution / 72) * 100}%` }} />
                        </div>
                        <span className="text-xs text-brand-muted w-6 text-right flex-shrink-0">{m.contribution}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* 오버레이 */}
              <div className="absolute inset-0 flex items-center justify-center px-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-5 text-center shadow-sm w-full max-w-xs">
                  <div className="w-12 h-12 rounded-full bg-brand-green-light flex items-center justify-center mx-auto mb-3">
                    <Users size={22} className="text-brand-green" />
                  </div>
                  <p className="text-sm font-semibold text-brand-text mb-1">가족을 연결하면</p>
                  <p className="text-sm text-brand-sub mb-4">우리 가족의 여정이 여기 쌓여요</p>
                  <button onClick={() => showToast('준비 중이에요')}
                    className="w-full py-2.5 bg-brand-green text-white text-sm font-medium rounded-full">
                    연결하기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 활동 탭 — 내가 쓴 글 + 포인트 내역 ────────────────────────────── */}
      {activeTab === '활동' && (
        <div className="px-4 lg:px-6 py-5 space-y-6">

          {/* 내가 쓴 글 */}
          <section>
            <h2 className="text-sm font-semibold text-brand-text mb-3">내가 쓴 글</h2>
            {loading ? (
              <div className="space-y-2 animate-pulse">{[1,2,3].map(n => <div key={n} className="h-20 bg-brand-card rounded-2xl" />)}</div>
            ) : !data?.posts.length ? (
              <p className="text-sm text-brand-muted text-center py-4">아직 작성한 글이 없어요.</p>
            ) : (
              <div className="space-y-2">
                {data.posts.map(post => (
                  <Link key={post.id} href={`/community/${post.id}`}
                    className="block bg-white rounded-2xl border border-brand-line px-4 py-3 hover:bg-brand-card transition-colors">
                    <p className="text-sm font-medium text-brand-text truncate">{post.title}</p>
                    {post.content && <p className="text-xs text-brand-sub mt-0.5 line-clamp-1">{post.content.split('\n')[0]}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-brand-muted">
                      <span>{formatRelativeDate(post.created_at)}</span>
                      <span className="flex items-center gap-0.5"><Heart size={11} />{post.like_count ?? 0}</span>
                      <span className="flex items-center gap-0.5"><MessageSquare size={11} />{post.comment_count ?? 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 포인트 내역 */}
          <section>
            <h2 className="text-sm font-semibold text-brand-text mb-3">포인트 적립 내역</h2>
            {loading ? (
              <div className="space-y-2 animate-pulse">{[1,2,3].map(n => <div key={n} className="h-12 bg-brand-card rounded-2xl" />)}</div>
            ) : !data?.meritsDesc.length ? (
              <p className="text-sm text-brand-muted text-center py-4">아직 적립 내역이 없어요.</p>
            ) : (
              <div className="bg-white rounded-2xl border border-brand-line divide-y divide-brand-line overflow-hidden">
                {data.meritsDesc.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-brand-text">{MERIT_LABELS[m.merit_type] ?? m.merit_type}</p>
                      <p className="text-[11px] text-brand-muted mt-0.5">{formatRelativeDate(m.created_at)}</p>
                    </div>
                    <span className="text-sm font-semibold text-brand-green flex-shrink-0">+{m.points}P</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 뱃지 시트 */}
      {sheet && <BadgeSheet state={sheet} nickname={user.nickname} onClose={() => setSheet(null)} />}

      {/* 티어 상세 시트 */}
      {showTierSheet && <TierSheet currentPoints={user.points} onClose={() => setShowTierSheet(false)} />}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-brand-text text-white text-sm px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
