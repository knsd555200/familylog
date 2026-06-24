'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Award, Calendar, Heart, MessageSquare, ShoppingBag, Settings, ChevronRight, LogOut, Bell, Globe, Lock, Pencil, BookOpen, Sparkles } from 'lucide-react'
import { focal } from '@/lib/avatarFocal'

const POINT_HISTORY = [
  { id: 'h1', label: '주간 미션 보너스', points: 100, time: '5일 전', type: 'gain' },
  { id: 'h2', label: '행사 참여 신청', points: 50, time: '일주일 전', type: 'gain' },
  { id: 'h3', label: '댓글 5개 달기 미션', points: 30, time: '일주일 전', type: 'gain' },
  { id: 'h4', label: '도서 구매 (10% 할인 사용)', points: -180, time: '2주 전', type: 'spend' },
  { id: 'h5', label: '커뮤니티 게시글 작성', points: 100, time: '3주 전', type: 'gain' },
  { id: 'h6', label: '신규 가입 보너스', points: 300, time: '한 달 전', type: 'gain' },
]

const TIER_LABELS: Record<string, string> = {
  seed: '🌱 씨앗 멤버',
  sprout: '🌿 새싹 멤버',
  bloom: '🌸 꽃 멤버',
  fruit: '🍎 열매 멤버',
  beacon: '🏮 등대 멤버',
}

function getTierLabel(tier?: string | null) {
  return TIER_LABELS[tier ?? ''] ?? TIER_LABELS.seed
}

const FOOTPRINTS = [
  { id: 'fp1', date: '오늘', label: '커뮤니티 댓글', detail: '"민준·수진 가정"님의 글에 댓글 작성' },
  { id: 'fp2', date: '어제', label: '게시글 작성', detail: '"퇴근 후 핸드폰 내려놓기 한 달째"' },
  { id: 'fp3', date: '3일 전', label: '행사 신청', detail: '"패밀리 자연 캠프" 참여 신청' },
  { id: 'fp4', date: '일주일 전', label: '커뮤니티 댓글', detail: '"가족 식사 시간"에 댓글 작성' },
  { id: 'fp5', date: '2주 전', label: '도서 구매', detail: '"부부 대화법" 외 1권' },
]

