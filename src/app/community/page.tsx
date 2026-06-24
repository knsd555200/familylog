'use client'
import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback, Fragment, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { communityPosts } from '@/data/community'
import { feedPosts } from '@/data/feed'
import { modelHousePosts, miloneIntro } from '@/data/modelHouse'
import type { Comment, CommunityPost, FeedPost } from '@/types/post'
import { Heart, MessageSquare, PenSquare, X, ChevronLeft, ChevronRight, Calendar, Pencil, List, LayoutGrid } from 'lucide-react'
import { getDbCommunityPosts, getDbFeedPosts, getFamilyFeedPosts, getMyLikes, toggleLike, formatTime, getCommentPreviews, createComment, type CommentPreview } from '@/lib/api/posts'
import { getFamilyMemberCount, getFamilyIdentity, getAllFamilies, type FamilyAvatarSummary } from '@/lib/api/family'
import { getTimeBasedGreeting } from '@/lib/greeting'
import InviteFamilyButton from '@/components/family/InviteFamilyButton'
import CreateFamilySheet from '@/components/family/CreateFamilySheet'
import EditFamilyIdentitySheet from '@/components/family/EditFamilyIdentitySheet'
import AuthSheet from '@/components/auth/AuthSheet'
import { setPendingFamilyCreate, consumePendingFamilyCreate } from '@/lib/pendingFamilyCreate'
import { getEventPosts, type EventPost } from '@/lib/api/events'
import { canManageEvents } from '@/lib/api/eventManager'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import PostMenu from '@/components/community/PostMenu'
import ShareMenu from '@/components/community/ShareMenu'
import { MILONE_SYSTEM_USER_ID } from '@/lib/constants'
import CommentDrawer from '@/components/feed/CommentDrawer'
import { byNewest, makePopularComparator, type SortMode } from '@/lib/feed/ranking'

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
          <div className="w-56 h-44 rounded-2xl overflow-hidden pointer-events-none"> {/* 다중 사진 썸네일 크기 업 */}
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

// 이야기 탭 카드만 상대시간 대신 날짜로 보여줘 첫인상에서 신생 서비스 느낌을 줄인다.
function formatStoryCardDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function isDbPostId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

// 그리드 사진 낱장 항목 — 글 단위에서 사진 단위로 flatMap 한 결과
interface GridPhoto {
  postId: string
  title: string
  preview: string
  url: string
  imgIndexInPost: number
  imagesOfPost: string[]
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
  familyName?: string | null
  familyId?: string | null
  familyAvatar?: string | null
  postType?: string
  createdAt?: string
}

type StoryFamilyAvatar = {
  id: string
  name: string
  avatarUrl: string | null
  latestCreatedAt?: string
}

function StoryFamilyCard({
  name,
  avatarUrl,
  className = '',
}: {
  name: string
  avatarUrl: string | null
  className?: string
}) {
  return (
    <div className={`relative aspect-[3/4] rounded-xl overflow-hidden border border-brand-green/15 bg-brand-green-light/60 shadow-sm ${className}`}>
      <div className="absolute inset-0">
        {avatarUrl
          ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-brand-green flex items-center justify-center">
              <span className="text-3xl text-white">{name.charAt(0)}</span>
            </div>
        }
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 pt-8 pb-2">
        <p className="text-xs font-medium text-white truncate">{name}</p>
      </div>
    </div>
  )
}

