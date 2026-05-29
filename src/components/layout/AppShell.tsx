'use client'
import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import Header from './Header'
import OnboardingModal from '@/components/ui/OnboardingModal'
import { useAuth } from '@/context/AuthContext'

const NO_NAV_PATHS = ['/login', '/signup']

function isChatDetail(pathname: string) {
  return pathname.startsWith('/chat/') && pathname !== '/chat'
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { showOnboarding, setShowOnboarding } = useAuth()

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
          {children}
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