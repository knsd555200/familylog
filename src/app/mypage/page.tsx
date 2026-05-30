'use client'
import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Settings, Heart, MessageSquare, LogOut, Pencil, ChevronRight, ChevronLeft,
  Image as ImageIcon, PenLine, MoreHorizontal, Check, Trash2, X,
} from 'lucide-react'
import { deletePost } from '@/lib/api/posts'
import { VisibilitySheet, getVisibility } from '@/components/VisibilitySheet'
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
const PAGE_TABS = ['이야기', '사진', '발자취'] as const
type PageTab = typeof PAGE_TABS[number]

// ── 데이터 타입 & fetch ───────────────────────────────────────────────────────
interface PostItem { id: string; title: string; content: string | null; media_urls: string[] | null; thumbnail_url: string | null; like_count: number; comment_count: number; created_at: string; visibility: string }

interface PageData extends GrowthStats {
  totalLikes: number; posts: PostItem[]; hasMore: boolean
  milestones: Milestone[]
  allPhotos: { url: string; postId: string }[]
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

  const allPhotos = statsAll
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .flatMap(p => (p.media_urls ?? []).map(url => ({ url, postId: p.id })))

  return {
    totalLikes:         statsAll.reduce((s, p) => s + (p.like_count ?? 0), 0),
    postCount:          statsAll.length,
    postFirstDate:      statsAll[0]?.created_at ?? null,
    posts:              postsFirst,
    hasMore:            statsAll.length > POSTS_PER_PAGE,
    allPhotos,
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
  const { user, isLoading: authLoading, logout, updateUser } = useAuth()
  const [activeTab,    setActiveTab]    = useState<PageTab>('이야기')
  const [data,         setData]         = useState<PageData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [currentPage,  setCurrentPage]  = useState(1)
  const [pageLoading,  setPageLoading]  = useState(false)
  const [showVisibility, setShowVisibility] = useState(false)
  const [footView,      setFootView]      = useState<'올해' | '전체'>('올해')
  // 이야기 탭 — 수정/삭제
  const [menuPostId,        setMenuPostId]        = useState<string | null>(null)
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null)
  const [selectMode,   setSelectMode]   = useState(false)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const [deleting,          setDeleting]          = useState(false)
  const [showBulkVisibility, setShowBulkVisibility] = useState(false)
  const [updatingVisibility, setUpdatingVisibility] = useState(false)
  // 사진 라이트박스
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const touchStartX = useRef<number | null>(null)

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