export default function MyPage() {
  const router = useRouter()
  const { user, isLoggedIn, isLoading, logout } = useAuth()
  const [section, setSection] = useState<'footprint' | 'points' | 'settings'>('footprint')

  if (isLoading) {
    return <div className="flex items-center justify-center py-24 text-brand-muted text-sm">불러오는 중...</div>
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-6 py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-brand-card rounded-full flex items-center justify-center">
          <Award size={32} className="text-brand-muted" />
        </div>
        <h1 className="font-serif font-bold text-xl mb-2">로그인이 필요해요</h1>
        <p className="text-sm text-brand-sub mb-6 leading-relaxed">
          로그인하면 내 활동 기록, 포인트, 가족 발자취를 확인할 수 있어요.
        </p>
        <Link href="/login" className="inline-block px-6 py-3 bg-brand-green text-white rounded-full font-medium text-sm">
          로그인하기
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      {/* Profile header */}
      <section className="px-4 lg:px-6 pt-4 pb-6 bg-gradient-to-br from-brand-green to-brand-green-dark">
        <div className="flex items-center gap-4 text-white">
          <div className="relative">
            <img src={user!.avatar} alt="" className="w-16 h-16 rounded-full object-cover border-3 border-white/30" style={focal(user!.avatarFocalX, user!.avatarFocalY)} />
            <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center text-brand-green">
              <Pencil size={11} />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-lg">{user!.nickname}</div>
            <div className="text-xs opacity-80">{user!.status ?? ''}</div>
            <div className="mt-1.5 flex gap-2">
              <span className="text-[10px] px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full">{getTierLabel(user!.tier)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center text-white">
            <div className="text-[10px] opacity-80">포인트</div>
            <div className="font-bold text-base mt-0.5">🌿 {user!.points}</div>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center text-white">
            <div className="text-[10px] opacity-80">활동 일수</div>
            <div className="font-bold text-base mt-0.5">14일</div>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center text-white">
            <div className="text-[10px] opacity-80">받은 좋아요</div>
            <div className="font-bold text-base mt-0.5">142</div>
          </div>
        </div>
      </section>

      {/* Inner tabs */}
      <div className="border-b border-brand-line">
        <div className="flex">
          {([
            { id: 'footprint', label: '발자취' },
            { id: 'points', label: '포인트' },
            { id: 'settings', label: '설정' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                section === t.id ? 'border-brand-green text-brand-green-dark' : 'border-transparent text-brand-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 lg:px-6 py-5">
        {section === 'footprint' && (
          <div className="space-y-5">
            <section className="grid grid-cols-2 gap-3">
              <Link href="/community" className="bg-white rounded-2xl border border-brand-line p-4">
                <MessageSquare size={20} className="text-brand-blue mb-2" />
                <div className="text-xs text-brand-muted">내 게시글</div>
                <div className="font-bold text-xl mt-0.5">3</div>
              </Link>
              <div className="bg-white rounded-2xl border border-brand-line p-4">
                <Heart size={20} className="text-red-500 mb-2" />
                <div className="text-xs text-brand-muted">좋아요한 글</div>
                <div className="font-bold text-xl mt-0.5">27</div>
              </div>
              <Link href="/events" className="bg-white rounded-2xl border border-brand-line p-4">
                <Calendar size={20} className="text-brand-green mb-2" />
                <div className="text-xs text-brand-muted">참여 행사</div>
                <div className="font-bold text-xl mt-0.5">2</div>
              </Link>
              <Link href="/store" className="bg-white rounded-2xl border border-brand-line p-4">
                <ShoppingBag size={20} className="text-orange-500 mb-2" />
                <div className="text-xs text-brand-muted">구매한 도서</div>
                <div className="font-bold text-xl mt-0.5">5</div>
              </Link>
            </section>

            <section>
              <h2 className="font-medium text-base mb-3">최근 활동</h2>
              <div className="bg-white rounded-2xl border border-brand-line divide-y divide-brand-line overflow-hidden">
                {FOOTPRINTS.map(f => (
                  <div key={f.id} className="flex items-start gap-3 p-4">
                    <div className="w-9 h-9 rounded-full bg-brand-green-light text-brand-green flex items-center justify-center flex-shrink-0">
                      {f.label.includes('댓글') ? <MessageSquare size={15} /> :
                       f.label.includes('게시글') ? <Pencil size={15} /> :
                       f.label.includes('행사') ? <Calendar size={15} /> :
                       f.label.includes('구매') ? <ShoppingBag size={15} /> :
                       <Sparkles size={15} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{f.label}</div>
                      <div className="text-xs text-brand-sub leading-relaxed mt-0.5">{f.detail}</div>
                      <div className="text-[10px] text-brand-muted mt-1">{f.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {section === 'points' && (
          <div className="space-y-5">
            <section className="bg-white rounded-2xl border border-brand-line p-5 text-center">
              <div className="text-xs text-brand-muted">현재 보유 포인트</div>
              <div className="font-bold text-3xl mt-1">🌿 {user!.points}<span className="text-base font-medium text-brand-sub ml-1">P</span></div>
              <button className="mt-3 text-xs text-brand-green underline">포인트 사용 안내</button>
            </section>

            <section>
              <h2 className="font-medium text-base mb-3">포인트 내역</h2>
              <div className="bg-white rounded-2xl border border-brand-line divide-y divide-brand-line overflow-hidden">
                {POINT_HISTORY.map(h => (
                  <div key={h.id} className="flex items-center justify-between p-4">
                    <div>
                      <div className="text-sm font-medium">{h.label}</div>
                      <div className="text-[10px] text-brand-muted mt-0.5">{h.time}</div>
                    </div>
                    <div className={`text-sm font-bold ${h.type === 'gain' ? 'text-brand-green' : 'text-red-500'}`}>
                      {h.type === 'gain' ? '+' : ''}{h.points.toLocaleString()}P
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {section === 'settings' && (
          <div className="space-y-5">
            <section>
              <h2 className="font-medium text-base mb-3">계정 설정</h2>
              <div className="bg-white rounded-2xl border border-brand-line divide-y divide-brand-line overflow-hidden">
                <button className="w-full flex items-center justify-between p-4 hover:bg-brand-card">
                  <div className="flex items-center gap-3">
                    <Pencil size={16} className="text-brand-sub" />
                    <span className="text-sm">프로필 수정</span>
                  </div>
                  <ChevronRight size={16} className="text-brand-muted" />
                </button>
                <button className="w-full flex items-center justify-between p-4 hover:bg-brand-card">
                  <div className="flex items-center gap-3">
                    <Globe size={16} className="text-brand-sub" />
                    <span className="text-sm">공개 범위 설정</span>
                  </div>
                  <ChevronRight size={16} className="text-brand-muted" />
                </button>
                <button className="w-full flex items-center justify-between p-4 hover:bg-brand-card">
                  <div className="flex items-center gap-3">
                    <Bell size={16} className="text-brand-sub" />
                    <span className="text-sm">알림 설정</span>
                  </div>
                  <ChevronRight size={16} className="text-brand-muted" />
                </button>
                <button className="w-full flex items-center justify-between p-4 hover:bg-brand-card">
                  <div className="flex items-center gap-3">
                    <Lock size={16} className="text-brand-sub" />
                    <span className="text-sm">개인정보 관리</span>
                  </div>
                  <ChevronRight size={16} className="text-brand-muted" />
                </button>
              </div>
            </section>

            <section>
              <h2 className="font-medium text-base mb-3">고객 지원</h2>
              <div className="bg-white rounded-2xl border border-brand-line divide-y divide-brand-line overflow-hidden">
                <button className="w-full flex items-center justify-between p-4 hover:bg-brand-card">
                  <div className="flex items-center gap-3">
                    <BookOpen size={16} className="text-brand-sub" />
                    <span className="text-sm">서비스 안내</span>
                  </div>
                  <ChevronRight size={16} className="text-brand-muted" />
                </button>
                <button className="w-full flex items-center justify-between p-4 hover:bg-brand-card">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={16} className="text-brand-sub" />
                    <span className="text-sm">문의하기</span>
                  </div>
                  <ChevronRight size={16} className="text-brand-muted" />
                </button>
              </div>
            </section>

            <button
              onClick={() => { logout(); router.push('/feed') }}
              className="w-full flex items-center justify-center gap-2 py-3.5 border border-brand-line rounded-2xl text-sm text-brand-sub"
            >
              <LogOut size={15} /> 로그아웃
            </button>

            <div className="text-center text-[11px] text-brand-muted pt-4">
              패밀로그 v0.1.0 · One Family under God, one family at a time
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
