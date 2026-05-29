'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Target, User } from 'lucide-react'

const tabs = [
  { href: '/community', label: '홈',  icon: Home   },
  { href: '/benefits',  label: '미션', icon: Target },
  { href: '/mypage',    label: '마이', icon: User   },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-brand-line lg:hidden overflow-visible">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {tabs.map(({ href, label, icon: Icon }, index) => {
          const active    = pathname === href || pathname.startsWith(href + '/')
          const isCenter  = index === 1
          if (isCenter) {
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-0.5 min-w-0 flex-1 -mt-5">
                <div className="w-14 h-14 rounded-full bg-brand-green flex items-center justify-center shadow-lg border-[3px] border-white">
                  <Icon size={24} strokeWidth={2} className="text-white" />
                </div>
                <span className={`text-[10px] font-medium ${active ? 'text-brand-green' : 'text-brand-muted'}`}>{label}</span>
              </Link>
            )
          }
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors min-w-0 flex-1 ${active ? 'text-brand-green' : 'text-brand-muted'}`}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-[10px] font-medium ${active ? 'text-brand-green' : 'text-brand-muted'}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
