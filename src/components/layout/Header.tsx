'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, ChevronLeft, PenSquare, UserRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getUnreadNotificationCount } from '@/lib/api/posts'

const TITLES: Record<string, string> = {
  '/community': '커뮤니티', '/store': '스토어',
  '/my': '마이', '/notifications': '알림', '/events': '행사 & 모임',
  '/benefits': '미션', '/benefits/missions': '도전 과제',
}

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0)
      return
    }
    getUnreadNotificationCount().then(setUnreadCount)
  }, [pathname, isLoggedIn])

  const isDetail = pathname.split('/').length > 2
  const basePath = '/' + pathname.split('/')[1]
  const title = TITLES[pathname] || TITLES[basePath] || ''

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-sm border-b border-brand-line lg:hidden h-14">
      <div className="grid grid-cols-3 items-center h-full px-4 max-w-lg mx-auto">

        {/* 왼쪽 — 상세: 뒤로가기 / 메인: 글쓰기 or 로그인 */}
        <div className="flex items-center">
          {isDetail ? (
            <button onClick={() => router.back()} className="p-1 -ml-1 text-brand-sub">
              <ChevronLeft size={24} />
            </button>
          ) : isLoggedIn ? (
            <Link href="/community/write" className="p-2 -ml-2 text-brand-text">
              <PenSquare size={22} />
            </Link>
          ) : (
            <Link href="/login" className="flex items-center gap-1 text-xs font-medium text-brand-sub border border-brand-line rounded-full px-2.5 py-1">
              <UserRound size={13} />
              로그인
            </Link>
          )}
        </div>

        {/* 가운데 — 상세: 페이지 타이틀 / 메인: 로고 */}
        <div className="flex justify-center items-center">
          {isDetail ? (
            <span className="font-medium text-brand-text text-sm truncate">{title}</span>
          ) : (
            <Link href="/community">
              <img src="/familog_logo_가로.png" alt="패밀로그" className="h-7 w-auto object-contain" />
            </Link>
          )}
        </div>

        {/* 오른쪽 — 알림벨 */}
        <div className="flex justify-end">
          <Link href="/notifications" className="relative p-2 text-brand-sub">
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {unreadCount >= 10 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>

      </div>
    </header>
  )
}
