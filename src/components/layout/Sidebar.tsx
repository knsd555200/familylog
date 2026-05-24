'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, MessageSquare, ShoppingBag, User, Bell, LogOut, LogIn } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const tabs = [
  { href: '/home', label: '홈', icon: Home },
  { href: '/community', label: '커뮤니티', icon: MessageSquare },
  { href: '/store', label: '스토어', icon: ShoppingBag },
  { href: '/my', label: '마이', icon: User },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isLoggedIn } = useAuth()

  return (
    <div className="flex flex-col h-full px-4 py-6">
      <Link href="/community" className="flex items-center gap-2.5 mb-8 px-2">
        <img src="/familog_logo_가로.png" alt="패밀로그" className="h-9 w-auto object-contain" />
      </Link>
      <nav className="flex-1 space-y-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/home' && pathname.startsWith(href) && href !== '/community') || (href === '/community' && (pathname === '/' || pathname === '/community'))
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-brand-green-light text-brand-green-dark' : 'text-brand-sub hover:bg-brand-card'}`}>
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}
        <Link href="/notifications"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${pathname === '/notifications' ? 'bg-brand-green-light text-brand-green-dark' : 'text-brand-sub hover:bg-brand-card'}`}>
          <Bell size={18} strokeWidth={1.8} />
          알림
        </Link>
      </nav>
      <div className="border-t border-brand-line pt-4 mt-4">
        {isLoggedIn && user ? (
          <div className="flex items-center gap-3 px-2">
            <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.nickname}</div>
              <div className="text-xs text-brand-muted">🌿 {user.points}P</div>
            </div>
            <button onClick={() => { logout(); router.push('/community') }} className="p-1.5 rounded-lg hover:bg-brand-card text-brand-muted">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link href="/login" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-brand-sub hover:bg-brand-card">
            <LogIn size={18} />
            로그인
          </Link>
        )}
      </div>
    </div>
  )
}
