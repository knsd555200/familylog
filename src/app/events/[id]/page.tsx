'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getEventPostById, joinEvent, type EventPost } from '@/lib/api/events'
import { toggleLike, getComments, createComment, type DbComment } from '@/lib/api/posts'
import { supabase } from '@/lib/supabase'
import PostMenu from '@/components/community/PostMenu'
import { ChevronLeft, Calendar, MapPin, Users, Clock, Heart, CheckCircle, Send, Camera } from 'lucide-react'

// start_at ~ end_at을 한국어 날짜 문자열로 포맷
function formatDateRange(startAt: string | null, endAt: string | null): string {
  if (!startAt) return '미정'
  const start = new Date(startAt).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  })
  if (!endAt) return start
  const end = new Date(endAt).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  })
  return `${start} ~ ${end}`
}

// start_at에서 시간 부분만 추출
function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  if (h === 0 && m === 0) return ''
  return `${h}시${m > 0 ? ` ${m}분` : ''}`
}

// event_type 한국어 레이블
const EVENT_TYPE_LABEL: Record<string, string> = {
  large:     '대형 행사',
  lecture:   '강연',
  camp:      '캠프',
  volunteer: '봉사',
}

export default function EventDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const { user } = useAuth()

  const eventId = params.id as string

  // 행사 데이터
  const [event,   setEvent]   = useState<EventPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  // 신청 관련 상태
  const [applied,            setApplied]            = useState(false)
  const [applying,           setApplying]           = useState(false)
  const [toast,              setToast]              = useState<string | null>(null)
  const [donation,           setDonation]           = useState<number | null>(null)
  const [showCancelConfirm,  setShowCancelConfirm]  = useState(false)

  // 좋아요 상태
  const [liked,            setLiked]            = useState(false)
  const [likeCount,        setLikeCount]        = useState(0)
  const [participantCount, setParticipantCount] = useState(0)

  // 댓글 상태
  const [dbComments,  setDbComments]  = useState<DbComment[]>([])
  const [comment,     setComment]     = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [replyTo,     setReplyTo]     = useState<{ id: string; author: string } | null>(null)

  // 행사 상세 + 댓글 로딩
  useEffect(() => {
    setLoading(true)
    setError(false)
    getEventPostById(eventId)
      .then(data => {
        if (!data) { setError(true); return }
        setEvent(data)
        setLikeCount(data.like_count ?? 0)
        getComments(data.id).then(setDbComments)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [eventId])

  // 좋아요·신청 여부 — event 로드 후 auth 세션 직접 확인
  useEffect(() => {
    if (!event) return
    // 참여자 수는 인증 없이 조회
    supabase.from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'event_join')
      .eq('target_id', event.id)
      .then(({ count }) => setParticipantCount(count ?? 0))

    // 내 좋아요·신청 여부는 세션 확인 후 조회 (코드베이스 공통 패턴: getSession)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const authUser = session?.user
      if (!authUser) return
      Promise.all([
        supabase.from('likes').select('id').eq('user_id', authUser.id).eq('target_type', 'post').eq('target_id', event.id).maybeSingle(),
        supabase.from('likes').select('id').eq('user_id', authUser.id).eq('target_type', 'event_join').eq('target_id', event.id).maybeSingle(),
      ]).then(([likeRes, joinRes]) => {
        if (likeRes.data) setLiked(true)
        setApplied(!!joinRes.data)
      })
    })
  }, [event?.id])

  // 토스트 자동 닫기
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // 참여 신청 처리
  const handleApply = async () => {
    if (!event) return
    if (!user) { router.push('/login'); return }
    if (applied) return

    setApplying(true)
    const success = await joinEvent(event.id, user.id)
    setApplying(false)

    if (success) {
      setApplied(true)
      setToast('참여 신청이 완료됐어요')
    } else {
      setToast('이미 신청한 행사예요.')
    }
  }

  // 참여 신청 취소
  const handleCancel = async () => {
    if (!user || !event) return
    const { error } = await supabase.from('likes').delete()
      .eq('user_id', user.id)
      .eq('target_type', 'event_join')
      .eq('target_id', event.id)
    if (!error) {
      setApplied(false)
      setParticipantCount(prev => Math.max(0, prev - 1))
      setShowCancelConfirm(false)
      setToast('참여 신청이 취소됐어요.')
    }
  }

  // 좋아요 토글
  const handleLike = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.push('/login'); return }
    const isLiked = liked
    setLiked(!isLiked)
    setLikeCount(prev => prev + (isLiked ? -1 : 1))
    await toggleLike(eventId)
  }

  const handleSubmitComment = async () => {
    if (!comment.trim()) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.push('/login'); return }
    setSubmitting(true)
    const result = await createComment({
      post_id: eventId,
      content: comment.trim(),
      parent_comment_id: replyTo?.id,
    })
    if (result.success) {
      setComment('')
      setReplyTo(null)
      getComments(eventId).then(setDbComments)
    }
    setSubmitting(false)
  }

  function formatCommentTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m}분 전`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}시간 전`
    const d = Math.floor(h / 24)
    return d < 7 ? `${d}일 전` : new Date(iso).toLocaleDateString('ko-KR')
  }

  // ── 로딩 중 ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto pb-32 lg:pb-6 animate-pulse">
        <div className="h-56 lg:h-72 bg-brand-card" />
        <div className="px-4 lg:px-6 py-5 space-y-4">
          <div className="h-7 bg-brand-card rounded w-3/4" />
          <div className="h-32 bg-brand-card rounded-2xl" />
          <div className="h-4 bg-brand-card rounded w-full" />
          <div className="h-4 bg-brand-card rounded w-5/6" />
        </div>
      </div>
    )
  }

  // ── 에러 / 행사 없음 ────────────────────────────────────────────────────────
  if (error || !event) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-brand-muted mb-2">행사를 찾을 수 없어요.</p>
        <Link href="/events" className="text-brand-blue text-sm">목록으로</Link>
      </div>
    )
  }

  // ── 행사 상세 ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto pb-44 lg:pb-6">
      {/* 토스트 메시지 */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-brand-text text-white text-sm px-5 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {/* 신청 취소 확인 다이얼로그 */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-brand-line rounded-full mx-auto mb-6" />
            <p className="text-base font-semibold text-brand-text mb-1">참여 신청을 취소할까요?</p>
            <p className="text-sm text-brand-muted mb-6">취소 후 다시 신청할 수 있어요.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3.5 rounded-2xl text-sm font-medium bg-brand-card text-brand-sub"
              >
                돌아가기
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-3.5 rounded-2xl text-sm font-medium bg-red-50 text-red-500"
              >
                신청 취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 데스크탑 뒤로가기 */}
      <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-brand-line">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-brand-sub text-sm">
          <ChevronLeft size={18} /> 뒤로
        </button>
        {event && (
          <PostMenu
            postId={event.id}
            authorId={event.author_id ?? undefined}
            onDeleted={() => router.push('/events')}
          />
        )}
      </div>

      {/* 썸네일 히어로 */}
      <div className="relative h-56 lg:h-72">
        {event.thumbnail_url
          ? <img src={event.thumbnail_url as string} alt={event.title ?? ''} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-brand-card flex items-center justify-center text-brand-muted text-sm">이미지 없음</div>
        }
        {event.category && (
          <div className="absolute top-4 left-4">
            <span className="text-xs font-medium px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full text-brand-text">
              {EVENT_TYPE_LABEL[event.category] ?? event.category}
            </span>
          </div>
        )}
        <div className="lg:hidden absolute top-3 right-3">
          <PostMenu
            postId={event.id}
            authorId={event.author_id ?? undefined}
            onDeleted={() => router.push('/events')}
            className="bg-white/90 backdrop-blur-sm rounded-lg"
          />
        </div>
      </div>

      <div className="px-4 lg:px-6 py-5">
        <h1 className="font-serif font-bold text-2xl leading-tight mb-3">{event.title}</h1>

        {/* 행사 정보 카드 */}
        <div className="bg-white border border-brand-line rounded-2xl p-4 mb-5 space-y-3">
          <div className="flex items-start gap-3">
            <Calendar size={18} className="text-brand-green mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-brand-muted">일정</div>
              <div className="text-sm font-medium">{formatDateRange(event.event_start_at, event.event_end_at)}</div>
              {formatTime(event.event_start_at) && (
                <div className="text-xs text-brand-sub mt-0.5">{formatTime(event.event_start_at)}</div>
              )}
            </div>
          </div>

          {event.event_location && (
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-brand-green mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-brand-muted">장소</div>
                <div className="text-sm font-medium">{event.event_location}</div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Users size={18} className="text-brand-green mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-brand-muted">참여 현황</div>
              <div className="text-sm font-medium">
                {participantCount}명 신청
                {event.event_max_participants != null && ` / 최대 ${event.event_max_participants}명`}
              </div>
            </div>
          </div>

          {/* 봉사 카테고리 행사는 Clock 아이콘으로 봉사 기록 안내 표시 */}
          {event.category === 'volunteer' && (
            <div className="flex items-start gap-3">
              <Clock size={18} className="text-brand-green mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-brand-muted">봉사 활동</div>
                <div className="text-sm font-medium">참여 시 봉사 기록 저장</div>
              </div>
            </div>
          )}
        </div>

        {/* 행사 소개 */}
        {event.content && (
          <section className="mb-5">
            <h2 className="font-medium text-base mb-2">행사 소개</h2>
            <p className="text-sm leading-relaxed text-brand-sub whitespace-pre-line">{event.content}</p>
          </section>
        )}

        {/* 좋아요 + 인증하기 */}
        <div className="flex items-center gap-2 py-3 border-y border-brand-line mb-6">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors ${
              liked ? 'bg-red-50 text-red-500' : 'text-brand-sub hover:bg-brand-card'
            }`}
          >
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
            <span className="text-sm font-medium">{likeCount}</span>
          </button>
          <div className="w-px h-4 bg-brand-line" />
          <button
            type="button"
            onClick={() => {
              if (!applied) {
                setToast('참여 신청을 먼저 해주세요')
                return
              }
              router.push(`/community/write?event_id=${eventId}&event_title=${encodeURIComponent(event.title ?? '')}&merit_reward=${event.event_merit_reward ?? 0}`)
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-brand-green hover:bg-brand-green-light transition-colors"
          >
            <Camera size={16} />
            <span className="text-sm font-medium">참여 인증하기</span>
          </button>
        </div>

        {/* 댓글 섹션 */}
        <section>
          <h2 className="font-medium text-sm mb-4">
            응원 · 문의{dbComments.length > 0 && ` ${dbComments.length}`}
          </h2>
          <div className="space-y-5">
            {dbComments.length === 0 ? (
              <div className="text-center py-8 text-sm text-brand-muted">첫 응원을 남겨보세요.</div>
            ) : (
              dbComments.filter(c => !c.parent_comment_id).map(c => (
                <div key={c.id}>
                  <div className="flex gap-2.5">
                    <img src={c.author?.avatar_url ?? 'https://i.pravatar.cc/60?img=30'} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium">{c.author?.nickname ?? '패밀로그 회원'}</span>
                      <p className="text-sm leading-relaxed mt-0.5">{c.content}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-brand-muted">{formatCommentTime(c.created_at)}</span>
                        <button
                          onClick={() => setReplyTo({ id: c.id, author: c.author?.nickname ?? '패밀로그 회원' })}
                          className="text-[11px] text-brand-muted hover:text-brand-text font-medium"
                        >
                          답글
                        </button>
                      </div>
                    </div>
                  </div>
                  {dbComments.filter(r => r.parent_comment_id === c.id).map(r => (
                    <div key={r.id} className="ml-10 mt-3 pl-3 border-l-2 border-brand-line flex gap-2.5">
                      <img src={r.author?.avatar_url ?? 'https://i.pravatar.cc/60?img=30'} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium">{r.author?.nickname ?? '패밀로그 회원'}</span>
                        <p className="text-sm leading-relaxed mt-0.5">{r.content}</p>
                        <span className="text-[11px] text-brand-muted">{formatCommentTime(r.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 하단 고정: 댓글 입력 + 신청 버튼 */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-white border-t border-brand-line z-30 lg:left-64">
        <div className="max-w-2xl mx-auto px-3 pt-2 pb-1">
          {replyTo && (
            <div className="flex items-center justify-between px-1 pb-1.5 text-xs text-brand-muted">
              <span>↩ {replyTo.author}에게 답글</span>
              <button onClick={() => setReplyTo(null)}>✕</button>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <img src={user?.avatar ?? 'https://i.pravatar.cc/60?img=30'} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
            <div className="flex-1 flex items-center bg-brand-card rounded-full pr-1">
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
                placeholder={replyTo ? `${replyTo.author}에게 답글...` : '응원 한마디 또는 문의를 남겨보세요'}
                className="flex-1 bg-transparent px-4 py-2 text-sm outline-none"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!comment.trim() || submitting}
                className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center disabled:bg-brand-line"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-3 pb-3">
          {applied ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full py-3 rounded-2xl font-medium text-sm border-2 border-brand-line text-brand-muted hover:border-red-300 hover:text-red-500 transition-colors"
            >
              참여 신청 취소
            </button>
          ) : (
            <button
              onClick={handleApply}
              disabled={applying}
              className="w-full py-3 bg-brand-green text-white rounded-2xl font-medium text-sm disabled:opacity-60"
            >
              {applying ? '신청 중...' : '참여 신청하기'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
