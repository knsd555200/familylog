'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageSquare, ShoppingBag, User } from 'lucide-react'

const tabs = [
  { href: '/home', label: '홈', icon: Home },
  { href: '/community', label: '커뮤니티', icon: MessageSquare },
  { href: '/store', label: '스토어', icon: ShoppingBag },
  { href: '/my', label: '마이', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-brand-line lg:hidden">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/home' && pathname.startsWith(href) && href !== '/community') || (href === '/community' && (pathname === '/' || pathname === '/community'))
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
