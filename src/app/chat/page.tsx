'use client'
import Link from 'next/link'
import { chatRooms } from '@/data/notifications'
import { Search, MessageSquarePlus } from 'lucide-react'

export default function ChatPage() {
  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      {/* Search */}
      <div className="sticky top-14 lg:top-0 z-20 bg-brand-bg/95 backdrop-blur-sm border-b border-brand-line px-4 lg:px-6 py-3">
        <div className="flex items-center gap-2 bg-white border border-brand-line rounded-full px-4 py-2">
          <Search size={16} className="text-brand-muted" />
          <input
            placeholder="가족이나 메시지 검색"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="divide-y divide-brand-line">
        {chatRooms.map(r => (
          <Link key={r.id} href={`/chat/${r.id}`} className="flex items-center gap-3 px-4 lg:px-6 py-3.5 hover:bg-brand-card transition-colors">
            <img src={r.avatar} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{r.name}</span>
                <span className="text-[10px] text-brand-muted flex-shrink-0">{r.time}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-xs text-brand-sub truncate flex-1">{r.lastMessage}</p>
                {r.unread > 0 && (
                  <span className="bg-brand-blue text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 flex-shrink-0">
                    {r.unread}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* FAB */}
      <button className="fixed right-4 bottom-24 lg:bottom-8 lg:right-8 z-30 w-14 h-14 bg-brand-blue rounded-full shadow-xl flex items-center justify-center text-white">
        <MessageSquarePlus size={22} />
      </button>
    </div>
  )
}
