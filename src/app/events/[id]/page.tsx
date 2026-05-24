'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getEventPostById, joinEvent, type EventPost } from '@/lib/api/events'
import { ChevronLeft, Calendar, MapPin, Users, Clock, Heart, CheckCircle, Sparkles, Send } from 'lucide-react'

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
  const [applied,   setApplied]   = useState(false)
  const [applying,  setApplying]  = useState(false)
  const [toast,     setToast]     = useState<string | null>(null)
  const [donation,  setDonation]  = useState<number | null>(null)
  const [comment,   setComment]   = useState('')

  // 행사 상세 조회
  useEffect(() => {
    setLoading(true)
    setError(false)
    getEventPostById(eventId)
      .then(data => {
        if (!data) setError(true)
        else setEvent(data)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [eventId])

  // 토스트 자동 닫기
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // 참여 신청 처리
  const handleApply = async () => {
    if (!event) return

    // 비로그인 시 로그인 페이지로 이동
    if (!user) {
      router.push('/login')
      return
    }

    setApplying(true)
    const success = await joinEvent(event.id, user.id)
    setApplying(false)

    if (success) {
      setApplied(true)
    } else {
      // joinEvent가 false를 반환하면 중복 신청 또는 오류
      setToast('이미 신청한 행사예요.')
    }
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

  // ── 신청 완료 화면 ─────────────────────────────────────────────────────────
  if (applied) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-5 bg-brand-green-light rounded-full flex items-center justify-center">
            <CheckCircle size={42} className="text-brand-green" />
          </div>
          <h1 className="font-serif font-bold text-2xl mb-2">신청 완료!</h1>
          <p className="text-sm text-brand-sub mb-6 leading-relaxed">
            "{event.title}" 신청이 완료되었어요. 자세한 안내는 알림으로 보내드릴게요.
          </p>
          {/* merit_reward 값으로 포인트 표시 */}
          {event.event_merit_reward > 0 && (
            <div className="bg-brand-green-light rounded-2xl p-4 mb-6 inline-flex items-center gap-2">
              <Sparkles size={16} className="text-brand-green" />
              <span className="text-sm font-medium text-brand-green-dark">+{event.event_merit_reward}P 적립되었어요</span>
            </div>
          )}
          <div className="space-y-2">
            <button
              onClick={() => router.push('/events')}
              className="w-full py-3 bg-brand-green text-white rounded-2xl font-medium text-sm"
            >
              다른 행사 보기
            </button>
            <button
              onClick={() => router.push('/my')}
              className="w-full py-3 border border-brand-line text-brand-sub rounded-2xl font-medium text-sm"
            >
              내 활동 내역 보기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 행사 상세 ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto pb-32 lg:pb-6">
      {/* 토스트 메시지 */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-brand-text text-white text-sm px-5 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {/* 데스크톱 뒤로가기 */}
      <div className="hidden lg:block px-6 py-4 border-b border-brand-line">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-brand-sub text-sm">
          <ChevronLeft size={18} /> 뒤로
        </button>
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

          {event.event_max_participants != null && (
            <div className="flex items-start gap-3">
              <Users size={18} className="text-brand-green mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-brand-muted">최대 참여 인원</div>
                <div className="text-sm font-medium">{event.event_max_participants}명</div>
              </div>
            </div>
          )}

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
          <section className="mb-6">
            <h2 className="font-medium text-base mb-2">행사 소개</h2>
            <p className="text-sm leading-relaxed text-brand-sub whitespace-pre-line">{event.content}</p>
          </section>
        )}

        {/* 후원하기 — DB에 donationOptions 컬럼 없으므로 mock에서 유지하지 않고 숨김 */}

        {/* 댓글 섹션 — mock 유지 */}
        <section>
          <h2 className="font-medium text-sm mb-4">행사 댓글</h2>
          <div className="text-center py-6 text-sm text-brand-muted">
            아직 댓글이 없어요. 첫 댓글을 남겨주세요.
          </div>
          <div className="flex items-center gap-2 bg-brand-card rounded-full pr-1">
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="응원 한마디"
              className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none"
            />
            <button className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center">
              <Send size={14} className="text-white" />
            </button>
          </div>
        </section>
      </div>

      {/* 하단 고정 신청 버튼 */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-white border-t border-brand-line p-3 z-30 lg:left-64">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleApply}
            disabled={applying}
            className="w-full py-3.5 bg-brand-green text-white rounded-2xl font-medium text-sm disabled:opacity-60"
          >
            {applying ? '신청 중...' : `참여 신청하기${donation ? ` + ${donation.toLocaleString()}원 후원` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
