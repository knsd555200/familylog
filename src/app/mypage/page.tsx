'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Settings, Heart, MessageSquare, LogOut, Pencil, ChevronRight, ChevronLeft,
  PenLine, MoreHorizontal, Check, Trash2, Calendar,
  Plus, MapPin, Users,
} from 'lucide-react'
import { canManageEvents } from '@/lib/api/eventManager'
import { deletePost } from '@/lib/api/posts'
import { getManagedEventPosts, type EventPost } from '@/lib/api/events'
import { getFamilyStats, type FamilyStats } from '@/lib/api/family'
import { VisibilitySheet, getVisibility } from '@/components/VisibilitySheet'
import FamilySpace from '@/components/family/FamilySpace'
import InviteFamilyButton from '@/components/family/InviteFamilyButton'
import {
  BADGES, getAchievedStage, getBadgeValue, getTierProgress, getDaysElapsed,
  formatRelativeDate, fmtDate, buildMilestones, buildUpcoming, calcStreakWeeks,
  type Milestone, type MeritItem, type GrowthStats,
} from '@/lib/growth'

// ── 생애주기 라벨 ────────────────────────────────────────────────────────────
const LIFE_STAGE_LABELS: Record<string, string> = {
  pre_married: '예비부부',
  newlywed:    '신혼부부',
  parenting:   '부모',
  empty_nest:  '황혼부부',
}

// ── 탭 ───────────────────────────────────────────────────────────────────────
//  · '내 기록'은 author=본인 단일 소스(private 포함) 목록
//  · '행사'는 행사 권한자(행사관리자·수퍼관리자)에게만 노출되는 탭
const PAGE_TABS = ['내 기록', '발자취', '행사'] as const
type PageTab = typeof PAGE_TABS[number]

// ── 데이터 타입 & fetch ───────────────────────────────────────────────────────
interface PostItem { id: string; title: string; content: string | null; media_urls: string[] | null; thumbnail_url: string | null; like_count: number; comment_count: number; created_at: string; visibility: string }

interface PageData extends GrowthStats {
  totalLikes: number; posts: PostItem[]; hasMore: boolean
  milestones: Milestone[]
}

const POSTS_PER_PAGE = 10

function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

async function fetchPageData(uid: string, token: string): Promise<PageData> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const h    = { apikey: key, Authorization: `Bearer ${token}` }

  const [statsRes, postsRes, meritsRes] = await Promise.all([
    // 통계용: 경량 필드만, 전체 (like_count 합산 · 건수 · 첫 작성일 · 발자취 노드)
    fetch(`${base}/rest/v1/posts?author_id=eq.${uid}&deleted_at=is.null&select=id,like_count,created_at,thumbnail_url,media_urls&order=created_at.asc`, { headers: h, cache: 'no-store' }),
    // 표시용: 최신순 첫 페이지만
    fetch(`${base}/rest/v1/posts?author_id=eq.${uid}&deleted_at=is.null&select=id,title,content,media_urls,thumbnail_url,like_count,comment_count,created_at,visibility&order=created_at.desc&limit=${POSTS_PER_PAGE}`, { headers: h, cache: 'no-store' }),
    fetch(`${base}/rest/v1/merits?user_id=eq.${uid}&select=id,merit_type,category,raw_value,points,created_at,reference_id&order=created_at.asc&limit=1000`, { headers: h, cache: 'no-store' }),
  ])

  const statsAll:  { id: string; like_count: number; created_at: string; thumbnail_url: string | null; media_urls: string[] | null }[] = statsRes.ok  ? await statsRes.json()  : []
  const postsFirst: PostItem[]  = postsRes.ok  ? await postsRes.json()  : []
  const meritsAsc:  MeritItem[] = meritsRes.ok ? await meritsRes.json() : []

  const vols = meritsAsc.filter(m => m.category   === 'volunteer')
  const dons = meritsAsc.filter(m => m.merit_type === 'donation')
  const evts = meritsAsc.filter(m => m.merit_type === 'event_joined')

  // 발자취 — 이야기는 게시물 id+썸네일을 직접 전달
  const milestones = buildMilestones(
    statsAll.map(s => ({ id: s.id, created_at: s.created_at, thumb: s.thumbnail_url ?? s.media_urls?.[0] ?? null })),
    meritsAsc,
  )

  // 행사 이정표 — 참여한 행사 글의 썸네일·제목 보강 (이정표가 있을 때만 1회 조회)
  const eventIds = Array.from(new Set(milestones.filter(m => m.refId).map(m => m.refId)))
  if (eventIds.length) {
    const evRes = await fetch(`${base}/rest/v1/posts?id=in.(${eventIds.join(',')})&select=id,title,thumbnail_url,media_urls`, { headers: h, cache: 'no-store' })
    if (evRes.ok) {
      const evPosts: { id: string; title: string; thumbnail_url: string | null; media_urls: string[] | null }[] = await evRes.json()
      const thumbById = new Map(evPosts.map(p => [p.id, p.thumbnail_url ?? p.media_urls?.[0] ?? null]))
      const titleById = new Map(evPosts.map(p => [p.id, p.title]))
      // 이정표 텍스트 원본 → 제목 포함 버전 대응
      const EVENT_TEXTS_TITLED: Record<string, (t: string) => string> = {
        '첫 행사에 함께했어요':              t => `'${t}'에 처음 함께했어요`,
        '행사 10번, 행사마니아가 되었어요': t => `'${t}'와 함께 행사마니아가 되었어요`,
        '행사 30번, 행사중독자가 되었어요': t => `'${t}'와 함께 행사중독자가 되었어요`,
      }
      milestones.forEach(m => {
        if (!m.refId || !thumbById.has(m.refId)) return
        m.thumb = thumbById.get(m.refId) ?? null
        const title = titleById.get(m.refId)
        if (title && EVENT_TEXTS_TITLED[m.text]) m.text = EVENT_TEXTS_TITLED[m.text](title)
      })
    }
  }

  return {
    totalLikes:         statsAll.reduce((s, p) => s + (p.like_count ?? 0), 0),
    postCount:          statsAll.length,
    postFirstDate:      statsAll[0]?.created_at ?? null,
    posts:              postsFirst,
    hasMore:            statsAll.length > POSTS_PER_PAGE,
    volunteerSum:       vols.reduce((s, m) => s + (m.raw_value ?? 0), 0),
    volunteerFirstDate: vols[0]?.created_at ?? null,
    donationCount:      dons.length,
    donationFirstDate:  dons[0]?.created_at ?? null,
    eventCount:         evts.length,
    eventFirstDate:     evts[0]?.created_at ?? null,
    streakWeeks:        calcStreakWeeks(meritsAsc.map(m => m.created_at)),
    milestones,
  }
}

