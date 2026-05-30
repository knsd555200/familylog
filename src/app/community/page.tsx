'use client'
import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { communityPosts } from '@/data/community'
import { feedPosts } from '@/data/feed'
import type { CommunityPost, FeedPost } from '@/types/post'
import { Heart, MessageSquare, PenSquare, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { getDbCommunityPosts, getDbFeedPosts, getMyLikes, toggleLike } from '@/lib/api/posts'
import { getEventPosts, type EventPost } from '@/lib/api/events'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import PostMenu from '@/components/community/PostMenu'
import ShareMenu from '@/components/community/ShareMenu'
import CommentDrawer from '@/components/feed/CommentDrawer'

function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const moved = useRef(false)

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    moved.current = false
    startX.current = e.pageX - (ref.current?.offsetLeft ?? 0)
    scrollLeft.current = ref.current?.scrollLeft ?? 0
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !ref.current) return
    const x = e.pageX - ref.current.offsetLeft
    const delta = x - startX.current
    if (Math.abs(delta) > 3) moved.current = true
    ref.current.scrollLeft = scrollLeft.current - delta
  }
  const onMouseUp = () => { dragging.current = false }
  const wasDragging = () => moved.current

  return { ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp, wasDragging }
}

function ImageStrip({ images, onOpen }: { images: string[]; onOpen: (e: React.MouseEvent, idx: number) => void }) {
  const { ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, wasDragging } = useDragScroll()
  return (
    <div
      ref={ref}
      className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3 cursor-grab active:cursor-grabbing select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {images.map((src, idx) => (
        <button
          key={idx}
          type="button"
          onClick={(e) => { if (!wasDragging()) onOpen(e, idx) }}
          className="flex-shrink-0"
        >
          <div className="w-48 h-36 rounded-xl overflow-hidden pointer-events-none">
            <img src={src} alt="" className="w-full h-full object-cover" />
          </div>
        </button>
      ))}
    </div>
  )
}

const FEED_TABS = ['이야기', '우리 가족'] as const
type FeedTab = typeof FEED_TABS[number]

const CATEGORY_LABEL: Record<string, string> = {
  daily: '일상',
  concern: '고민',
  practice: '인증',
  sharing: '나눔',
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  workshop: '워크숍',
  service:  '봉사',
  meetup:   '모임',
  camp:     '캠프',
  online:   '온라인',
  etc:      '기타',
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category
}

function formatEventDate(iso: string | null): string {
  if (!iso) return '미정'
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  })
}

function isDbPostId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

interface CardPost {
  id: string
  title: string
  preview: string
  authorName: string
  authorAvatar: string
  authorStatus: string
  category: string
  images: string[]
  likes: number
  comments: number
  authorId?: string
  postType?: string
}

function feedToCard(p: FeedPost): CardPost {
  return {
    id: p.id,
    title: p.title,
    preview: p.description,
    authorName: p.author.nickname,
    authorAvatar: p.author.avatar,
    authorStatus: p.author.status,
    category: getCategoryLabel(p.category),
    images: p.images.length > 0 ? p.images : p.videoThumb ? [p.videoThumb] : [],
    likes: p.likes,
    comments: p.comments,
    authorId: p.authorId,
    postType: p.postType,
  }
}

function communityToCard(p: CommunityPost): CardPost {
  return {
    id: p.id,
    title: p.title,
    preview: p.content,
    authorName: p.author,
    authorAvatar: p.avatar,
    authorStatus: p.status,
    category: getCategoryLabel(p.category),
    images: p.mediaUrls && p.mediaUrls.length > 0 ? p.mediaUrls : p.thumbnail ? [p.thumbnail] : [],
    likes: p.likes,
    comments: p.comments,
    authorId: p.authorId,
  }
}

interface Lightbox {
  images: string[]
  index: number
}

function PostPreview({
  text,
  isExpanded,
  onToggle,
}: {
  text: string
  isExpanded: boolean
  onToggle: (e: React.MouseEvent) => void
}) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [isClamped, setIsClamped] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || isExpanded) return

    const measure = () => {
      setIsClamped(el.scrollHeight > el.clientHeight)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text, isExpanded])

  return (
    <>
      <p
        ref={ref}
        className={`text-sm text-brand-sub leading-relaxed whitespace-pre-wrap ${!isExpanded ? 'line-clamp-4' : ''}`}
      >
        {text}
      </p>
      {isClamped && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 text-xs text-brand-muted hover:text-brand-text transition-colors"
        >
          {isExpanded ? '접기 ▴' : '더 보기 ▾'}
        </button>
      )}
    </>
  )
}

