'use client'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { events, gatherings } from '@/data/events'
import { communityPosts } from '@/data/community'
import { Calendar, Users, MessageSquare, Heart, ChevronRight, Sparkles, Megaphone, TreePine, Award, ShoppingBag, Bell, Settings, BookOpen } from 'lucide-react'

const missionList = [
  { id: 'm1', label: '오늘의 좋아요 누르기', points: 5, done: true },
  { id: 'm2', label: '첫 댓글 달기', points: 30, done: false },
  { id: 'm3', label: '주간 모임 참여하기', points: 50, done: false },
  { id: 'm4', label: '가족 일상 한 장 올리기', points: 100, done: false },
]

export default function HomePage() {
  const { user } = useAuth()
  const completed = missionList.filter(m => m.done).length
  const upcomingEvents = events.slice(0, 4)
  const hotPosts = [...communityPosts].sort((a, b) => b.likes - a.likes).slice(0, 3)

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-6 py-4 lg:py-6 space-y-5">
      {/* Greeting */}
      <section className="bg-gradient-to-br from-brand-green to-brand-green-dark rounded-3xl p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={user?.avatar || 'https://picsum.photos/seed/guest/100/100'}
            alt=""
            className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
          />
          <div>
            <div className="text-white/80 text-xs">안녕하세요</div>
            <div className="font-medium">{user?.nickname || '게스트'}님</div>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-white/95 mb-3">
          오늘도 가족과 함께하는 좋은 하루 보내세요 🌿
        </p>
        <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3">
          <div>
            <div className="text-[11px] text-white/70">내 가정 포인트</div>
            <div className="font-bold text-lg">🌿 {user?.points || 0}P</div>
          </div>
          <Link href="/my" className="text-xs text-white/90 underline">자세히</Link>
        </div>
      </section>

      {/* Onboarding missions */}
      <section className="bg-white rounded-3xl border border-brand-line p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand-green" />
            <h2 className="font-medium text-sm">오늘의 미션</h2>
          </div>
          <span className="text-xs text-brand-muted">{completed}/{missionList.length} 완료</span>
        </div>
        <div className="w-full bg-brand-card rounded-full h-1.5 mb-4">
          <div className="bg-brand-green h-1.5 rounded-full transition-all" style={{ width: `${(completed/missionList.length)*100}%` }} />
        </div>
        <div className="space-y-2">
          {missionList.map(m => (
            <div key={m.id} className={`flex items-center gap-3 p-3 rounded-2xl ${m.done ? 'bg-brand-green-light' : 'bg-brand-card'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium ${m.done ? 'bg-brand-green text-white' : 'bg-white border border-brand-line text-brand-muted'}`}>
                {m.done ? '✓' : ''}
              </div>
              <div className={`flex-1 text-sm ${m.done ? 'text-brand-green-dark line-through' : 'text-brand-text'}`}>{m.label}</div>
              <div className="text-xs font-medium text-brand-green">+{m.points}P</div>
            </div>
          ))}
        </div>
      </section>

      {/* Activity summary 2x2 */}
      <section className="grid grid-cols-2 gap-3">
        <Link href="/community" className="bg-white rounded-2xl border border-brand-line p-4">
          <MessageSquare size={20} className="text-brand-blue mb-2" />
          <div className="text-xs text-brand-muted">내 게시글</div>
          <div className="font-bold text-xl mt-0.5">3</div>
        </Link>
        <Link href="/community" className="bg-white rounded-2xl border border-brand-line p-4">
          <Heart size={20} className="text-red-500 mb-2" />
          <div className="text-xs text-brand-muted">받은 좋아요</div>
          <div className="font-bold text-xl mt-0.5">142</div>
        </Link>
        <Link href="/events" className="bg-white rounded-2xl border border-brand-line p-4">
          <Calendar size={20} className="text-brand-green mb-2" />
          <div className="text-xs text-brand-muted">참여 행사</div>
          <div className="font-bold text-xl mt-0.5">2</div>
        </Link>
        <Link href="/my" className="bg-white rounded-2xl border border-brand-line p-4">
          <Award size={20} className="text-orange-500 mb-2" />
          <div className="text-xs text-brand-muted">활동 일수</div>
          <div className="font-bold text-xl mt-0.5">14일</div>
        </Link>
      </section>

      {/* Upcoming events */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-base flex items-center gap-1.5"><Calendar size={16} /> 다가오는 행사</h2>
          <Link href="/events" className="text-xs text-brand-muted flex items-center">전체보기 <ChevronRight size={12} /></Link>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1 w-screen max-w-full">
          {upcomingEvents.map(e => (
            <Link key={e.id} href={`/events/${e.id}`} className="flex-shrink-0 w-56 bg-white rounded-2xl border border-brand-line overflow-hidden">
              <div className="h-28 bg-brand-card relative">
                <img src={e.image} alt={e.title} className="w-full h-full object-cover" />
                {e.isDeadlineSoon && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">마감 임박</span>
                )}
              </div>
              <div className="p-3">
                <div className="text-[10px] text-brand-green font-medium mb-1">{e.category}</div>
                <div className="font-medium text-sm leading-snug line-clamp-2 mb-1.5">{e.title}</div>
                <div className="text-[11px] text-brand-muted">{e.date}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Hot posts */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-base flex items-center gap-1.5"><MessageSquare size={16} /> 지금 인기 글</h2>
          <Link href="/community" className="text-xs text-brand-muted flex items-center">전체보기 <ChevronRight size={12} /></Link>
        </div>
        <div className="bg-white rounded-2xl border border-brand-line divide-y divide-brand-line overflow-hidden">
          {hotPosts.map(p => (
            <Link key={p.id} href={`/community/${p.id}`} className="block p-4 hover:bg-brand-card">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-2 py-0.5 bg-brand-card rounded-full text-brand-sub">{p.category}</span>
                <span className="text-[10px] text-brand-muted">· {p.time}</span>
              </div>
              <div className="font-medium text-sm mb-1 line-clamp-1">{p.title}</div>
              <p className="text-xs text-brand-sub line-clamp-1 mb-2">{p.preview}</p>
              <div className="flex items-center gap-3 text-[11px] text-brand-muted">
                <span className="flex items-center gap-0.5"><Heart size={11} /> {p.likes}</span>
                <span className="flex items-center gap-0.5"><MessageSquare size={11} /> {p.comments}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Notice */}
      <section className="bg-brand-card rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Megaphone size={18} className="text-brand-sub mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs font-medium text-brand-text mb-0.5">공지: 6월 정기 점검 안내</div>
            <p className="text-xs text-brand-sub leading-relaxed">6월 20일 새벽 2시~4시 서비스 점검이 예정되어 있어요.</p>
          </div>
        </div>
      </section>

      {/* Secondary menu */}
      <section>
        <h2 className="font-medium text-base mb-3 px-1">바로가기</h2>
        <div className="grid grid-cols-4 gap-3">
          <Link href="/chat" className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-brand-line">
            <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue">
              <MessageSquare size={18} />
            </div>
            <span className="text-[11px]">채팅</span>
          </Link>
          <Link href="/notifications" className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-brand-line">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
              <Bell size={18} />
            </div>
            <span className="text-[11px]">알림</span>
          </Link>
          <Link href="/store" className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-brand-line">
            <div className="w-10 h-10 rounded-full bg-brand-green-light flex items-center justify-center text-brand-green">
              <BookOpen size={18} />
            </div>
            <span className="text-[11px]">도서</span>
          </Link>
          <Link href="/my" className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-brand-line">
            <div className="w-10 h-10 rounded-full bg-brand-card flex items-center justify-center text-brand-sub">
              <Settings size={18} />
            </div>
            <span className="text-[11px]">설정</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