async function fetchMorePosts(uid: string, token: string, offset: number): Promise<PostItem[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const res = await fetch(
    `${base}/rest/v1/posts?author_id=eq.${uid}&deleted_at=is.null&select=id,title,content,media_urls,thumbnail_url,like_count,comment_count,created_at,visibility&order=created_at.desc&limit=${POSTS_PER_PAGE}&offset=${offset}`,
    { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: 'no-store' }
  )
  return res.ok ? res.json() : []
}


// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function MypagePage() {
  const router = useRouter()
  const { user, isLoading: authLoading, logout } = useAuth()
  const [activeTab,    setActiveTab]    = useState<PageTab>('내 기록')
  const [data,         setData]         = useState<PageData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [currentPage,  setCurrentPage]  = useState(1)
  const [pageLoading,  setPageLoading]  = useState(false)
  const [footView,      setFootView]      = useState<'올해' | '전체'>('올해')
  // 내 기록 탭 — 수정/삭제
  const [menuPostId,        setMenuPostId]        = useState<string | null>(null)
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null)
  const [selectMode,   setSelectMode]   = useState(false)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const [deleting,          setDeleting]          = useState(false)
  const [showBulkVisibility, setShowBulkVisibility] = useState(false)
  const [updatingVisibility, setUpdatingVisibility] = useState(false)
  // 일괄 삭제 실행 전 확인 다이얼로그 표시 여부
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  // 가족 합산 통계 (family_id 있을 때만 로드, 발자취 탭·프로필 헤더 공용)
  const [familyStats,        setFamilyStats]        = useState<FamilyStats | null>(null)
  const [familyLoading,      setFamilyLoading]      = useState(false)
  // 행사 탭 (권한자 전용) — 관리 대상 행사 목록
  const [managedEvents,    setManagedEvents]    = useState<EventPost[]>([])
  const [eventsLoading,    setEventsLoading]    = useState(false)
  const [eventsLoaded,     setEventsLoaded]     = useState(false)
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null)
  const [deletingEventId,  setDeletingEventId]  = useState<string | null>(null)

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

  // 비로그인 시 로그인 화면으로
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  // 가족 연동 시 합산 통계만 로드 (발자취 탭·프로필 헤더 공용, family_id 변경 시에만 재실행)
  useEffect(() => {
    if (!user?.family_id) {
      setFamilyStats(null)
      return
    }
    setFamilyLoading(true)
    getFamilyStats(user.family_id)
      .then(setFamilyStats)
      .finally(() => setFamilyLoading(false))
  }, [user?.family_id])

  // 행사 탭 첫 진입 시 관리 대상 행사 조회 (권한자 전용, 1회만)
  useEffect(() => {
    if (activeTab !== '행사' || eventsLoaded || !user) return
    if (!canManageEvents(user.role)) return
    setEventsLoading(true)
    getManagedEventPosts(user.id, user.role === 'admin')
      .then(setManagedEvents)
      .finally(() => { setEventsLoading(false); setEventsLoaded(true) })
  }, [activeTab, eventsLoaded, user])

  if (authLoading || !user) return <div className="flex items-center justify-center py-24 text-brand-muted text-sm">불러오는 중...</div>

  // 가족 시작일 있으면 그 기준, 없으면 가입일 기준
  const days      = getDaysElapsed(user.family_start_date ?? user.created_at)
  const daysLabel = user.family_start_date ? '함께한 날' : '패밀로그와 함께한 날'
  const tier      = getTierProgress(user.points)

  // 본인 여부 — 프로필 열람 기능 추가 시 (방문자 != 주인) 판별로 대체
  const isOwner = true

  // 발자취 — 획득 뱃지 수 (컬렉션 진입점 라벨)
  const badgeCount = data
    ? BADGES.filter(b => !b.stub && getAchievedStage(getBadgeValue(b.id, data), b.stages) >= 0).length
    : 0

  // 발자취 — 시작점 앵커(항상 고정) + 달성 이정표 / 예고된 발자국
  const anchorDate   = user.family_start_date ?? user.created_at
  const timelineNodes: Milestone[] = data?.milestones ?? []
  const upcoming     = data ? buildUpcoming(data, user.points, days) : []

  // 발자취 — 연도별 그룹 (새해마다 새 장)
  const currentYear = new Date().getFullYear()
  const nodeYear    = (d: string | null) => (d ? new Date(d).getFullYear() : currentYear)
  const allYears    = Array.from(new Set(timelineNodes.map(n => nodeYear(n.date)))).sort((a, b) => a - b)
  const hasPast     = allYears.some(y => y !== currentYear) || (anchorDate ? new Date(anchorDate).getFullYear() !== currentYear : false)
  const shownYears  = footView === '올해' ? [currentYear] : allYears

  const handleLogout = () => { logout(); router.push('/community') }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const handleDeletePost = async (postId: string) => {
    setMenuPostId(null)
    setConfirmDeletePostId(null)
    const result = await deletePost(postId)
    if (!result.success) return
    // 단일 소스: data.posts에서 삭제 + 좋아요 합산 조정
    const post = data?.posts.find(p => p.id === postId)
    setData(prev => {
      if (!prev) return prev
      const newPosts = prev.posts.filter(p => p.id !== postId)
      const newCount = prev.postCount - 1
      if (newPosts.length === 0 && currentPage > 1) goToPage(currentPage - 1)
      return { ...prev, posts: newPosts, postCount: newCount, totalLikes: prev.totalLikes - (post?.like_count ?? 0) }
    })
  }

  const handleBulkVisibilityChange = async (v: string) => {
    if (selectedIds.size === 0 || updatingVisibility) return
    setShowBulkVisibility(false)
    setUpdatingVisibility(true)
    const ids = Array.from(selectedIds)

    // family 선택 시 가정 확인 — createPost와 동일 경로(users.family_id 단일 조회)
    let familyId: string | null = null
    if (v === 'family') {
      const { data: profile } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', user.id)
        .maybeSingle()
      if (!profile?.family_id) {
        alert('가정을 먼저 만들어야 가족 공개로 변경할 수 있어요.')
        setUpdatingVisibility(false)
        return
      }
      familyId = profile.family_id
    }

    // family는 check 제약(posts_check) 통과를 위해 family_id를 함께 전달
    const payload = v === 'family'
      ? { visibility: v, family_id: familyId }
      : { visibility: v }

    // .select()로 실제 갱신된 행 수 확인 — RLS/제약 위반 시 빈 배열 반환
    const { data: updated, error } = await supabase
      .from('posts')
      .update(payload)
      .in('id', ids)
      .eq('author_id', user.id)
      .select('id')

    if (error || !updated?.length) {
      alert('공개 범위 변경에 실패했어요. 다시 시도해 주세요.')
      setUpdatingVisibility(false)
      return
    }

    // DB 성공 확인 후에만 로컬 갱신
    setData(prev => {
      if (!prev) return prev
      return { ...prev, posts: prev.posts.map(p => ids.includes(p.id) ? { ...p, visibility: v } : p) }
    })
    setUpdatingVisibility(false)
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || deleting) return
    setDeleting(true)
    const ids = Array.from(selectedIds)
    await Promise.all(ids.map(id => deletePost(id)))
    setData(prev => {
      if (!prev) return prev
      const removed = prev.posts.filter(p => ids.includes(p.id))
      const removedLikes = removed.reduce((s, p) => s + (p.like_count ?? 0), 0)
      const newPosts = prev.posts.filter(p => !ids.includes(p.id))
      if (newPosts.length === 0 && currentPage > 1) goToPage(currentPage - 1)
      return { ...prev, posts: newPosts, postCount: prev.postCount - ids.length, totalLikes: prev.totalLikes - removedLikes }
    })
    setSelectedIds(new Set())
    setSelectMode(false)
    setDeleting(false)
  }

  const goToPage = async (page: number) => {
    if (!data || page === currentPage || pageLoading) return
    setPageLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const posts = await fetchMorePosts(user.id, session.access_token, (page - 1) * POSTS_PER_PAGE)
      setData(prev => prev ? { ...prev, posts } : prev)
      setCurrentPage(page)
      setSelectedIds(new Set())
    } finally {
      setPageLoading(false)
    }
  }

  // 행사 삭제 (행사 탭) — 성공 시 목록에서 제거
  const handleDeleteEvent = async (id: string) => {
    setDeletingEventId(id)
    const result = await deletePost(id)
    setDeletingEventId(null)
    setConfirmDeleteEventId(null)
    if (result.success) setManagedEvents(prev => prev.filter(e => e.id !== id))
    else alert(result.error ?? '삭제에 실패했어요')
  }

  // 행사 권한자 여부 — 탭 노출·렌더 분기
  const canManage = canManageEvents(user.role)
  // 권한자가 아니면 '행사' 탭은 숨김
  const visibleTabs = PAGE_TABS.filter(t => t !== '행사' || canManage)

  // 내 기록 탭 선택 버튼 표시 여부 — 로딩 아님 + 글 있음
  const canSelect = !loading && !!(data?.posts.length)

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6 bg-brand-bg min-h-screen">

      {/* ── 상단 고정 영역 + 탭 바 ────────────────────────────────────────── */}
      <div>

        {/* ── 프로필 헤더 — 개인 프로필 (가족 연동 전) ──────────────────────────
            가족 연동 시 가족 프로필로 분기 예정 — user.family_id 기준 (미구현) */}
        <div className="relative bg-brand-bg px-6 pt-3 pb-7">

          {/* 편집 — 좌측 상단 (본인만) */}
          {isOwner && (
            <button
              onClick={() => router.push('/mypage/edit')}
              className="absolute top-3 left-3 z-10 p-2 rounded-full hover:bg-brand-card transition-colors"
            >
              <Pencil size={16} className="text-brand-muted" />
            </button>
          )}

          {/* 설정 — 우측 상단 (본인만, 바로 설정 페이지로) */}
          {isOwner && (
            <button
              onClick={() => router.push('/mypage/settings')}
              className="absolute top-3 right-3 z-10 p-2 rounded-full hover:bg-brand-card transition-colors"
            >
              <Settings size={18} className="text-brand-muted" />
            </button>
          )}

          {/* 정체성 — 중앙 정렬 */}
          <div className="flex flex-col items-center text-center pt-7">

            {/* 아바타 — 없으면 이니셜 그린 원 */}
            {user.avatar
              ? <img src={user.avatar} alt="" className="w-24 h-24 rounded-full object-cover ring-1 ring-brand-line" />
              : <div className="w-24 h-24 rounded-full bg-brand-green flex items-center justify-center">
                  <span className="font-serif text-3xl text-white">{user.nickname.charAt(0)}</span>
                </div>
            }

            {/* 이름 — serif 제목 */}
            <h1 className="font-serif text-2xl font-bold text-brand-text mt-4 leading-snug px-8">
              {user.nickname}
            </h1>

            {/* 생애주기 + 티어 */}
            <p className="text-sm text-brand-sub mt-1">
              {user.life_stage && <>{LIFE_STAGE_LABELS[user.life_stage] ?? user.life_stage} · </>}
              {tier.currentLabel.split(' ')[1] ?? tier.currentLabel} 단계
            </p>

            {/* 한 줄 소개 */}
            {user.bio && (
              <p className="text-sm text-brand-muted mt-3 max-w-xs leading-relaxed">{user.bio}</p>
            )}

            {/* 공개 범위 — 읽기 전용 pill */}
            {(() => {
              const v = getVisibility(user.visibility)
              const Icon = v.icon
              return (
                <span className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 bg-brand-card rounded-full text-[11px] text-brand-muted">
                  <Icon size={11} />
                  {v.label}
                </span>
              )
            })()}
          </div>

          {/* 가족 구성원 — 본인 제외한 아바타 줄 + 초대 (연동 시). 가족을 상단에서 항상 보이게 */}
          {user.family_id && familyStats && (() => {
            const others = familyStats.members.filter(m => m.userId !== user.id)
            return (
              <div className="flex items-center justify-center gap-2 mt-5">
                {others.slice(0, 6).map(m => (
                  m.avatar
                    ? <img key={m.userId} src={m.avatar} alt={m.nickname} className="w-9 h-9 rounded-full object-cover" />
                    : <div key={m.userId} className="w-9 h-9 rounded-full bg-brand-green flex items-center justify-center">
                        <span className="text-[11px] text-white">{m.nickname.charAt(0)}</span>
                      </div>
                ))}
                {others.length > 6 && (
                  <div className="w-9 h-9 rounded-full bg-brand-card flex items-center justify-center text-[10px] text-brand-sub">
                    +{others.length - 6}
                  </div>
                )}
                <InviteFamilyButton variant="icon" />
              </div>
            )
          })()}

          {/* 서사 지표 3 — 자랑은 숫자가 아니라 라벨에서 */}
          <div className="grid grid-cols-3 mt-7">
            <div className="text-center">
              <p className="font-serif text-2xl font-bold text-brand-text leading-none">{days.toLocaleString()}</p>
              <p className="text-xs text-brand-muted mt-1.5">{daysLabel}</p>
            </div>
            <div className="text-center border-x border-brand-line">
              <p className="font-serif text-2xl font-bold text-brand-text leading-none">{loading ? '—' : (data?.postCount ?? 0)}</p>
              <p className="text-xs text-brand-muted mt-1.5">쌓은 이야기</p>
            </div>
            <div className="text-center">
              <p className="font-serif text-2xl font-bold text-brand-text leading-none">{loading ? '—' : (data?.totalLikes ?? 0)}</p>
              <p className="text-xs text-brand-muted mt-1.5">받은 마음</p>
            </div>
          </div>
        </div>

        {/* X 언더라인 탭 바 */}
        <div className="flex bg-white border-b border-brand-line">
          {visibleTabs.map(t => (
            <button key={t} onClick={() => { setActiveTab(t); exitSelectMode() }}
              className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                activeTab === t ? 'border-brand-green text-brand-text' : 'border-transparent text-brand-sub'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── 내 기록 탭 — author=본인 단일 소스 (private 포함) ───────────────────── */}
      {activeTab === '내 기록' && (
        <div className="px-4 lg:px-6 pt-4 pb-4">
          {/* 상단 바 — 선택(일괄 수정/삭제) */}
          {canSelect && (
            <div className="mb-4">
              <button
                type="button"
                onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}
                className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                  selectMode
                    ? 'border-brand-green text-brand-green bg-brand-green/5'
                    : 'border-brand-line text-brand-sub bg-white hover:border-brand-text hover:text-brand-text'
                }`}
              >
                {selectMode ? '취소' : '선택'}
              </button>
            </div>
          )}

          <div className="space-y-4">
            {loading ? (
              [1,2,3].map(n => (
                <div key={n} className="bg-white rounded-2xl border border-brand-line p-4 animate-pulse">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-full bg-brand-card flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-brand-card rounded w-24" />
                      <div className="h-2.5 bg-brand-card rounded w-16" />
                    </div>
                  </div>
                  <div className="h-4 bg-brand-card rounded w-3/4 mb-2" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-brand-card rounded" />
                    <div className="h-3 bg-brand-card rounded w-5/6" />
                  </div>
                </div>
              ))
            ) : !data?.posts.length ? (
              <div className="flex flex-col items-center text-center py-16 px-8">
                <div className="w-14 h-14 rounded-full bg-brand-green-light flex items-center justify-center mb-4">
                  <PenLine size={24} className="text-brand-green" />
                </div>
                <p className="font-serif text-lg text-brand-text mb-1.5">아직 비어 있는 이야기책</p>
                <p className="text-sm text-brand-muted leading-relaxed">이 집에서 나눌 첫 이야기를<br />남겨보세요.</p>
              </div>
            ) : (
              data.posts.map(post => {
                const thumb = post.thumbnail_url ?? post.media_urls?.[0] ?? null
                const isSelected = selectedIds.has(post.id)
                const visibilityLabel =
                  post.visibility === 'public'  ? '전체공개' :
                  post.visibility === 'family'  ? '가족만 보기' : '나만 보기'

                const textContent = (showMenu: boolean) => (
                  <div className="flex-1 min-w-0">
                    <div>
                      <span className="font-semibold text-sm leading-snug">{post.title}</span>
                      <span className="ml-1.5 text-[11px] text-brand-muted">{formatRelativeDate(post.created_at)}</span>
                    </div>
                    {post.content && <p className="mt-1 text-xs text-brand-muted line-clamp-2 leading-relaxed">{post.content}</p>}
                    <div className="flex items-center gap-2 mt-2 text-xs text-brand-muted">
                      <span className="flex items-center gap-1"><Heart size={12} />{post.like_count ?? 0}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={12} />{post.comment_count ?? 0}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-brand-card text-[10px]">{visibilityLabel}</span>
                      {showMenu && (
                        <button
                          type="button"
                          onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDeletePostId(null); setMenuPostId(post.id) }}
                          className="p-0.5 rounded hover:bg-brand-card transition-colors"
                        >
                          <MoreHorizontal size={14} className="text-brand-muted" />
                        </button>
                      )}
                    </div>
                  </div>
                )

                return (
                  <div
                    key={post.id}
                    className={`bg-white rounded-2xl border overflow-hidden transition-colors ${
                      isSelected ? 'border-brand-green' : 'border-brand-line'
                    }`}
                  >
                    {selectMode ? (
                      <div className="flex gap-3 p-4 cursor-pointer" onClick={() => toggleSelect(post.id)}>
                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-brand-green border-brand-green' : 'border-brand-line'
                        }`}>
                          {isSelected && <Check size={11} className="text-white" />}
                        </div>
                        {textContent(false)}
                        {thumb && (
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-brand-card">
                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link href={`/community/${post.id}`} className="flex items-stretch min-w-0 hover:bg-gray-50/50 transition-colors">
                        <div className="flex-1 p-4 min-w-0">{textContent(true)}</div>
                        {thumb && (
                          <div className="w-28 flex-shrink-0 self-stretch bg-brand-card">
                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </Link>
                    )}
                  </div>
                )
              })
            )}

            {/* 페이지네이션 */}
            {data && data.postCount > POSTS_PER_PAGE && (() => {
              const totalPages = Math.ceil(data.postCount / POSTS_PER_PAGE)
              const pages = getPageNumbers(currentPage, totalPages)
              return (
                <div className="flex items-center justify-center gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || pageLoading}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-brand-muted hover:bg-brand-card disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {pages.map((p, i) =>
                    p === '…' ? (
                      <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-brand-muted">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goToPage(p)}
                        disabled={pageLoading}
                        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${
                          p === currentPage
                            ? 'bg-brand-text text-white font-semibold'
                            : 'text-brand-sub hover:bg-brand-card'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === Math.ceil(data.postCount / POSTS_PER_PAGE) || pageLoading}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-brand-muted hover:bg-brand-card disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── 발자취 탭 — 우리 가정이 걸어온 길 ─────────────────────────────────── */}
      {activeTab === '발자취' && (
        <div className="px-4 lg:px-6 py-5">
          {/* 가족 공간 진입 — 미연동: 가족 만들기 / 연동됨: 초대하기 */}
          <FamilySpace />

          {/* 가족 합산 통계 블록 — family_id가 있을 때만 표시 */}
          {user.family_id && (
            <div className="mb-6 space-y-3">
              {familyLoading ? (
                /* 합산 통계 스켈레톤 */
                <div className="animate-pulse space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-20 bg-brand-card rounded-2xl" />
                    <div className="h-20 bg-brand-card rounded-2xl" />
                  </div>
                  <div className="h-32 bg-brand-card rounded-2xl" />
                </div>
              ) : familyStats ? (
                <>
                  {/* 가족 경과일 + 합산 포인트 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl border border-brand-line p-4 text-center">
                      <p className="font-serif text-2xl font-bold text-brand-text leading-none">{familyStats.familyDays.toLocaleString()}</p>
                      <p className="text-xs text-brand-muted mt-1.5">가족이 함께한 날</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-brand-line p-4 text-center">
                      <p className="font-serif text-2xl font-bold text-brand-text leading-none">{familyStats.totalPoints.toLocaleString()}</p>
                      <p className="text-xs text-brand-muted mt-1.5">가족 합산 포인트</p>
                    </div>
                  </div>

                  {/* 구성원별 기여도 — 1명일 때 "혼자 달리는 중" 안내 */}
                  <div className="bg-white rounded-2xl border border-brand-line p-4">
                    {/* 헤더 — 우측에 조용한 초대 진입점(+) */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-brand-sub">구성원 기여도</p>
                      <InviteFamilyButton variant="icon" />
                    </div>
                    {familyStats.members.length === 1 ? (
                      <p className="text-xs text-brand-muted text-center py-2">아직 나 혼자 달리는 중이에요 🌱<br />가족을 초대하면 함께 기여도가 쌓여요</p>
                    ) : (
                      familyStats.members.map(member => {
                        // 합산 포인트가 0이면 0% 표시 (0/0 NaN 방지)
                        const pct = familyStats.totalPoints > 0
                          ? Math.round((member.points / familyStats.totalPoints) * 100)
                          : 0
                        return (
                          <div key={member.userId} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                              {member.avatar
                                ? <img src={member.avatar} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                                : <div className="w-6 h-6 rounded-full bg-brand-green flex items-center justify-center flex-shrink-0">
                                    <span className="text-[10px] text-white">{member.nickname.charAt(0)}</span>
                                  </div>
                              }
                              <span className="text-xs font-medium text-brand-text flex-1 truncate">{member.nickname}</span>
                              <span className="text-xs text-brand-muted">{member.points.toLocaleString()}P</span>
                              <span className="text-xs font-semibold text-brand-green w-9 text-right">{pct}%</span>
                            </div>
                            {/* 기여도 프로그레스 바 */}
                            <div className="h-1.5 bg-brand-card rounded-full overflow-hidden ml-8">
                              <div
                                className="h-full bg-brand-green rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {loading ? (
            <div className="space-y-6 animate-pulse pl-6">
              {[1,2,3,4].map(n => (
                <div key={n} className="space-y-1.5">
                  <div className="h-3.5 bg-brand-card rounded w-2/3" />
                  <div className="h-2.5 bg-brand-card rounded w-24" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* 올해 / 전체 토글 — 지난 해 기록이 있을 때만 */}
              {hasPast && (
                <div className="flex justify-center mb-5">
                  <div className="inline-flex bg-brand-card rounded-full p-0.5">
                    {(['올해', '전체'] as const).map(v => (
                      <button key={v} type="button" onClick={() => setFootView(v)}
                        className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          footView === v ? 'bg-white text-brand-text shadow-sm' : 'text-brand-muted'
                        }`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 시작점 앵커 — 연도 필터 무관, 항상 고정 */}
              <ol className="relative ml-2 border-l-2 border-brand-line/70 space-y-6 py-1">
                <li className="pl-3">
                  <div className="flex items-start gap-2">
                    <div className="flex items-center gap-1.5 shrink-0 pt-px">
                      <span className="text-base leading-none">🌱</span>
                      <span className="text-brand-line text-sm select-none leading-none">|</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand-text">{user.nickname}님의 이야기가 시작됐어요</p>
                      <p className="text-[11px] text-brand-muted mt-0.5">{fmtDate(anchorDate)}</p>
                    </div>
                  </div>
                </li>
              </ol>

              {/* 연도별 타임라인 — 새해마다 새 장 */}
              {shownYears.map(year => {
                const nodes = timelineNodes.filter(n => nodeYear(n.date) === year)
                return (
                  <div key={year}>
                    {/* 연도 구분선 */}
                    <div className="flex items-center gap-3 mb-5 mt-6">
                      <span className="h-px flex-1 bg-brand-line/60" />
                      <span className="font-serif text-sm text-brand-sub">{year}</span>
                      <span className="h-px flex-1 bg-brand-line/60" />
                    </div>
                    {nodes.length ? (
                      <ol className="relative ml-2 border-l-2 border-brand-line/70 space-y-6 py-1">
                        {nodes.map((m, i) => {
                          const body = (
                            <div className="flex items-start gap-2">
                              <div className="flex items-center gap-1.5 shrink-0 pt-px">
                                <span className="text-base leading-none">{m.emoji}</span>
                                <span className="text-brand-line text-sm select-none leading-none">|</span>
                              </div>
                              <div className="min-w-0">
                                <p className={`text-sm font-medium leading-snug ${m.href ? 'text-brand-text group-hover:text-brand-green transition-colors' : 'text-brand-text'}`}>{m.text}</p>
                                <p className="text-[11px] text-brand-muted mt-0.5">{fmtDate(m.date)}</p>
                              </div>
                            </div>
                          )
                          return (
                            <li key={i} className="pl-3">
                              {m.href ? <Link href={m.href} className="group block">{body}</Link> : body}
                            </li>
                          )
                        })}
                      </ol>
                    ) : (
                      <p className="text-sm text-brand-muted text-center py-4">올해는 아직 새로운 발자국이 없어요</p>
                    )}
                  </div>
                )
              })}

              {/* 앞으로 남을 발자국 — 예고 (안내, 더미 아님) */}
              {upcoming.length > 0 && (
                <ol className="relative ml-2 border-l-2 border-dashed border-brand-line/60 space-y-6 pt-6">
                  {upcoming.map((u, i) => (
                    <li key={i} className="pl-3">
                      <div className="flex items-start gap-2 opacity-50">
                        <div className="flex items-center gap-1.5 shrink-0 pt-px">
                          <span className="text-base leading-none grayscale">{u.emoji}</span>
                          <span className="text-brand-line text-sm select-none leading-none">|</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-brand-muted leading-snug">{u.text}</p>
                          {u.stub && (
                            <span className="inline-block mt-1 text-[10px] text-brand-muted bg-brand-card px-1.5 py-0.5 rounded-full">준비중</span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {/* 뱃지 컬렉션 — 작은 텍스트 링크 */}
              <div className="mt-6 text-center">
                <Link href="/mypage/badges" className="text-xs text-brand-muted hover:text-brand-text transition-colors">
                  🏅 내가 모은 뱃지 {badgeCount}개 보기
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 행사 탭 — 권한자가 등록·관리하는 행사 ─────────────────────────────── */}
      {activeTab === '행사' && canManage && (
        <div className="px-4 lg:px-6 py-4">
          {/* 새 행사 등록 */}
          <div className="flex justify-end mb-3">
            <Link href="/community/write" className="flex items-center gap-1 px-3 py-1.5 bg-brand-green text-white text-xs font-semibold rounded-full">
              <Plus size={14} /> 새 행사
            </Link>
          </div>

          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(n => (
                <div key={n} className="bg-white rounded-2xl border border-brand-line p-4 animate-pulse h-24" />
              ))}
            </div>
          ) : managedEvents.length === 0 ? (
            <div className="flex flex-col items-center text-center py-16 px-8">
              <div className="w-14 h-14 rounded-full bg-brand-green-light flex items-center justify-center mb-4">
                <Calendar size={24} className="text-brand-green" />
              </div>
              <p className="font-serif text-lg text-brand-text mb-1.5">아직 등록한 행사가 없어요</p>
              <p className="text-sm text-brand-muted leading-relaxed mb-5">첫 행사를 등록해보세요.</p>
              <Link href="/community/write" className="px-5 py-2.5 bg-brand-green text-white text-sm font-semibold rounded-full flex items-center gap-1.5">
                <Plus size={16} /> 새 행사 등록
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {managedEvents.map(e => (
                <div key={e.id} className="bg-white rounded-2xl border border-brand-line overflow-hidden">
                  <div className="flex items-stretch">
                    {/* 썸네일 */}
                    <Link href={`/events/${e.id}`} className="w-24 flex-shrink-0 bg-brand-card">
                      {e.thumbnail_url
                        ? <img src={e.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-brand-muted text-[10px]">이미지 없음</div>
                      }
                    </Link>

                    {/* 정보 */}
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="font-medium text-sm leading-snug truncate flex-1">{e.title}</h3>
                        {e.event_is_closed && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-brand-card text-brand-muted rounded-full flex-shrink-0">마감</span>
                        )}
                      </div>
                      <div className="space-y-0.5 text-[11px] text-brand-muted">
                        <div className="flex items-center gap-1">
                          <Calendar size={11} /> {e.event_start_at
                            ? new Date(e.event_start_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
                            : '미정'}
                        </div>
                        {e.event_location && <div className="flex items-center gap-1 truncate"><MapPin size={11} /> {e.event_location}</div>}
                        {e.event_max_participants != null && <div className="flex items-center gap-1"><Users size={11} /> 최대 {e.event_max_participants}명</div>}
                      </div>

                      {/* 수정 / 삭제 */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => router.push(`/community/edit/${e.id}`)}
                          className="flex items-center gap-1 text-xs text-brand-sub hover:text-brand-text transition-colors"
                        >
                          <Pencil size={13} /> 수정
                        </button>
                        {confirmDeleteEventId === e.id ? (
                          <span className="flex items-center gap-1.5 text-xs">
                            <button
                              onClick={() => handleDeleteEvent(e.id)}
                              disabled={deletingEventId === e.id}
                              className="text-red-500 font-medium disabled:opacity-50"
                            >
                              {deletingEventId === e.id ? '삭제 중...' : '삭제확인'}
                            </button>
                            <button onClick={() => setConfirmDeleteEventId(null)} className="text-brand-muted">취소</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteEventId(e.id)}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} /> 삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 로그아웃 — 본인만, 맨 아래 */}
      {isOwner && (
        <div className="px-4 lg:px-6 pt-2 pb-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-brand-muted hover:text-brand-text transition-colors"
          >
            <LogOut size={15} /> 로그아웃
          </button>
        </div>
      )}

      {/* 일괄 공개 범위 시트 */}
      {showBulkVisibility && (
        <VisibilitySheet
          current=""
          onSelect={handleBulkVisibilityChange}
          onClose={() => setShowBulkVisibility(false)}
        />
      )}

      {/* ⋯ 개별 액션 시트 */}
      {menuPostId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => { setMenuPostId(null); setConfirmDeletePostId(null) }} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl max-w-2xl mx-auto pb-safe">
            <div className="w-10 h-1 bg-brand-line rounded-full mx-auto mt-3 mb-2" />
            {confirmDeletePostId === menuPostId ? (
              /* 삭제 확인 단계 */
              <div className="px-6 py-4">
                <p className="text-sm font-semibold text-brand-text mb-1">이 글을 삭제할까요?</p>
                <p className="text-xs text-brand-muted mb-5">삭제한 글은 복구할 수 없어요.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeletePostId(null)}
                    className="flex-1 py-2.5 rounded-xl border border-brand-line text-sm text-brand-sub hover:bg-brand-card transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePost(menuPostId)}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm text-white font-medium hover:bg-red-600 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ) : (
              /* 기본 메뉴 */
              <>
                <button
                  type="button"
                  onClick={() => { setMenuPostId(null); router.push(`/community/edit/${menuPostId}`) }}
                  className="w-full flex items-center gap-3 px-6 py-4 text-sm text-brand-text hover:bg-brand-card transition-colors"
                >
                  <Pencil size={16} className="text-brand-sub" />
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeletePostId(menuPostId)}
                  className="w-full flex items-center gap-3 px-6 py-4 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                  삭제
                </button>
              </>
            )}
            <div className="h-6" />
          </div>
        </>
      )}

      {/* 일괄 삭제 확인 다이얼로그 — 단일 삭제와 동일한 비주얼 패턴 */}
      {confirmBulkDelete && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setConfirmBulkDelete(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl max-w-2xl mx-auto pb-safe">
            <div className="w-10 h-1 bg-brand-line rounded-full mx-auto mt-3 mb-2" />
            <div className="px-6 py-4">
              <p className="text-sm font-semibold text-brand-text mb-1">선택한 {selectedIds.size}개의 기록을 삭제할까요?</p>
              <p className="text-xs text-brand-muted mb-5">삭제한 기록은 복구할 수 없어요.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(false)}
                  className="flex-1 py-2.5 rounded-xl border border-brand-line text-sm text-brand-sub hover:bg-brand-card transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmBulkDelete(false); handleBulkDelete() }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm text-white font-medium hover:bg-red-600 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
            <div className="h-6" />
          </div>
        </>
      )}

      {/* 일괄 삭제 바 — 선택 모드에서 하나 이상 선택 시 */}
      {selectMode && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-40 max-w-2xl mx-auto px-4 pb-3">
          <div className="bg-brand-text rounded-2xl flex items-center justify-between px-5 py-3.5 shadow-lg">
            <span className="text-sm text-white">
              {selectedIds.size > 0 ? `${selectedIds.size}개 선택됨` : '글을 선택하세요'}
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowBulkVisibility(true)}
                disabled={selectedIds.size === 0 || updatingVisibility}
                className="text-sm font-medium text-white/80 disabled:text-white/30 transition-colors"
              >
                {updatingVisibility ? '변경 중...' : '공개 범위'}
              </button>
              <button
                type="button"
                onClick={() => { if (selectedIds.size > 0 && !deleting) setConfirmBulkDelete(true) }}
                disabled={selectedIds.size === 0 || deleting}
                className="flex items-center gap-1.5 text-sm font-medium text-red-400 disabled:text-white/30 transition-colors"
              >
                <Trash2 size={15} />
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