export default function CommunityPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [feedTab, setFeedTab] = useState<FeedTab>('이야기')
  const [familyMemberIds, setFamilyMemberIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [popularPosts, setPopularPosts] = useState<CardPost[]>([])
  const [latestPosts, setLatestPosts] = useState<CardPost[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const likingRef = useRef<Set<string>>(new Set())
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [lightbox, setLightbox] = useState<Lightbox | null>(null)
  const lbTouchStartX = useRef<number | null>(null)
  const lbMouseStartX = useRef<number | null>(null)
  const lbMouseMoved  = useRef(false)
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null)
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  // 행사 배너 — 마운트 시 로딩, 모든 탭에서 5번째 게시글 아래 노출
  const [practiceEvents, setPracticeEvents] = useState<EventPost[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)

  // 행사 배너 가로 스크롤 — 마우스 드래그
  const eventBannerScrollRef = useRef<HTMLDivElement>(null)
  const eventBannerDragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, dragged: false })
  const [eventBannerDragging, setEventBannerDragging] = useState(false)

  const handleEventBannerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = eventBannerScrollRef.current
    if (!el) return
    eventBannerDragRef.current = {
      isDown: true,
      startX: e.pageX,
      scrollLeft: el.scrollLeft,
      dragged: false,
    }
    setEventBannerDragging(true)
  }

  const handleEventBannerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = eventBannerScrollRef.current
    const drag = eventBannerDragRef.current
    if (!el || !drag.isDown) return
    const delta = e.pageX - drag.startX
    if (Math.abs(delta) > 5) drag.dragged = true
    el.scrollLeft = drag.scrollLeft - delta
  }

  const handleEventBannerMouseEnd = () => {
    eventBannerDragRef.current.isDown = false
    setEventBannerDragging(false)
    const wasDragged = eventBannerDragRef.current.dragged
    if (wasDragged) {
      window.setTimeout(() => {
        eventBannerDragRef.current.dragged = false
      }, 0)
    }
  }

  const handleEventCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (eventBannerDragRef.current.dragged) {
      e.preventDefault()
    }
  }

  useEffect(() => {
    if (isLoading) return
    setPostsLoading(true)
    Promise.all([getDbFeedPosts(), getDbCommunityPosts()])
      .then(([dbFeedPosts, dbCommunityPosts]) => {
        const dbFeedCards = dbFeedPosts.map(feedToCard)
        const mockFeedCards = feedPosts.filter(p => !isDbPostId(p.id)).map(feedToCard)
        const popular = [...dbFeedCards, ...mockFeedCards]
        setPopularPosts(popular)

        const dbCommunityCards = dbCommunityPosts.map(communityToCard)
        const mockCommunityCards = communityPosts.filter(p => !isDbPostId(p.id)).map(communityToCard)
        const latest = [...dbCommunityCards, ...mockCommunityCards]
        setLatestPosts(latest)
      })
      .catch(() => {
        const popular = feedPosts.filter(p => !isDbPostId(p.id)).map(feedToCard)
        const latest = communityPosts.filter(p => !isDbPostId(p.id)).map(communityToCard)
        setPopularPosts(popular)
        setLatestPosts(latest)
      })
      .finally(() => setPostsLoading(false))
  }, [isLoading])

  // 행사 배너 — 마운트 시 1회 로딩 (탭 무관)
  useEffect(() => {
    getEventPosts()
      .then(data => setPracticeEvents(data.slice(0, 5)))
      .catch(() => setPracticeEvents([]))
      .finally(() => setEventsLoading(false))
  }, [])

  // 가족 구성원 ID 조회 — family_id 변경 시 갱신
  useEffect(() => {
    if (!user?.family_id) {
      setFamilyMemberIds(new Set())
      return
    }
    supabase
      .from('users')
      .select('id')
      .eq('family_id', user.family_id)
      .then(({ data }) => {
        setFamilyMemberIds(new Set((data ?? []).map((u: { id: string }) => u.id)))
      })
  }, [user?.family_id])

  // 토스트 타이머 언마운트 정리
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => setToast(null), 2800)
  }, [])

  useEffect(() => {
    if (!user) return
    const allIds = Array.from(new Set([...popularPosts.map(p => p.id), ...latestPosts.map(p => p.id)]))
    getMyLikes(allIds).then(setLikedIds)
  }, [user, popularPosts, latestPosts])

  const handleLike = async (e: React.MouseEvent, postId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (likingRef.current.has(postId)) return

    likingRef.current.add(postId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      if (!currentUser) { router.push('/login'); return }
      const isLiked = likedIds.has(postId)
      setLikedIds(prev => {
        const next = new Set(prev)
        isLiked ? next.delete(postId) : next.add(postId)
        return next
      })
      const basePost = [...popularPosts, ...latestPosts].find(p => p.id === postId)
      setLikeCounts(prev => ({
        ...prev,
        [postId]: (prev[postId] ?? basePost?.likes ?? 0) + (isLiked ? -1 : 1),
      }))
      await toggleLike(postId)
    } finally {
      likingRef.current.delete(postId)
    }
  }

  const removePost = (postId: string) => {
    setPopularPosts(prev => prev.filter(p => p.id !== postId))
    setLatestPosts(prev => prev.filter(p => p.id !== postId))
  }

  const toggleExpand = (e: React.MouseEvent, postId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(postId) ? next.delete(postId) : next.add(postId)
      return next
    })
  }

  const openLightbox = (e: React.MouseEvent, images: string[], index: number) => {
    e.preventDefault()
    e.stopPropagation()
    setLightbox({ images, index })
  }

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setLightbox(prev => prev && prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev)
      if (e.key === 'ArrowRight') setLightbox(prev => prev && prev.index < prev.images.length - 1 ? { ...prev, index: prev.index + 1 } : prev)
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])


  const getLikeCount = (post: CardPost) => likeCounts[post.id] ?? post.likes
  const getCommentCount = (post: CardPost) => commentCounts[post.id] ?? post.comments
  const filtered = feedTab === '우리 가족'
    ? popularPosts.filter(p => p.authorId != null && familyMemberIds.has(p.authorId))
    : popularPosts

  const activePost = useMemo((): FeedPost | null => {
    if (!activeCommentPostId) return null
    const activeCardPost = [...popularPosts, ...latestPosts].find(
      p => p.id === activeCommentPostId
    ) ?? null
    if (!activeCardPost) return null
    return {
      id: activeCardPost.id,
      type: 'text',
      author: { nickname: activeCardPost.authorName, avatar: activeCardPost.authorAvatar, status: activeCardPost.authorStatus },
      title: activeCardPost.title,
      description: activeCardPost.preview,
      images: activeCardPost.images,
      likes: activeCardPost.likes,
      comments: activeCardPost.comments,
      category: activeCardPost.category,
      postType: activeCardPost.postType,
    }
  }, [activeCommentPostId, popularPosts, latestPosts])

  const handleCommentCountChange = useCallback((postId: string, count: number) => {
    setCommentCounts(prev => ({ ...prev, [postId]: count }))
  }, [])

  // 5번째 게시글 아래 삽입할 행사 배너 (모든 탭에서 항상 노출)
  const eventBannerNode = (eventsLoading || practiceEvents.length > 0) ? (
    <div className="py-1">
      {eventsLoading && (
        <section>
          <div className="h-5 bg-brand-card rounded w-36 mb-3 animate-pulse" />
          <div className="flex flex-row gap-3 overflow-x-auto scrollbar-hide [&::-webkit-scrollbar]:hidden -mx-4 px-4">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="flex-shrink-0 w-72 bg-white rounded-2xl border border-brand-line p-4 animate-pulse h-40" />
            ))}
          </div>
        </section>
      )}
      {!eventsLoading && practiceEvents.length > 0 && (
        <section>
          <h2 className="text-base font-bold mb-3 flex items-center gap-1.5 text-brand-text">
            <Calendar size={17} className="text-brand-green" /> 참여할 수 있는 행사
          </h2>
          <div
            ref={eventBannerScrollRef}
            className={`flex flex-row gap-3 overflow-x-auto scrollbar-hide [&::-webkit-scrollbar]:hidden -mx-4 px-4 pb-2 cursor-grab ${eventBannerDragging ? 'select-none cursor-grabbing' : ''}`}
            onMouseDown={handleEventBannerMouseDown}
            onMouseMove={handleEventBannerMouseMove}
            onMouseUp={handleEventBannerMouseEnd}
            onMouseLeave={handleEventBannerMouseEnd}
          >
            {practiceEvents.map(event => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                draggable={false}
                onClick={handleEventCardClick}
                className="flex-shrink-0 w-72 bg-white rounded-2xl border border-brand-line p-4 flex flex-col hover:bg-brand-card transition-colors"
              >
                <span className="self-start text-[10px] px-2 py-0.5 bg-brand-green-light text-brand-green rounded-full font-medium mb-2">
                  {EVENT_TYPE_LABEL[event.category ?? ''] ?? event.category ?? '행사'}
                </span>
                <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-2">{event.title}</h3>
                <p className="text-sm text-brand-sub line-clamp-3 mb-2">{event.content ?? ''}</p>
                <div className="text-xs text-brand-muted space-y-0.5 mb-3">
                  <div>{formatEventDate(event.event_start_at)}</div>
                  {event.event_location && <div className="line-clamp-1">{event.event_location}</div>}
                </div>
                <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-brand-line/50">
                  <span className="text-xs text-brand-muted">최대 {event.event_max_participants ?? '-'}명</span>
                  {event.event_merit_reward > 0 && (
                    <span className="text-xs font-medium text-brand-green flex-shrink-0">
                      +{event.event_merit_reward}NP
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  ) : null

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      {/* 상단 sticky 헤더 — 피드 탭 (X 스타일 언더라인) */}
      <div className="sticky top-14 lg:top-0 z-20 bg-brand-bg/95 backdrop-blur-sm border-b border-brand-line">
        <div className="flex">
          {FEED_TABS.map(t => (
            <button
              key={t}
              onClick={() => {
                if (t === '우리 가족' && !user?.family_id) {
                  showToast('가족을 연결하면 우리 가족 피드가 생겨요')
                  return
                }
                setFeedTab(t)
              }}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors border-b-2 ${
                feedTab === t
                  ? 'border-brand-green text-brand-text'
                  : 'border-transparent text-brand-sub'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 목록 */}
      <div className="px-4 lg:px-6 py-4 space-y-4">
        {postsLoading ? (
          [1, 2, 3].map(n => (
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
                <div className="h-3 bg-brand-card rounded w-2/3" />
              </div>
            </div>
          ))
        ) : (
          <>
            {filtered.map((post, index) => {
              const isExpanded = expandedIds.has(post.id)
              return (
                <Fragment key={post.id}>
                  <div className="bg-white rounded-2xl border border-brand-line overflow-x-hidden">

                    {/* 구역 A: 텍스트 — 클릭 시 상세 이동 */}
                    <Link href={`/community/${post.id}`} className="block p-4 pb-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2 mb-3">
                        <img src={post.authorAvatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{post.authorName}</div>
                          <div className="text-xs text-brand-muted">{post.authorStatus}</div>
                        </div>
                        {post.category === '인증' && (
                          <span className="text-[10px] px-2 py-0.5 bg-brand-green-light text-brand-green-dark rounded-full font-medium flex-shrink-0">
                            인증
                          </span>
                        )}
                        {user && (
                          <PostMenu
                            postId={post.id}
                            authorId={post.authorId}
                            isMock={!post.authorId}
                            onDeleted={() => removePost(post.id)}
                            className="flex-shrink-0"
                          />
                        )}
                      </div>

                      <h3 className="font-semibold text-base leading-snug mb-2">{post.title}</h3>

                      <PostPreview
                        text={post.preview}
                        isExpanded={isExpanded}
                        onToggle={(e) => toggleExpand(e, post.id)}
                      />
                    </Link>

                    {/* 구역 B: 사진 — 클릭 시 라이트박스 */}
                    {post.images.length === 1 && (
                      <div className="px-4 pb-3">
                        <button
                          type="button"
                          onClick={(e) => openLightbox(e, post.images, 0)}
                          className="block"
                        >
                          <div className="w-64 h-48 rounded-xl overflow-hidden">
                            <img src={post.images[0]} alt="" className="w-full h-full object-cover" />
                          </div>
                        </button>
                      </div>
                    )}
                    {post.images.length > 1 && (
                      <ImageStrip
                        images={post.images}
                        onOpen={(e, idx) => openLightbox(e, post.images, idx)}
                      />
                    )}

                    {/* 구역 C: 액션 */}
                    <div className="flex items-center gap-4 px-4 py-3 text-sm text-brand-muted border-t border-brand-line/50">
                      <button
                        type="button"
                        onClick={(e) => handleLike(e, post.id)}
                        className={`flex items-center gap-1.5 transition-colors ${likedIds.has(post.id) ? 'text-red-500' : ''}`}
                      >
                        <Heart size={16} fill={likedIds.has(post.id) ? 'currentColor' : 'none'} />
                        {getLikeCount(post)}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setActiveCommentPostId(post.id)
                        }}
                        className="flex items-center gap-1.5 hover:text-brand-text transition-colors"
                      >
                        <MessageSquare size={16} />{getCommentCount(post)}
                      </button>
                      <ShareMenu
                        title={post.title}
                        url={typeof window !== 'undefined' ? `${window.location.origin}/community/${post.id}` : `/community/${post.id}`}
                        className="ml-auto -my-1"
                      />
                    </div>
                  </div>

                  {/* 5번째 게시글(index 4) 아래에 행사 배너 삽입 */}
                  {index === 4 && eventBannerNode}
                </Fragment>
              )
            })}

            {/* 게시글이 5개 미만이면 목록 끝에 행사 배너 노출 */}
            {filtered.length < 5 && eventBannerNode}
          </>
        )}
      </div>

      <CommentDrawer
        post={activePost}
        onClose={() => setActiveCommentPostId(null)}
        onCommentCountChange={handleCommentCountChange}
        postType={activePost?.postType}
      />

      {/* 토스트 메시지 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-brand-text text-white text-sm px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}

      {/* FAB 글쓰기 */}
      <Link href="/community/write" className="fixed right-4 bottom-24 lg:bottom-8 lg:right-8 z-30 w-14 h-14 bg-brand-green rounded-full shadow-xl flex items-center justify-center text-white">
        <PenSquare size={22} />
      </Link>

      {/* 라이트박스 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
          onClick={() => { if (!lbMouseMoved.current) setLightbox(null) }}
          onMouseDown={e => { lbMouseStartX.current = e.clientX; lbMouseMoved.current = false }}
          onMouseMove={e => { if (lbMouseStartX.current !== null && Math.abs(e.clientX - lbMouseStartX.current) > 5) lbMouseMoved.current = true }}
          onMouseUp={e => {
            if (lbMouseStartX.current === null) return
            const dx = e.clientX - lbMouseStartX.current
            lbMouseStartX.current = null
            if (dx > 50) setLightbox(prev => prev && prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev)
            if (dx < -50) setLightbox(prev => prev && prev.index < prev.images.length - 1 ? { ...prev, index: prev.index + 1 } : prev)
          }}
          onMouseLeave={() => { lbMouseStartX.current = null }}
          onTouchStart={e => { lbTouchStartX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (lbTouchStartX.current === null) return
            const dx = e.changedTouches[0].clientX - lbTouchStartX.current
            lbTouchStartX.current = null
            if (dx > 50) setLightbox(prev => prev && prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev)
            if (dx < -50) setLightbox(prev => prev && prev.index < prev.images.length - 1 ? { ...prev, index: prev.index + 1 } : prev)
          }}
        >
          {/* 닫기 */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setLightbox(null) }}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={18} />
          </button>

          {/* 사진 영역 */}
          <div className="relative flex items-center justify-center w-full px-12" onClick={e => e.stopPropagation()}>
            {lightbox.index > 0 && (
              <button
                type="button"
                onClick={() => setLightbox(prev => prev ? { ...prev, index: prev.index - 1 } : prev)}
                className="absolute left-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            <img
              key={lightbox.index}
              src={lightbox.images[lightbox.index]}
              alt=""
              className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl object-contain select-none"
              style={{ animation: 'lbFadeIn .18s ease' }}
            />

            {lightbox.index < lightbox.images.length - 1 && (
              <button
                type="button"
                onClick={() => setLightbox(prev => prev ? { ...prev, index: prev.index + 1 } : prev)}
                className="absolute right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          {/* 도트 인디케이터 (20장 이하) or 카운터 */}
          <div className="mt-5" onClick={e => e.stopPropagation()}>
            {lightbox.images.length <= 20 ? (
              <div className="flex gap-1.5">
                {lightbox.images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox(prev => prev ? { ...prev, index: i } : prev)}
                    className={`rounded-full transition-all ${
                      i === lightbox.index ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/35'
                    }`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/50">{lightbox.index + 1} / {lightbox.images.length}</p>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes lbFadeIn { from { opacity: 0; transform: scale(.97) } to { opacity: 1; transform: scale(1) } }`}</style>
    </div>
  )
}
