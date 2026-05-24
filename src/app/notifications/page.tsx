'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { notifications as mockNotifications } from '@/data/notifications'
import { MessageSquare, Heart, Calendar, Coins, Megaphone, Users } from 'lucide-react'
import { getNotifications, markAllNotificationsRead, Notification } from '@/lib/api/posts'
import { useAuth } from '@/context/AuthContext'

const ICONS = {
  comment: { icon: MessageSquare, color: 'text-brand-blue', bg: 'bg-blue-50' },
  like: { icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
  event: { icon: Calendar, color: 'text-brand-green', bg: 'bg-brand-green-light' },
  point: { icon: Coins, color: 'text-orange-500', bg: 'bg-orange-50' },
  system: { icon: Megaphone, color: 'text-brand-sub', bg: 'bg-brand-card' },
  gathering: { icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d === 1) return '어제'
  if (d < 7) return `${d}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [dbNotifications, setDbNotifications] = useState<Notification[]>([])
  const [tab, setTab] = useState<'전체' | '읽지 않음' | '소셜' | '시스템'>('전체')

  useEffect(() => {
    if (!user) return
    getNotifications().then(data => {
      setDbNotifications(data)
      markAllNotificationsRead()
    })
  }, [user])

  // DB 알림이 있으면 DB만, 없으면 mock 표시
  const allNotifications = dbNotifications.length > 0
    ? dbNotifications.map(n => ({
        id: n.id,
        type: n.type as keyof typeof ICONS,
        title: n.title,
        body: n.message ?? '',
        time: formatTime(n.created_at),
        read: n.is_read,
        related_id: n.related_id,
        related_type: n.related_type,
        avatar: null,
      }))
    : mockNotifications.map(n => ({
        ...n,
        type: n.type as keyof typeof ICONS,
        related_id: null,
        related_type: null,
      }))

  const filtered = allNotifications.filter(n => {
    if (tab === '읽지 않음') return !n.read
    if (tab === '소셜') return ['like', 'comment'].includes(n.type)
    if (tab === '시스템') return ['system', 'point', 'event'].includes(n.type)
    return true
  })

  const handleClick = (n: typeof allNotifications[0]) => {
    if (n.related_type === 'post' && n.related_id) {
      router.push(`/community/${n.related_id}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-6">
      <div className="sticky top-14 lg:top-0 z-20 bg-brand-bg/95 backdrop-blur-sm border-b border-brand-line">
        <div className="flex gap-1 px-4 lg:px-6 py-3">
          {(['전체', '읽지 않음', '소셜', '시스템'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === t ? 'bg-brand-text text-white' : 'bg-brand-card text-brand-sub'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-brand-line">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-brand-muted">알림이 없어요</div>
        )}
        {filtered.map(n => {
          const conf = ICONS[n.type] ?? ICONS.system
          const Icon = conf.icon
          return (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`flex items-start gap-3 px-4 lg:px-6 py-4 cursor-pointer hover:bg-brand-card transition-colors ${!n.read ? 'bg-brand-green-light/40' : ''}`}
            >
              {n.avatar ? (
                <div className="relative flex-shrink-0">
                  <img src={n.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${conf.bg} rounded-full flex items-center justify-center border-2 border-white`}>
                    <Icon size={10} className={conf.color} />
                  </div>
                </div>
              ) : (
                <div className={`w-11 h-11 rounded-full ${conf.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={conf.color} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  {!n.read && <span className="w-1.5 h-1.5 bg-brand-green rounded-full" />}
                </div>
                <p className="text-xs text-brand-sub mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                <div className="text-[10px] text-brand-muted mt-1">{n.time}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}