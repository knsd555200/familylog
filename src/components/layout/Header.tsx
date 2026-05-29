'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getUnreadNotificationCount } from '@/lib/api/posts'

const TITLES: Record<string, string> = {
  '/home': '홈', '/community': '커뮤니티', '/store': '스토어',
  '/my': '마이', '/notifications': '알림', '/events': '행사 & 모임',
}

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, user } = useAuth()
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

  const showPoints = user != null && (
    pathname === '/mypage' || pathname.startsWith('/mypage/') || pathname === '/benefits'
  )

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-sm border-b border-brand-line lg:hidden h-14">
      <div className="flex items-center justify-between h-full px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          {isDetail ? (
            <button onClick={() => router.back()} className="p-1 -ml-1 text-brand-sub flex items-center gap-1">
              <ChevronLeft size={24} />
              {title && <span className="font-medium text-brand-text text-sm">{title}</span>}
            </button>
          ) : (
            <Link href="/feed" className="flex items-center gap-2">
              <img src="/familog_logo_가로.png" alt="패밀로그" className="h-7 w-auto object-contain" />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1">
          {showPoints && (
            <span className="text-xs font-semibold text-brand-green">
              {user!.points.toLocaleString()}NP
            </span>
          )}
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