function StoryFamilyDirectoryModal({
  families,
  loading,
  onClose,
}: {
  families: FamilyAvatarSummary[]
  loading: boolean
  onClose: () => void
}) {
  const [show, setShow] = useState(false)
  const touchY = useRef(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleClose = useCallback(() => {
    setShow(false)
    setTimeout(onClose, 300)
  }, [onClose])

  const renderContent = () => (
    <>
      <h3 className="font-serif text-lg font-semibold text-brand-text mb-1 text-center">패밀로그에 모인 가정들</h3>
      <p className="text-xs text-brand-muted text-center mb-5">서로의 하루를 함께 기록하는 가정들이에요</p>

      {loading ? (
        <p className="py-10 text-center text-sm text-brand-muted">가정을 불러오고 있어요</p>
      ) : families.length === 0 ? (
        <p className="py-10 text-center text-sm text-brand-muted">아직 함께하는 가정이 없어요</p>
      ) : (
        // 가족 전체 목록은 아직 이동 경로가 없어 카드도 비클릭으로만 보여준다.
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3 max-h-[58vh] overflow-y-auto pr-1">
          {families.map(family => (
            <StoryFamilyCard key={family.id} name={family.name} avatarUrl={family.avatar_url} className="w-full" />
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
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl
          transition-transform duration-300 ease-out ${show ? 'translate-y-0' : 'translate-y-full'}`}
        onTouchStart={e => { touchY.current = e.touches[0].clientY }}
        onTouchEnd={e => { if (e.changedTouches[0].clientY - touchY.current > 80) handleClose() }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-brand-line rounded-full" />
        </div>
        <div className="relative px-6 pb-10">
          <button type="button" onClick={handleClose} className="absolute top-4 right-4 p-1 text-brand-muted hover:text-brand-text transition-colors">
            <X size={18} />
          </button>
          {renderContent()}
        </div>
      </div>
      <div
        className={`hidden lg:flex fixed top-0 right-0 bottom-0 left-64 z-50 items-center justify-center px-4
          transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      >
        <div
          className={`relative bg-white rounded-2xl shadow-xl max-w-2xl w-full px-6 pt-6 pb-8
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

// 피드 메모리 캐시 — 재방문 시 스켈레톤 깜빡임 방지 (보여주고 뒤에서 갱신)
let feedCache: { popular: CardPost[]; latest: CardPost[] } | null = null

// mock(시드) 글에는 실제 타임스탬프가 없으므로 합성값 부여 —
// "2시간 전"부터 40분 간격으로 과거로. 새 실제 글이 항상 위에 오도록.
const MOCK_EPOCH = Date.now()
function mockCreatedAt(index: number): string {
  return new Date(MOCK_EPOCH - (120 + index * 40) * 60 * 1000).toISOString()
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
    familyName: p.familyName ?? null,
    familyId: p.familyId ?? null,
    familyAvatar: p.familyAvatar ?? null,
    postType: p.postType,
    createdAt: p.createdAt,
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
    familyName: null,
    familyId: null,
    familyAvatar: null,
    createdAt: p.createdAt,
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

// 모델하우스 작성자명 → 캐릭터 아바타 경로 (모델하우스 카드 전용)
const MODELHOUSE_AVATARS: Record<string, string> = {
  '밀로아빠': '/modelhouse/avatar-papa.png',
  '밀로엄마': '/modelhouse/avatar-mama.png',
  '밀로할아버지': '/modelhouse/avatar-grandpa.png',
  '밀로할머니': '/modelhouse/avatar-grandma.png',
}

// 모델하우스 아바타 — author명으로 캐릭터 이미지 매핑, 매핑/로드 실패 시 이니셜 원 폴백
function ModelhouseAvatar({ author, wrapClass, textClass }: { author: string; wrapClass: string; textClass: string }) {
  const src = MODELHOUSE_AVATARS[author]
  const [errored, setErrored] = useState(false)
  if (src && !errored) {
    return (
      <img
        src={src}
        alt=""
        className={`${wrapClass} rounded-full object-cover flex-shrink-0 bg-brand-card`}
        onError={() => setErrored(true)}
      />
    )
  }
  return (
    <div className={`${wrapClass} rounded-full bg-brand-green/15 flex items-center justify-center flex-shrink-0`}>
      <span className={`${textClass} font-medium text-brand-green`}>{author.charAt(0)}</span>
    </div>
  )
}

// 모델하우스 사진 — 가로형. 경로 없거나 로드 실패 시 옅은 빈 박스로 폴백(레이아웃 유지)
function ModelhousePhoto({ src }: { src: string }) {
  const [errored, setErrored] = useState(false)
  return (
    <div className="w-full aspect-[16/9] overflow-hidden rounded-xl bg-brand-green-light/40 flex items-center justify-center">
      {errored ? (
        <span className="text-xs text-brand-muted select-none">이미지</span>
      ) : (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      )}
    </div>
  )
}

// 중첩 포함 총 댓글 수 — "모두 보기" 노출 판정용
function countComments(list: Comment[]): number {
  return list.reduce((n, c) => n + 1 + (c.replies ? countComments(c.replies) : 0), 0)
}

// 모델하우스 댓글 — 실제 피드 미리보기와 같은 모양 + 대댓글(replies) 들여쓰기 + ㄴ 연결선
function ModelhouseComment({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
  const isReply = depth > 0
  return (
    <div className={isReply ? 'mt-2' : ''} style={isReply ? { marginLeft: depth * 20 } : undefined}>
      <div className="flex items-start gap-1.5">
        {/* 대댓글 연결선 — ㄴ 모양으로 부모와의 연결점 강조 */}
        {isReply && (
          <span className="text-brand-muted text-base leading-6 flex-shrink-0 select-none -mr-0.5" aria-hidden="true">ㄴ</span>
        )}
        <ModelhouseAvatar author={comment.author} wrapClass="w-6 h-6 mt-0.5" textClass="text-[10px]" />
        <p className="flex-1 min-w-0 text-sm leading-snug line-clamp-2">
          <span className="font-medium text-brand-text">{comment.author}</span>{' '}
          <span className="text-brand-sub">{comment.content}</span>
        </p>
      </div>
      {comment.replies?.map(r => <ModelhouseComment key={r.id} comment={r} depth={depth + 1} />)}
    </div>
  )
}

export default function CommunityPage() {
  return (
    <Suspense fallback={null}>
      <CommunityPageContent />
    </Suspense>
  )
}

function CommunityPageContent() {
  const { user, isLoading } = useAuth()
  // 탭 상태를 URL(?tab=family)과 동기화 — 새로고침해도 우리 가족 탭 유지
  // 초기값은 항상 '이야기'(서버 렌더와 일치) → 마운트 후 effect에서 URL 복원 (hydration mismatch 방지)
  const [feedTab, setFeedTab] = useState<FeedTab>('이야기')
  const searchParams = useSearchParams()

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'family') {
      setFeedTab('우리 가족')
    }
  }, [])

  useEffect(() => {
    const nextTab: FeedTab = searchParams.get('tab') === 'family' ? '우리 가족' : '이야기'
    setFeedTab(current => current === nextTab ? current : nextTab)
  }, [searchParams])

  const changeTab = (t: FeedTab) => {
    setFeedTab(t)
    const params = new URLSearchParams(window.location.search)
    if (t === '우리 가족') params.set('tab', 'family')
    else params.delete('tab')
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
    // 실제로 다른 탭으로 전환할 때만 문서 스크롤을 상단으로 되돌린다.
    if (t !== feedTab) window.scrollTo({ top: 0 })
  }
  const [sortMode, setSortMode] = useState<SortMode>('latest') // 기본 최신순, 인기순은 옵션
  // 우리 가족 탭 보기 방식 — 대형 카드 / 사진 그리드
  const [viewMode, setViewMode] = useState<'large' | 'grid'>('large')
  // 그리드 라이트박스 — gridPhotos 배열의 현재 인덱스 (null이면 닫힘)
  const [gridLbIdx, setGridLbIdx] = useState<number | null>(null)
  // 우리 가족 피드 — family_id 기준으로 별도 로드
  const [familyPosts, setFamilyPosts] = useState<CardPost[]>([])
  // 활성 가족 멤버 수 — 초대 배너 자가소멸 판정 (1명일 때만 배너)
  const [familyMemberCount, setFamilyMemberCount] = useState<number | null>(null)
  // 가족 정체성(이름·일수·기수·소개·대표 사진) — 상단 영역용. null = 아직 미조회(로딩 스켈레톤)
  const [familyIdentity, setFamilyIdentity] = useState<{ name: string; seq: number | null; avatarUrl: string | null; welcomeMessage: string | null; description: string | null; createdAt: string; members: { userId: string; nickname: string; avatar: string | null }[] } | null>(null)
  // 이야기 탭 가족 아바타 박스 — 요약은 피드 데이터, 전체 목록은 모달 최초 진입 때만 별도 조회한다.
  const [showAllFamiliesModal, setShowAllFamiliesModal] = useState(false)
  const [allFamilies, setAllFamilies] = useState<FamilyAvatarSummary[] | null>(null)
  const [allFamiliesLoading, setAllFamiliesLoading] = useState(false)
  // 모델하우스 "가족 만들기" — 그 자리 생성 시트
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  // 가족 정체성(가정명·소개) 편집 시트
  const [showEditIdentity, setShowEditIdentity] = useState(false)
  // 비회원 액션(좋아요·댓글·CTA) 게이트 — 페이지 이동 대신 인증 시트를 띄운다
  const [showAuth, setShowAuth] = useState(false)
  // 인증 성공 후 의도 — 'createFamily'(모델하우스 CTA)면 가정 생성으로 잇고, 그 외('close')는 닫기만
  const authIntentRef = useRef<'close' | 'createFamily'>('close')
  const handleAuthClose = useCallback(() => { authIntentRef.current = 'close'; setShowAuth(false) }, [])
  const handleAuthSuccess = useCallback(async () => {
    setShowAuth(false)
    if (authIntentRef.current !== 'createFamily') return
    authIntentRef.current = 'close' // 1회성 소비
    // 인증 직후 컨텍스트는 아직 갱신 전일 수 있어 세션에서 직접 조회(타이밍 race 회피)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data } = await supabase.from('users').select('nickname, family_id').eq('id', session.user.id).maybeSingle()
    if (data?.family_id) return                                      // 이미 가족 → 실가정 피드로 전환됨
    if (data?.nickname?.trim()) { setShowCreateSheet(true); return } // 온보딩 완료·가족無 → 바로 가정 생성
    setPendingFamilyCreate()                                         // 신규(닉네임 無) → 온보딩 후 가정 생성 예약(AppShell이 /signup로 보냄)
  }, [])

  // 온보딩 후 복귀 시 예약된 가정 생성을 연다(모델하우스 CTA 신규 가입 흐름의 마지막 단계)
  useEffect(() => {
    if (consumePendingFamilyCreate()) setShowCreateSheet(true)
  }, [])
  // 모델하우스 — 댓글 "모두 보기"로 전체 펼친 글 id (보기는 자유)
  const [mhCommentsOpen, setMhCommentsOpen] = useState<Set<string>>(new Set())
  // 댓글 미리보기 — 탭별 mode 차이 (전체=베댓1 / 가족=최근2). 글 id → 미리보기 목록
  const [feedPreviews, setFeedPreviews] = useState<Record<string, CommentPreview[]>>({})
  const [familyPreviews, setFamilyPreviews] = useState<Record<string, CommentPreview[]>>({})
  // 인라인 댓글 입력 — 글별 초안 + 제출 중 표시
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [submittingComment, setSubmittingComment] = useState<string | null>(null)
  // 전체 피드에서 "댓글 달기"를 눌러 입력란을 펼친 글들 (가족 피드는 항상 펼침)
  const [openCommentInput, setOpenCommentInput] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [popularPosts, setPopularPosts] = useState<CardPost[]>(() => feedCache?.popular ?? [])
  const [latestPosts, setLatestPosts] = useState<CardPost[]>(() => feedCache?.latest ?? [])
  // 캐시가 있으면 스켈레톤 없이 바로 표시, 없을 때(최초)만 로딩
  const [postsLoading, setPostsLoading] = useState(() => feedCache === null)
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
    // 캐시가 있으면 화면에 그대로 두고 뒤에서 조용히 갱신 (스켈레톤 X)
    if (feedCache === null) setPostsLoading(true)
    Promise.all([getDbFeedPosts(), getDbCommunityPosts()])
      .then(([dbFeedPosts, dbCommunityPosts]) => {
        const dbFeedCards = dbFeedPosts.map(feedToCard)
        const mockFeedCards = feedPosts
          .filter(p => !isDbPostId(p.id))
          .map((p, i) => feedToCard({ ...p, createdAt: p.createdAt ?? mockCreatedAt(i) }))
        const popular = [...dbFeedCards, ...mockFeedCards].sort(byNewest)
        setPopularPosts(popular)

        const dbCommunityCards = dbCommunityPosts.map(communityToCard)
        const mockCommunityCards = communityPosts
          .filter(p => !isDbPostId(p.id))
          .map((p, i) => communityToCard({ ...p, createdAt: p.createdAt ?? mockCreatedAt(i) }))
        const latest = [...dbCommunityCards, ...mockCommunityCards].sort(byNewest)
        setLatestPosts(latest)

        feedCache = { popular, latest }

        // 전체 피드 댓글 미리보기 — 베스트(좋아요 최다) 1개 (DB 글만)
        const dbIds = [...dbFeedCards, ...dbCommunityCards].map(c => c.id)
        getCommentPreviews(dbIds, 'best', 1).then(setFeedPreviews)
      })
      .catch(() => {
        const popular = feedPosts
          .filter(p => !isDbPostId(p.id))
          .map((p, i) => feedToCard({ ...p, createdAt: p.createdAt ?? mockCreatedAt(i) }))
          .sort(byNewest)
        const latest = communityPosts
          .filter(p => !isDbPostId(p.id))
          .map((p, i) => communityToCard({ ...p, createdAt: p.createdAt ?? mockCreatedAt(i) }))
          .sort(byNewest)
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

  // 가족 피드 로드 — family_id 변경 시 갱신
  useEffect(() => {
    if (!user?.family_id) {
      setFamilyPosts([])
      setFamilyMemberCount(null)
      setFamilyIdentity(null) // 가족 없으면 정체성 초기화(로딩 상태로 되돌림)
      return
    }
    getFamilyFeedPosts(user.family_id).then(posts => {
      const cards = posts.map(feedToCard)
      setFamilyPosts(cards)
      // 가족 피드 댓글 미리보기 — 최근 2개
      getCommentPreviews(cards.map(c => c.id), 'recent', 2).then(setFamilyPreviews)
    })
    // 멤버 수 조회 — 초대 배너 노출 판정
    getFamilyMemberCount(user.family_id).then(setFamilyMemberCount)
    // 가족 정체성 조회 — 상단 영역용. family_id 바뀔 때만 호출(아래 의존성 배열)
    getFamilyIdentity(user.family_id).then(setFamilyIdentity)
  }, [user?.family_id])

  // 토스트 타이머 언마운트 정리
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => setToast(null), 2800)
  }, [])

  const handleEditIdentityClose = useCallback(() => setShowEditIdentity(false), [])
  const handleEditIdentitySaved = useCallback(() => {
    setShowEditIdentity(false)
    if (user?.family_id) getFamilyIdentity(user.family_id).then(setFamilyIdentity)
  }, [user?.family_id])

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
      if (!currentUser) { setShowAuth(true); return }
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

  // 가족 피드 인라인 댓글 등록 — 상세 안 가도 바로 작성
  const handleInlineComment = async (postId: string, currentCount: number) => {
    const text = (commentDrafts[postId] ?? '').trim()
    if (!text || submittingComment === postId) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setShowAuth(true); return }

    setSubmittingComment(postId)
    const result = await createComment({ post_id: postId, content: text })
    setSubmittingComment(null)

    if (result.success) {
      setCommentDrafts(prev => ({ ...prev, [postId]: '' }))
      setCommentCounts(prev => ({ ...prev, [postId]: currentCount + 1 }))

      if (feedTab === '우리 가족') {
        // 가족 피드 = 최근 2개 미리보기 → 방금 쓴 댓글이 바로 보임
        getCommentPreviews([postId], 'recent', 2).then(p =>
          setFamilyPreviews(prev => ({ ...prev, ...p }))
        )
      } else {
        // 전체 피드 = 베댓 유지. 방금 쓴 내 댓글은 미리보기 아래에 낙관적으로 덧붙임(나에게만)
        const myPreview: CommentPreview = {
          id: `optimistic-${Date.now()}`,
          postId,
          author: user?.nickname ?? '나',
          avatar: user?.avatar ?? '',
          content: text,
          likeCount: 0,
          createdAt: new Date().toISOString(),
        }
        getCommentPreviews([postId], 'best', 1).then(best => {
          const serverList = best[postId] ?? []
          // 내 댓글이 이미 베댓으로 잡혔으면(댓글 없던 글 등) 중복 추가 안 함
          const merged = serverList.some(c => c.content === text) ? serverList : [...serverList, myPreview]
          setFeedPreviews(prev => ({ ...prev, [postId]: merged }))
        })
      }
    }
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

  // family_id 없는 사람이 '우리 가족' 탭에 있으면 모델하우스 표시
  const isModelhouse = !isLoading && feedTab === '우리 가족' && !user?.family_id
  const showFeedSkeleton = isLoading || postsLoading

  // 모델하우스 CTA — 비회원은 로그인, 회원은 그 자리에서 가족 생성 시트
  const handleModelhouseCta = () => {
    // 비회원: 인증 시트(가입탭) → 성공 시 가정 생성으로 이어지도록 의도 표시
    if (!user) { authIntentRef.current = 'createFamily'; setShowAuth(true); return }
    setShowCreateSheet(true)
  }

  const getLikeCount = (post: CardPost) => likeCounts[post.id] ?? post.likes
  const getCommentCount = (post: CardPost) => commentCounts[post.id] ?? post.comments
  const storyRecentFamilies = useMemo<StoryFamilyAvatar[]>(() => {
    const byFamily = new Map<string, StoryFamilyAvatar>()

    // 이야기 요약은 이미 불러온 public 피드에서 가족별 최신 글만 남긴다.
    for (const post of popularPosts) {
      if (!post.familyId || !post.familyName || !post.createdAt) continue
      const current = byFamily.get(post.familyId)
      if (!current || new Date(post.createdAt).getTime() > new Date(current.latestCreatedAt ?? 0).getTime()) {
        byFamily.set(post.familyId, {
          id: post.familyId,
          name: post.familyName,
          avatarUrl: post.familyAvatar ?? null,
          latestCreatedAt: post.createdAt,
        })
      }
    }

    return Array.from(byFamily.values()).sort(
      (a, b) => new Date(b.latestCreatedAt ?? 0).getTime() - new Date(a.latestCreatedAt ?? 0).getTime(),
    )
  }, [popularPosts])
  const loadAllFamiliesOnce = useCallback(async () => {
    if (allFamilies !== null || allFamiliesLoading) return
    setAllFamiliesLoading(true)
    try {
      setAllFamilies(await getAllFamilies())
    } finally {
      setAllFamiliesLoading(false)
    }
  }, [allFamilies, allFamiliesLoading])
  const handleAllFamiliesOpen = useCallback(() => {
    setShowAllFamiliesModal(true)
    loadAllFamiliesOnce()
  }, [loadAllFamiliesOnce])
  const handleAllFamiliesClose = useCallback(() => setShowAllFamiliesModal(false), [])
  // 탭 필터 → 정렬. popularPosts는 로드 시 최신순으로 보관되어 있으므로
  // 'latest'는 그대로, 'popular'만 점수순으로 재정렬한다.
  // 정렬은 로드된 likes/comments 기준(낙관적 likeCounts 미사용) — 좋아요 시 카드가 튀지 않게.
  const filtered = useMemo(() => {
    // 우리 가족 탭은 getFamilyFeedPosts로 가져온 별도 목록 사용
    const base = feedTab === '우리 가족' ? familyPosts : popularPosts
    return sortMode === 'popular'
      ? [...base].sort(makePopularComparator())
      : base
  }, [feedTab, popularPosts, familyPosts, sortMode])

  // 그리드 낱장 배열 — 글 단위 filtered를 사진 단위로 flatMap (영상 URL 제외)
  const gridPhotos = useMemo<GridPhoto[]>(() =>
    filtered.flatMap(post => {
      const imgs = post.images.filter(u => !/\.(mp4|webm|mov|avi)$/i.test(u))
      return imgs.map((url, imgIndexInPost) => ({
        postId: post.id,
        title: post.title,
        preview: post.preview,
        url,
        imgIndexInPost,
        imagesOfPost: imgs,
      }))
    }),
    [filtered]
  )

  // 그리드 라이트박스 키보드 — 대형 라이트박스 패턴 동일, gridLbIdx 열렸을 때만 리스너 부착
  useEffect(() => {
    if (gridLbIdx === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setGridLbIdx(prev => prev !== null && prev > 0 ? prev - 1 : prev)
      if (e.key === 'ArrowRight') setGridLbIdx(prev => prev !== null && prev < gridPhotos.length - 1 ? prev + 1 : prev)
      if (e.key === 'Escape') setGridLbIdx(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gridLbIdx, gridPhotos.length])

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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold flex items-center gap-1.5 text-brand-text">
              <Calendar size={17} className="text-brand-green" /> 참여할 수 있는 행사
            </h2>
            <Link href="/events" className="flex items-center text-xs font-medium text-brand-muted hover:text-brand-text transition-colors">
              전체보기 <ChevronRight size={14} />
            </Link>
          </div>
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

            {/* 주최 신청 CTA — 이미 권한자가 아닌 경우에만, 배너 끝 카드로 노출 */}
            {!canManageEvents(user?.role) && (
              <Link
                href="/events/apply"
                draggable={false}
                className="flex-shrink-0 w-56 bg-brand-green-light rounded-2xl border border-dashed border-brand-green/40 p-4 flex flex-col items-center justify-center text-center hover:bg-brand-green-light/70 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-2">
                  <Calendar size={18} className="text-brand-green" />
                </div>
                <p className="text-sm font-semibold text-brand-green-dark leading-snug">행사를 주최하시나요?</p>
                <p className="text-xs text-brand-green mt-1 leading-relaxed">단체·업체 행사 주최 신청하기</p>
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  ) : null

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      {/* 상단 sticky 헤더 — 피드 탭 (X 스타일 언더라인) */}
      <div className="sticky top-14 lg:top-0 z-20 bg-brand-bg/95 backdrop-blur-sm">
        <div className="flex border-b border-brand-line">
          {FEED_TABS.map(t => (
            <button
              key={t}
              onClick={() => changeTab(t)}
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

      {/* ── 모델하우스 (우리 가족 탭 + family_id 없음) ──────────────────────── */}
      {isModelhouse && (
        <div className="px-4 lg:px-6 pt-5 pb-8">
          {/* 환영 카피 — 밀로네 견본 가정 방문자에게 건네는 고정 인사 */}
          <div className="text-center mb-5">
            <h2 className="font-serif text-xl font-bold text-brand-text mb-3">
              밀로네 가정에 오신 걸 환영해요
            </h2>
            <p className="text-sm text-brand-sub leading-relaxed mb-1">
              별거 아닌 하루도 나누다 보면, 어느새 우리만의 이야기가 되더라고요.
            </p>
            <p className="text-sm text-brand-sub leading-relaxed">
              저희 가족은 이렇게 지내요. 아래에서 만나보세요.
            </p>
          </div>

          {/* 미리보기 — 실제 가족 피드와 같은 카드. 보는 건 자유, 참여(좋아요·댓글)만 가입으로 유도 */}
          <div className="relative">
            <div className="space-y-3">
              {modelHousePosts.map((post, i) => {
                // 사진은 mediaUrls/thumbnail에 있을 때만 (밀로네 견본은 사진 없음)
                const img = post.mediaUrls?.[0] ?? post.thumbnail
                // 카드3(i>=2)은 블러 미끼 — 보기만, 인터랙션 없음
                const isBait = i >= 2
                return (
                <div
                  key={post.id}
                  className={`bg-white rounded-2xl border border-brand-line overflow-hidden ${
                    isBait ? 'blur-sm pointer-events-none select-none' : ''
                  }`}
                  style={isBait ? { opacity: 0.55 } : undefined}
                >
                  {/* 텍스트 영역 — 클릭해도 이동/가입 안 됨(보기 자유). 더보기만 동작 */}
                  <div className="p-4 pb-3">
                    <div className="flex items-center gap-2 mb-3">
                      {/* 작성자 — author명으로 캐릭터 아바타 매핑(없으면 이니셜 원) */}
                      <ModelhouseAvatar author={post.author} wrapClass="w-9 h-9" textClass="text-sm" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{post.author}</div>
                        <div className="text-xs text-brand-muted truncate">{post.status} · {post.time}</div>
                      </div>
                    </div>
                    <h3 className="font-serif font-semibold text-base leading-snug mb-2">{post.title}</h3>
                    {/* 본문 — 실제 피드와 동일한 PostPreview(접힘 4줄 + 더보기/접기, \n 보존) */}
                    <PostPreview
                      text={post.content}
                      isExpanded={expandedIds.has(post.id)}
                      onToggle={(e) => toggleExpand(e, post.id)}
                    />
                  </div>

                  {/* 사진 — 있을 때만 가로형(폴백: 빈 박스) */}
                  {img && (
                    <div className="px-4 pb-3">
                      <ModelhousePhoto src={img} />
                    </div>
                  )}

                  {/* 액션바 — 좋아요·댓글은 참여 행동이라 누르면 가입 유도 */}
                  <div className="flex items-center gap-4 px-4 py-3 text-sm text-brand-muted border-t border-brand-line/50">
                    <button type="button" onClick={handleModelhouseCta} className="flex items-center gap-1.5 hover:text-brand-text transition-colors">
                      <Heart size={16} /> {post.likes}
                    </button>
                    <button type="button" onClick={handleModelhouseCta} className="flex items-center gap-1.5 hover:text-brand-text transition-colors">
                      <MessageSquare size={16} /> {post.comments}
                    </button>
                  </div>

                  {/* 댓글 미리보기 — 기본 최상위 3개(+대댓글 중첩), "모두 보기" 누르면 전체. 보기는 자유 */}
                  {post.commentList.length > 0 && (() => {
                    const allOpen = mhCommentsOpen.has(post.id)
                    const visible = allOpen ? post.commentList : post.commentList.slice(0, 3)
                    const totalCount = countComments(post.commentList)
                    const hasMore = countComments(visible) < totalCount
                    return (
                      <div className="px-4 pb-3 -mt-1 space-y-2">
                        {visible.map(c => (
                          <ModelhouseComment key={c.id} comment={c} />
                        ))}
                        {/* 더 있는 댓글 — 누르면 전체 펼침(가입 차단 없음) */}
                        {!allOpen && hasMore && (
                          <button
                            type="button"
                            onClick={() => setMhCommentsOpen(prev => new Set(prev).add(post.id))}
                            className="ml-8 text-xs text-brand-muted hover:text-brand-text transition-colors"
                          >
                            댓글 {totalCount}개 모두 보기
                          </button>
                        )}
                      </div>
                    )
                  })()}

                  {/* 댓글 입력 — 등록 버튼까지 바로 노출. 참여(클릭/포커스/등록)는 가입 유도 */}
                  {!isBait && (
                    <div className="flex items-center gap-2 px-4 pb-3 pt-1">
                      <input
                        readOnly
                        onClick={handleModelhouseCta}
                        onFocus={handleModelhouseCta}
                        placeholder="댓글 달기…"
                        className="flex-1 text-sm bg-brand-card rounded-full px-4 py-2 outline-none placeholder:text-brand-muted cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={handleModelhouseCta}
                        className="text-sm font-medium text-brand-green flex-shrink-0"
                      >
                        등록
                      </button>
                    </div>
                  )}
                </div>
                )
              })}
            </div>
            {/* 아래로 부드럽게 사라지는 페이드 — 블러 카드 위로 "더 있다" 암시 */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-brand-bg to-transparent pointer-events-none" />
          </div>

          {/* CTA 패널 — 페이드 위로 살짝 겹쳐 올라와 항상 한 화면에 보임 */}
          <div className="relative -mt-6 bg-white rounded-3xl border border-brand-line shadow-sm px-6 pt-8 pb-7 text-center">
            <div className="w-20 h-20 rounded-2xl bg-brand-green-light flex items-center justify-center mx-auto mb-2">
              <img src="/logo-symbol.png" alt="패밀로그" className="w-14 h-14 object-contain" />
            </div>
            <h3 className="font-serif font-bold text-lg text-brand-text mb-2">우리 가족만의 공간</h3>
            <p className="text-sm text-brand-sub leading-relaxed mb-6 whitespace-pre-line">
              {!user
                ? '가입하면 가족과 나누는\n우리만의 공간이 시작돼요'
                : '가족을 만들면\n오늘이 차곡차곡 쌓이는 공간이 열려요'}
            </p>
            <button
              onClick={handleModelhouseCta}
              className="w-full py-3.5 bg-brand-green text-white text-sm font-semibold rounded-2xl"
            >
              {!user ? '시작하기' : '우리 가족 공간 만들기'}
            </button>
            <p className="text-xs text-brand-muted mt-3">
              {!user ? '이미 계정이 있다면 로그인하면 돼요' : '초대를 받았다면 링크로 바로 합류할 수 있어요'}
            </p>
          </div>
        </div>
      )}

      {/* 카드 목록 */}
      {!isModelhouse && (
      <div className="px-4 lg:px-6 py-4 space-y-4">
        {/* ⓪ 가족 정체성 영역 — 우리 가족 탭 + family_id 있을 때 */}
        {feedTab === '우리 가족' && user?.family_id && (
          familyIdentity === null
            ? /* 조회 전 — 스켈레톤: 제목줄 + green 박스 근사 */
              <div className="space-y-2">
                <div className="px-4 pt-2 space-y-2">
                  <div className="h-7 w-3/4 bg-brand-card rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-brand-card rounded animate-pulse" />
                </div>
                <div className="bg-brand-green-light/50 rounded-2xl p-4 h-24 animate-pulse" />
              </div>
            : /* 박스 밖 제목 + green 박스 구조 */
              <div className="space-y-2">
                {/* ─── 제목 영역 — 박스 밖, 페이지 배경 위에 직접 ─────────── */}
                <div className="relative px-4 pt-2 pb-1">
                  {/* 편집 연필 — 우상단 */}
                  <button
                    type="button"
                    onClick={() => setShowEditIdentity(true)}
                    className="absolute top-0 right-0 p-2 rounded-full hover:bg-brand-card transition-colors"
                  >
                    <Pencil size={15} className="text-brand-muted" />
                  </button>

                  {/* 환영 문구 — serif, 크게 */}
                  <p className="font-serif text-2xl font-bold text-brand-text mb-1 pr-8">
                    {familyIdentity.welcomeMessage?.trim() || `${familyIdentity.name}에 오신 걸 환영해요`}
                  </p>

                  {/* 메타줄 — 작게, text-secondary */}
                  <p className="text-sm text-brand-sub">
                    {(() => {
                      const dayCount = Math.floor((Date.now() - new Date(familyIdentity.createdAt).getTime()) / 86400000) + 1
                      return familyIdentity.seq !== null
                        ? `${familyIdentity.name} · 패밀로그의 ${familyIdentity.seq}번째 가정 · ${dayCount}일차`
                        : `${familyIdentity.name} · ${dayCount}일차`
                    })()}
                  </p>
                </div>

                {/* ─── green 박스 — 공지 + 아바타 ──────────────────────────── */}
                <div className="bg-brand-green-light border border-brand-green/25 rounded-2xl p-4">
                  {/* 가족 공지 — 항상 표시. 내용 없으면 placeholder(한 톤 연한 green, 클릭 시 편집 시트) */}
                  <p className="text-[11px] font-medium text-brand-green-dark mb-0.5">가족 공지</p>
                  {familyIdentity.description?.trim()
                    ? <p className="text-sm text-brand-green-dark mb-3">{familyIdentity.description}</p>
                    : <p
                        className="text-sm text-brand-green/60 mb-3 cursor-pointer"
                        onClick={() => setShowEditIdentity(true)}
                      >
                        이번 주 가족 소식을 남겨보세요
                      </p>
                  }

                  {/* 아바타줄 + 초대. ring 색 = green 박스 배경색(흰색 금지). +N bg-white/80 으로 구분 */}
                  <div className="flex items-center gap-2">
                    {familyIdentity.members.slice(0, 6).map(m => (
                      m.avatar
                        ? <img key={m.userId} src={m.avatar} alt={m.nickname} className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-brand-green-light" />
                        : <div key={m.userId} className="w-9 h-9 rounded-full bg-brand-green flex items-center justify-center flex-shrink-0 ring-2 ring-brand-green-light">
                            <span className="text-[11px] text-white">{m.nickname.charAt(0)}</span>
                          </div>
                    ))}
                    {familyIdentity.members.length > 6 && (
                      <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center text-[10px] text-brand-green-dark flex-shrink-0">
                        +{familyIdentity.members.length - 6}
                      </div>
                    )}
                    <InviteFamilyButton variant="icon" />
                  </div>
                </div>
              </div>
        )}

        {/* 이야기 탭 입구 — 공개 기록이 모이는 광장의 정체성을 먼저 보여준다. */}
        {feedTab === '이야기' && (
          <div className="px-4 pt-2 pb-5">
            <p className="font-serif text-2xl font-bold text-brand-text leading-snug">
              서로 다른 가정의 하루가 이곳에 모여요
            </p>
          </div>
        )}

        {feedTab === '이야기' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-brand-green-dark">
                최근 이야기한 가정
              </p>
              <button
                type="button"
                onClick={handleAllFamiliesOpen}
                className="text-[11px] font-medium text-brand-green/70 hover:text-brand-green-dark transition-colors"
              >
                전체 보기
              </button>
            </div>

            {storyRecentFamilies.length === 0 ? (
              <p className="text-sm text-brand-green/60">아직 공개 이야기를 남긴 가정이 없어요</p>
            ) : (
              // 이야기 쇼츠 카드는 아직 이동 경로가 없어 비클릭 가로 목록으로만 보여준다.
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {storyRecentFamilies.slice(0, 8).map(family => (
                  <StoryFamilyCard
                    key={family.id}
                    name={family.name}
                    avatarUrl={family.avatarUrl}
                    className="w-24 flex-shrink-0"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 라벨 + 토글 — 이야기 탭: 정렬 토글, 우리 가족 탭: 대형/사진 보기 토글 */}
        {feedTab !== '우리 가족' ? (
          <div className="flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-brand-text">
              {sortMode === 'popular' ? '지금 인기 있는' : '최근 이야기'}
            </span>
            <div className="inline-flex items-center gap-0.5 bg-brand-card rounded-full p-0.5 text-xs">
              {([['latest', '최신순'], ['popular', '인기순']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    sortMode === mode
                      ? 'bg-white text-brand-text font-semibold shadow-sm'
                      : 'text-brand-muted hover:text-brand-text'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // 우리 가족 탭 헤더 — 좌: 최근 이야기 레이블, 우: 대형/사진 보기 토글
          <div className="flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-brand-text">최근 이야기</span>
            <div className="inline-flex items-center gap-0.5 bg-brand-card rounded-full p-0.5 text-xs">
              <button
                onClick={() => setViewMode('large')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full transition-colors ${
                  viewMode === 'large'
                    ? 'bg-white text-brand-text font-semibold shadow-sm'
                    : 'text-brand-muted hover:text-brand-text'
                }`}
              >
                <List size={13} /> 대형
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-brand-text font-semibold shadow-sm'
                    : 'text-brand-muted hover:text-brand-text'
                }`}
              >
                <LayoutGrid size={13} /> 사진
              </button>
            </div>
          </div>
        )}

        {showFeedSkeleton ? (
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
        ) : feedTab === '우리 가족' && viewMode === 'grid' ? (
          /* 우리 가족 사진 그리드 — 낱장 3열, 클릭 시 라이트박스 오픈 */
          gridPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-5xl mb-5">📷</div>
              <p className="font-serif text-lg font-medium text-brand-text mb-2">아직 사진이 있는 글이 없어요</p>
              <p className="text-sm text-brand-muted leading-relaxed">사진과 함께 이야기를 남겨보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {gridPhotos.map((photo, idx) => (
                <button
                  key={`${photo.postId}-${photo.imgIndexInPost}`}
                  type="button"
                  onClick={() => setGridLbIdx(idx)}
                  className="aspect-square rounded-lg overflow-hidden bg-brand-card"
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </button>
              ))}
            </div>
          )
        ) : (
          <>
            {/* 글이 없을 때 빈 상태 — 첫 기록을 유도 */}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-5xl mb-5">🌿</div>
                <p className="font-serif text-lg font-medium text-brand-text mb-2">아직 조용해요</p>
                <p className="text-sm text-brand-muted leading-relaxed mb-8">
                  {feedTab === '우리 가족'
                    ? '가족이 남긴 이야기가 여기 쌓여요'
                    : '첫 이야기를 남기면\n피드가 시작돼요'}
                </p>
                <Link
                  href="/community/write"
                  className="px-6 py-3 bg-brand-green text-white text-sm font-medium rounded-full"
                >
                  첫 이야기 남기기
                </Link>
              </div>
            )}
            {filtered.map((post, index) => {
              const isExpanded = expandedIds.has(post.id)
              // 탭별 댓글 미리보기 (전체=베댓1 / 가족=최근2)
              const previews = (feedTab === '우리 가족' ? familyPreviews : feedPreviews)[post.id] ?? []
              // 밀로네 시스템 계정 글 판별 — 단순 boolean이라 매 렌더 새 참조 생성 없음(리렌더 영향 없음)
              const isMilone = post.authorId === MILONE_SYSTEM_USER_ID
              return (
                <Fragment key={post.id}>
                  <div className="bg-white rounded-2xl border border-brand-line overflow-x-hidden">

                    {/* 구역 A: 텍스트 — 클릭 시 상세 이동 */}
                    <Link href={`/community/${post.id}`} className="block p-4 pb-3 hover:bg-gray-50/50 transition-colors">
                      {/* 밀로네는 family_id 없는 빈 계정 — 작성자 영역 클릭 시 이동 막아 일반 텍스트/이미지처럼 처리(클릭가드) */}
                      <div
                        className="flex items-center gap-2 mb-3"
                        onClick={isMilone ? (e) => { e.preventDefault(); e.stopPropagation() } : undefined}
                      >
                        <img src={post.authorAvatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {feedTab === '이야기' ? (
                            post.familyName ? (
                              <>
                                {/* 이야기 탭 — 가족명 1차, 닉네임·날짜 부제 */}
                                <div className="font-serif text-sm font-medium text-brand-green truncate">
                                  {post.familyName}
                                </div>
                                <div className="text-xs text-brand-muted truncate">
                                  {post.authorName}
                                  {post.createdAt && ` · ${formatStoryCardDate(post.createdAt)}`}
                                </div>
                              </>
                            ) : (
                              <>
                                {/* 이야기 탭 — 개인 회원: 닉네임 1차, 날짜만 부제 */}
                                <div className="text-sm font-medium truncate">{post.authorName}</div>
                                {post.createdAt && (
                                  <div className="text-xs text-brand-muted truncate">
                                    {formatStoryCardDate(post.createdAt)}
                                  </div>
                                )}
                              </>
                            )
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="text-sm font-medium truncate">{post.authorName}</div>
                                {post.familyName && (
                                  <span className="text-[11px] font-medium text-brand-green-dark bg-brand-green-light px-2 py-0.5 rounded-full flex-shrink-0">
                                    {post.familyName}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-brand-muted truncate">
                                {post.authorStatus}
                                {post.createdAt && ` · ${formatTime(post.createdAt)}`}
                              </div>
                            </>
                          )}
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

                      <h3 className="font-serif font-semibold text-base leading-snug mb-2">{post.title}</h3> {/* Serif 제목 — '기록' 정서 */}

                      <PostPreview
                        text={post.preview}
                        isExpanded={isExpanded}
                        onToggle={(e) => toggleExpand(e, post.id)}
                      />
                    </Link>

                    {/* 구역 B: 사진 — 클릭 시 라이트박스 */}
                    {post.images.length === 1 && (
                      // 단일 사진 풀블리드 — 카드 좌우 꽉 채워 기록 느낌
                      <button
                        type="button"
                        onClick={(e) => openLightbox(e, post.images, 0)}
                        className="block w-full px-4 pb-3"
                      >
                        <div className="w-full aspect-[4/3] lg:aspect-[16/9] overflow-hidden rounded-xl">
                          {isMilone ? (
                            // 밀로네 환영 글: 손 흔드는 영상 — muted+playsInline로 모바일 자동재생, poster로 로드 전/자동재생 차단·로드 실패 시 정적 이미지 폴백
                            <video
                              src="/modelhouse/welcome.mp4"
                              poster="/modelhouse/family-profile.png"
                              autoPlay
                              muted
                              loop
                              playsInline
                              className="w-full h-full object-cover"
                            >
                              {/* video 미지원 브라우저용 폴백 — 정적 이미지 */}
                              <img src="/modelhouse/family-profile.png" alt="" className="w-full h-full object-cover" />
                            </video>
                          ) : (
                            <img src={post.images[0]} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      </button>
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

                    {/* 구역 D: 댓글 미리보기 — 아바타 + 이름/내용 */}
                    {previews.length > 0 && (
                      <div className="px-4 pb-3 -mt-1 space-y-2">
                        {previews.map(c => (
                          <div key={c.id} className="flex items-start gap-2">
                            {c.avatar
                              ? <img src={c.avatar} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
                              : <div className="w-6 h-6 rounded-full bg-brand-green/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-[10px] font-medium text-brand-green">{c.author.charAt(0)}</span>
                                </div>
                            }
                            <p className="flex-1 min-w-0 text-sm leading-snug line-clamp-2">
                              <span className="font-medium text-brand-text">{c.author}</span>{' '}
                              <span className="text-brand-sub">{c.content}</span>
                            </p>
                          </div>
                        ))}
                        {getCommentCount(post) > previews.length && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveCommentPostId(post.id) }}
                            className="ml-8 text-xs text-brand-muted hover:text-brand-text transition-colors"
                          >
                            댓글 {getCommentCount(post)}개 모두 보기
                          </button>
                        )}
                      </div>
                    )}

                    {/* 인라인 댓글 입력 — DB 글만. 전체 피드는 접고(트리거만), 가족 피드는 펼친 채 */}
                    {isDbPostId(post.id) && (
                      feedTab !== '우리 가족' && !openCommentInput.has(post.id) ? (
                        /* 전체 피드 기본 — 접힌 상태, 누르면 펼침 */
                        <div className="px-4 pb-3 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault(); e.stopPropagation()
                              setOpenCommentInput(prev => new Set(prev).add(post.id))
                            }}
                            className="w-full text-left text-sm bg-brand-card rounded-full px-4 py-2 text-brand-muted hover:text-brand-text transition-colors"
                          >
                            댓글 달기…
                          </button>
                        </div>
                      ) : (
                        /* 가족 피드 or 펼친 전체 피드 — 실제 입력란 */
                        <div className="flex items-center gap-2 px-4 pb-3 pt-1">
                          <input
                            value={commentDrafts[post.id] ?? ''}
                            onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleInlineComment(post.id, getCommentCount(post)) }}
                            autoFocus={openCommentInput.has(post.id)}
                            placeholder="댓글 달기…"
                            className="flex-1 text-sm bg-brand-card rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-brand-green/40 placeholder:text-brand-muted"
                          />
                          <button
                            type="button"
                            onClick={() => handleInlineComment(post.id, getCommentCount(post))}
                            disabled={!(commentDrafts[post.id] ?? '').trim() || submittingComment === post.id}
                            className="text-sm font-medium text-brand-green disabled:text-brand-muted transition-colors flex-shrink-0"
                          >
                            {submittingComment === post.id ? '등록 중' : '등록'}
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  {/* 작성 유도 박스 — 2번째 글 아래 자연 삽입 */}
                  {index === 1 && (
                    <Link
                      href={user ? '/community/write' : '/login'}
                      className="block bg-brand-green-light/60 rounded-2xl border-2 border-brand-green/30 p-5 hover:border-brand-green/60 hover:bg-brand-green-light transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        {user ? (
                          <img
                            src={user.avatar || `https://picsum.photos/seed/${user.id}/100/100`}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          // 비로그인: 패밀로그 로고를 아바타 자리에
                          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center flex-shrink-0 p-1.5">
                            <img src="/logo-symbol.png" alt="패밀로그" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-serif font-semibold text-base text-brand-text leading-snug">
                            오늘 어떤 이야기가 있었나요?
                          </p>
                          <p className="text-xs text-brand-sub mt-0.5">
                            가족과 나누고 싶은 순간을 기록해 보세요
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 w-full py-3 bg-brand-green text-white text-sm font-semibold rounded-full">
                        <PenSquare size={17} />
                        이야기 남기기
                      </div>
                    </Link>
                  )}

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
      )}

      <CommentDrawer
        post={activePost}
        onClose={() => setActiveCommentPostId(null)}
        onCommentCountChange={handleCommentCountChange}
        postType={activePost?.postType}
      />

      {/* 모델하우스 가족 생성 시트 — 생성되면 family_id 갱신으로 가족 피드 자동 전환 */}
      {showCreateSheet && (
        <CreateFamilySheet
          onClose={() => setShowCreateSheet(false)}
          onCreated={() => setShowCreateSheet(false)}
        />
      )}

      {/* 가족 정체성 편집 시트 — family_id 불변이라 updateUser 불가 → 저장 후 직접 재조회로 상단 갱신 */}
      {showEditIdentity && familyIdentity && user?.family_id && (
        <EditFamilyIdentitySheet
          familyId={user.family_id}
          initialName={familyIdentity.name}
          initialWelcomeMessage={familyIdentity.welcomeMessage}
          initialDescription={familyIdentity.description}
          initialAvatarUrl={familyIdentity.avatarUrl}
          onClose={handleEditIdentityClose}
          onSaved={handleEditIdentitySaved}
        />
      )}

      {/* 비회원 액션 게이트 인증 시트 — 가입탭 우선(탭 전환은 시트 안에서 자유) */}
      {showAuth && (
        <AuthSheet initialTab="signup" onClose={handleAuthClose} onSuccess={handleAuthSuccess} />
      )}

      {/* 이야기 탭 전체 가족 모달 — 시트 셸만 재사용하고 가족 그리드 내용으로 채운다. */}
      {showAllFamiliesModal && (
        <StoryFamilyDirectoryModal
          families={allFamilies ?? []}
          loading={allFamiliesLoading}
          onClose={handleAllFamiliesClose}
        />
      )}

      {/* 토스트 메시지 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-brand-text text-white text-sm px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}

      {/* FAB 글쓰기 — 데스크탑 전용, 모델하우스에선 숨김 */}
      {!isModelhouse && (
        <Link href={user ? '/community/write' : '/login'} className="hidden lg:flex fixed right-8 bottom-8 z-30 w-14 h-14 bg-brand-green rounded-full shadow-xl items-center justify-center text-white">
          <PenSquare size={22} />
        </Link>
      )}

      {/* 그리드 라이트박스 — 제목(글 이동) + 확대 사진 + 현재 글 필름 스트립 */}
      {viewMode === 'grid' && gridLbIdx !== null && (() => {
        const photo = gridPhotos[gridLbIdx]
        if (!photo) return null
        // 빈 title 폴백 — 본문 앞 30자 말줄임 (파일명 절대 노출 안 함)
        const previewText = photo.preview.trim()
        const fallback = previewText ? previewText.slice(0, 30) + (previewText.length > 30 ? '…' : '') : '이야기'
        const displayTitle = photo.title.trim() || fallback
        return (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex flex-col"
            onClick={() => setGridLbIdx(null)}
            onTouchStart={e => { lbTouchStartX.current = e.touches[0].clientX }}
            onTouchEnd={e => {
              if (lbTouchStartX.current === null) return
              const dx = e.changedTouches[0].clientX - lbTouchStartX.current
              lbTouchStartX.current = null
              if (dx > 50 && gridLbIdx > 0) setGridLbIdx(gridLbIdx - 1)
              if (dx < -50 && gridLbIdx < gridPhotos.length - 1) setGridLbIdx(gridLbIdx + 1)
            }}
          >
            {/* 상단 — 닫기 버튼 + 글 제목(탭 시 상세 이동) */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setGridLbIdx(null)}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0"
              >
                <X size={18} />
              </button>
              <Link
                href={`/community/${photo.postId}`}
                onClick={() => setGridLbIdx(null)}
                className="flex-1 min-w-0"
              >
                <p className="text-white font-semibold text-sm leading-snug line-clamp-1">{displayTitle}</p>
                <p className="text-white/50 text-xs mt-0.5">탭하면 글로 이동</p>
              </Link>
            </div>

            {/* 중앙 — 확대 사진 + 좌우 화살표 */}
            <div className="flex-1 flex items-center justify-center relative min-h-0" onClick={e => e.stopPropagation()}>
              {gridLbIdx > 0 && (
                <button
                  type="button"
                  onClick={() => setGridLbIdx(gridLbIdx - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white z-10"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <img
                key={`${photo.postId}-${photo.imgIndexInPost}`}
                src={photo.url}
                alt=""
                className="max-h-full max-w-full object-contain px-14"
                style={{ animation: 'lbFadeIn .18s ease' }}
              />
              {gridLbIdx < gridPhotos.length - 1 && (
                <button
                  type="button"
                  onClick={() => setGridLbIdx(gridLbIdx + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white z-10"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            {/* 하단 — 필름 스트립(현재 글 사진) + 전체 카운터 */}
            <div className="shrink-0 px-4 pb-6 pt-3" onClick={e => e.stopPropagation()}>
              {photo.imagesOfPost.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide justify-center mb-3">
                  {photo.imagesOfPost.map((url, i) => {
                    // 필름 스트립 썸네일 탭 시 전체 배열에서 해당 사진의 인덱스로 점프
                    const targetIdx = gridPhotos.findIndex(p => p.postId === photo.postId && p.imgIndexInPost === i)
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => targetIdx >= 0 && setGridLbIdx(targetIdx)}
                        className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-opacity ${
                          i === photo.imgIndexInPost ? 'border-white opacity-100' : 'border-transparent opacity-50'
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    )
                  })}
                </div>
              )}
              {/* 전체 낱장 중 현재 위치 */}
              <p className="text-center text-white/40 text-xs">{gridLbIdx + 1} / {gridPhotos.length}</p>
            </div>
          </div>
        )
      })()}

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
