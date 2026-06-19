'use client'
import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Target, User, Bell, LogOut, LogIn } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import AuthSheet from '@/components/auth/AuthSheet'

const tabs = [
  { href: '/community', label: '홈', icon: Home },
  { href: '/benefits', label: '미션', icon: Target },
  { href: '/mypage', label: '마이', icon: User },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isLoggedIn } = useAuth()
  // 로그인 모달 표시 여부 — 페이지 이동 대신 시트로 인증 폼을 띄운다
  const [showAuth, setShowAuth] = useState(false)
  const handleAuthClose = useCallback(() => setShowAuth(false), [])
  const handleAuthSuccess = useCallback(() => setShowAuth(false), [])

  return (
    <div className="flex flex-col h-full px-4 py-6">
      <Link href="/community" className="flex items-center gap-2.5 mb-8 px-2">
        <img src="/logo-wordmark.png" alt="패밀로그" className="h-14 w-auto object-contain" />
      </Link>
      <nav className="flex-1 space-y-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
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
          <button onClick={() => setShowAuth(true)} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-brand-sub hover:bg-brand-card">
            <LogIn size={18} />
            로그인
          </button>
        )}
      </div>

      {/* 로그인/회원가입 시트 — 사이드바 래퍼(z-20 컨텍스트)를 벗어나도록 body에 포털 렌더 */}
      {showAuth && createPortal(
        <AuthSheet initialTab="login" onClose={handleAuthClose} onSuccess={handleAuthSuccess} />,
        document.body
      )}
    </div>
  )
}