  // 라이트박스 키보드 네비게이션 — 조기 반환 전에 위치해야 훅 순서가 일정함
  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setLightboxIndex(i => (i !== null && i > 0 ? i - 1 : i))
      if (e.key === 'ArrowRight') setLightboxIndex(i => (i !== null && i < (data?.allPhotos.length ?? 0) - 1 ? i + 1 : i))
      if (e.key === 'Escape')     setLightboxIndex(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, data?.allPhotos.length])

  if (authLoading || !user) return <div className="flex items-center justify-center py-24 text-brand-muted text-sm">불러오는 중...</div>

  // 가족 시작일 있으면 그 기준, 없으면 가입일 기준
  const days      = getDaysElapsed(user.family_start_date ?? user.created_at)
  const daysLabel = user.family_start_date ? '함께한 날' : '패밀로그와 함께한 날'
  const tier      = getTierProgress(user.points)

  const photos = data?.allPhotos ?? []

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
    const post = data?.posts.find(p => p.id === postId)
    const result = await deletePost(postId)
    if (result.success) {
      setData(prev => {
        if (!prev) return prev
        const newPosts = prev.posts.filter(p => p.id !== postId)
        const newCount = prev.postCount - 1
        // 현재 페이지가 비었고 이전 페이지가 있으면 이전 페이지로
        if (newPosts.length === 0 && currentPage > 1) {
          goToPage(currentPage - 1)
        }
        return { ...prev, posts: newPosts, postCount: newCount, totalLikes: prev.totalLikes - (post?.like_count ?? 0) }
      })
    }
  }

  const handleBulkVisibilityChange = async (v: string) => {
    if (selectedIds.size === 0 || updatingVisibility) return
    setShowBulkVisibility(false)
    setUpdatingVisibility(true)
    const ids = Array.from(selectedIds)
    await supabase
      .from('posts')
      .update({ visibility: v })
      .in('id', ids)
      .eq('author_id', user.id)
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

  // 공개 범위 변경 — 낙관적 갱신 후 실패 시 롤백
  const handleVisibilityChange = async (v: string) => {
    const prev = user.visibility
    if (v === prev) return
    updateUser({ visibility: v })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { updateUser({ visibility: prev }); return }
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          apikey:         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization:  `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Prefer:         'return=minimal',
        },
        body: JSON.stringify({ visibility: v }),
      })
      if (!res.ok) updateUser({ visibility: prev })
    } catch {
      updateUser({ visibility: prev })
    }
  }

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
          {PAGE_TABS.map(t => (
            <button key={t} onClick={() => { setActiveTab(t); exitSelectMode() }}
              className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                activeTab === t ? 'border-brand-green text-brand-text' : 'border-transparent text-brand-sub'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── 이야기 탭 — 커뮤니티 피드 스타일 풀카드 ───────────────────────────── */}
      {activeTab === '이야기' && (
        <div className="px-4 lg:px-6 pt-4 pb-4">
          {!loading && !!data?.posts.length && (
            <div className="flex mb-3">
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
            /* 스켈레톤 */
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
                post.visibility === 'members' ? '멤버공개' : '비공개'

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

      {/* ── 사진 탭 — 이 가정의 앨범 ──────────────────────────────────────────── */}
      {activeTab === '사진' && (
        <div className="px-4 lg:px-6 py-5">
          {loading ? (
            <div className="grid grid-cols-3 gap-1.5 animate-pulse">
              {Array.from({ length: 9 }).map((_, i) => <div key={i} className="aspect-square bg-brand-card rounded-lg" />)}
            </div>
          ) : photos.length === 0 ? (
            /* 빈 상태 — 함께 채워갈 앨범 */
            <div className="flex flex-col items-center text-center py-16 px-8">
              <div className="w-14 h-14 rounded-full bg-brand-green-light flex items-center justify-center mb-4">
                <ImageIcon size={24} className="text-brand-green" />
              </div>
              <p className="font-serif text-lg text-brand-text mb-1.5">함께 채워갈 앨범</p>
              <p className="text-sm text-brand-muted leading-relaxed">사진과 함께 글을 올리면<br />이곳에 차곡차곡 쌓여요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {photos.map((ph, i) => (
                <button
                  key={`${ph.postId}-${i}`}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-brand-card"
                >
                  <img src={ph.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 발자취 탭 — 우리 가정이 걸어온 길 ─────────────────────────────────── */}
      {activeTab === '발자취' && (
        <div className="px-4 lg:px-6 py-5">
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

      {/* 공개 범위 선택 시트 */}
      {showVisibility && (
        <VisibilitySheet
          current={user.visibility}
          onSelect={handleVisibilityChange}
          onClose={() => setShowVisibility(false)}
        />
      )}

      {/* 사진 라이트박스 */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center"
          onClick={() => setLightboxIndex(null)}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (touchStartX.current === null) return
            const dx = e.changedTouches[0].clientX - touchStartX.current
            touchStartX.current = null
            if (dx > 50 && lightboxIndex > 0)                 setLightboxIndex(i => i! - 1)
            if (dx < -50 && lightboxIndex < photos.length - 1) setLightboxIndex(i => i! + 1)
          }}
        >
          {/* 닫기 */}
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={18} />
          </button>

          {/* 사진 영역 */}
          <div className="relative flex items-center justify-center w-full px-12" onClick={e => e.stopPropagation()}>
            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(i => i! - 1)}
                className="absolute left-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            <img
              key={lightboxIndex}
              src={photos[lightboxIndex].url}
              alt=""
              className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl object-contain select-none"
              style={{ animation: 'lbFadeIn .18s ease' }}
            />

            {lightboxIndex < photos.length - 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(i => i! + 1)}
                className="absolute right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          {/* 도트 인디케이터 (20장 이하) or 카운터 */}
          <div className="mt-5" onClick={e => e.stopPropagation()}>
            {photos.length <= 20 ? (
              <div className="flex gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className={`rounded-full transition-all ${
                      i === lightboxIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/35'
                    }`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/50">{lightboxIndex + 1} / {photos.length}</p>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes lbFadeIn { from { opacity: 0; transform: scale(.97) } to { opacity: 1; transform: scale(1) } }`}</style>

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
                onClick={handleBulkDelete}
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
