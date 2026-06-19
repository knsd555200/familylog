'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import Header from './Header'
import PageTransition from './PageTransition'
import OnboardingModal from '@/components/ui/OnboardingModal'
import { useAuth } from '@/context/AuthContext'

const NO_NAV_PATHS = ['/login', '/signup']

function isChatDetail(pathname: string) {
  return pathname.startsWith('/chat/') && pathname !== '/chat'
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, status, showOnboarding, setShowOnboarding } = useAuth()

  // 프로필 미완성 가드: 로그인했지만 nickname이 없는 사용자(=온보딩 미완료)는
  // 어느 경로로 들어오든 /signup으로 보낸다. 이메일 인증 후 콜백을 거치지 않고
  // 곧바로 로그인 상태가 되는 경우(Supabase redirect 설정 등)에도 프로필 설정을 보장.
  useEffect(() => {
    if (status !== 'authenticated' || !user) return
    // 온보딩 완료 sentinel: nickname (트리거는 nickname을 null로 두므로 온보딩에서만 채워짐)
    if (user.nickname.trim()) return
    if (pathname === '/signup' || pathname === '/login') return
    router.replace('/signup')
  }, [status, user, pathname, router])

  const hideNav = NO_NAV_PATHS.some(p => pathname.startsWith(p)) || isChatDetail(pathname)

  return (
    <>
      {/* Desktop sidebar */}
      {!hideNav && (
        <div
          className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-brand-line lg:bg-white"
          style={{ zIndex: 20 }}
        >
          <Sidebar />
        </div>
      )}

      {/* Main content */}
      <div className={!hideNav ? 'lg:ml-64' : ''}>
        {!hideNav && <Header />}
        <main className={`${!hideNav ? 'pb-20 lg:pb-0 pt-14 lg:pt-0' : ''}`}>
          <PageTransition>{children}</PageTransition>
        </main>
        {!hideNav && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20 }}>
            <BottomNav />
          </div>
        )}
      </div>

      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
    </>
  )
}