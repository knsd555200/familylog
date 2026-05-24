'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { gatherings } from '@/data/events'
import { getEventPosts, type EventPost } from '@/lib/api/events'
import { Calendar, MapPin, Users, Clock, UserPlus } from 'lucide-react'

const TABS = ['전체', '워크숍', '봉사', '모임', '캠프', '온라인', '기타'] as const

// 탭 레이블 → DB event_type 매핑 (필터용)
const TAB_TO_EVENT_TYPE: Record<string, string> = {
  '워크숍': 'workshop',
  '봉사':   'service',
  '모임':   'meetup',
  '캠프':   'camp',
  '온라인': 'online',
  '기타':   'etc',
}

// DB event_type → 탭 레이블 매핑 (카드 배지용)
const EVENT_TYPE_TAB: Record<string, string> = {
  workshop: '워크숍',
  service:  '봉사',
  meetup:   '모임',
  camp:     '캠프',
  online:   '온라인',
  etc:      '기타',
}

// start_at을 한국어 날짜 문자열로 포맷 (값이 없으면 '미정' 반환)
function formatDate(iso: string | null): string {
  if (!iso) return '미정'
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  })
}

export default function EventsPage() {
  const [tab, setTab] = useState<typeof TABS[number]>('전체')

  // DB에서 불러온 공식 행사 목록
  const [events, setEvents] = useState<EventPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // 컴포넌트 마운트 시 행사 목록 조회
  useEffect(() => {
    setLoading(true)
    setError(false)
    getEventPosts()
      .then(data => {
        setEvents(data)
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // 선택된 탭에 맞춰 category로 필터
  const filteredEvents = tab === '전체'
    ? events
    : events.filter(e => e.category === TAB_TO_EVENT_TYPE[tab])

  const showGatherings = tab === '전체'

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      {/* 탭 */}
      <div className="sticky top-14 lg:top-0 z-20 bg-brand-bg/95 backdrop-blur-sm border-b border-brand-line">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide px-4 lg:px-6 py-3">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === t ? 'bg-brand-text text-white' : 'bg-brand-card text-brand-sub'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 lg:px-6 py-4 space-y-6">
        {/* 공식 행사 섹션 */}
        <section>
            <h2 className="font-medium text-base mb-3 flex items-center gap-1.5">
              <Calendar size={16} className="text-brand-green" /> 공식 행사
            </h2>

            {/* 로딩 스켈레톤 */}
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map(n => (
                  <div key={n} className="bg-white rounded-2xl border border-brand-line overflow-hidden animate-pulse">
                    <div className="h-36 bg-brand-card" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-brand-card rounded w-3/4" />
                      <div className="h-3 bg-brand-card rounded w-1/2" />
                      <div className="h-3 bg-brand-card rounded w-2/5" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 에러 상태 */}
            {!loading && error && (
              <div className="py-12 text-center">
                <p className="text-sm text-brand-muted">행사를 불러올 수 없어요.</p>
                <button
                  onClick={() => {
                    setError(false)
                    setLoading(true)
                    getEventPosts()
                      .then(setEvents)
                      .catch(() => setError(true))
                      .finally(() => setLoading(false))
                  }}
                  className="mt-3 text-xs text-brand-green underline"
                >
                  다시 시도
                </button>
              </div>
            )}

            {/* 행사 목록 */}
            {!loading && !error && (
              filteredEvents.length === 0 ? (
                <div className="py-12 text-center text-sm text-brand-muted">
                  해당 카테고리의 행사가 없어요.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEvents.map(e => (
                    <Link
                      key={e.id}
                      href={`/events/${e.id}`}
                      className="block bg-white rounded-2xl border border-brand-line overflow-hidden hover:bg-brand-card transition-colors"
                    >
                      <div className="relative h-36">
                        {e.thumbnail_url
                          ? <img src={e.thumbnail_url} alt={e.title ?? ''} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-brand-card flex items-center justify-center text-brand-muted text-xs">이미지 없음</div>
                        }
                        <div className="absolute top-3 left-3 flex gap-2">
                          {e.category && (
                            <span className="text-[10px] font-medium px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-brand-text">
                              {EVENT_TYPE_TAB[e.category] ?? e.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-base mb-2 leading-snug">{e.title}</h3>
                        <div className="space-y-1 text-xs text-brand-sub">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} /> {formatDate(e.event_start_at)}
                          </div>
                          {e.event_location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin size={12} /> {e.event_location}
                            </div>
                          )}
                          {e.event_max_participants != null && (
                            <div className="flex items-center gap-1.5">
                              <Users size={12} /> 최대 {e.event_max_participants}명
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            )}
          </section>

        {/* 모임 초대 섹션 — mock 유지 */}
        {showGatherings && (
          <section>
            <h2 className="font-medium text-base mb-3 flex items-center gap-1.5">
              <UserPlus size={16} className="text-brand-blue" /> 모임 초대
              <span className="text-[11px] text-brand-muted ml-1">회원이 만드는 작은 모임</span>
            </h2>
            <div className="space-y-3">
              {gatherings.map(g => (
                <div key={g.id} className="bg-white rounded-2xl border border-brand-line overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <img src={g.hostAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">{g.host}</div>
                        <div className="text-[10px] text-brand-muted">호스트</div>
                      </div>
                      <div className="text-[11px] text-brand-blue font-medium">{g.currentPeople}/{g.maxPeople}명</div>
                    </div>
                    <h3 className="font-medium text-sm mb-2 leading-snug">{g.title}</h3>
                    <p className="text-xs text-brand-sub leading-relaxed mb-3">{g.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-brand-sub mb-3">
                      <div className="flex items-center gap-1"><Calendar size={11} /> {g.date}</div>
                      <div className="flex items-center gap-1"><Clock size={11} /> {g.time}</div>
                      <div className="flex items-center gap-1 col-span-2"><MapPin size={11} /> {g.location}</div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {g.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 bg-brand-card rounded-full text-brand-sub">#{tag}</span>
                      ))}
                    </div>
                    <button className="w-full py-2 bg-brand-blue text-white text-sm font-medium rounded-xl">
                      참여 신청
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
