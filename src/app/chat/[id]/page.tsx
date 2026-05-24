'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { chatRooms } from '@/data/notifications'
import { ChevronLeft, Send, Plus, Smile, Phone, MoreVertical } from 'lucide-react'

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const [input, setInput] = useState('')
  const room = chatRooms.find(r => r.id === params.id)

  if (!room) {
    return <div className="p-6 text-center text-sm">대화방을 찾을 수 없어요.</div>
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Top */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-brand-line bg-white">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-brand-sub lg:hidden">
          <ChevronLeft size={22} />
        </button>
        <img src={room.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{room.name}</div>
          <div className="text-[10px] text-brand-muted">활동 중</div>
        </div>
        <button className="p-2 text-brand-sub"><Phone size={18} /></button>
        <button className="p-2 text-brand-sub"><MoreVertical size={18} /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-brand-card">
        {room.messages.map((m, i) => {
          const prevSameSide = i > 0 && room.messages[i-1].isMine === m.isMine
          return (
            <div key={m.id} className={`flex ${m.isMine ? 'justify-end' : 'justify-start'} gap-2`}>
              {!m.isMine && !prevSameSide && (
                <img src={room.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
              )}
              {!m.isMine && prevSameSide && <div className="w-7" />}
              <div className={`max-w-[70%]`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.isMine ? 'bg-brand-blue text-white rounded-br-sm' : 'bg-white text-brand-text rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
                <div className={`text-[10px] text-brand-muted mt-1 ${m.isMine ? 'text-right' : 'text-left'}`}>{m.time}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-brand-line bg-white flex items-center gap-2">
        <button className="p-2 text-brand-sub"><Plus size={20} /></button>
        <div className="flex-1 flex items-center bg-brand-card rounded-full pr-1">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="메시지 입력"
            className="flex-1 bg-transparent px-4 py-2 text-sm outline-none"
          />
          <button className="p-1 text-brand-sub"><Smile size={18} /></button>
          <button
            disabled={!input.trim()}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${input.trim() ? 'bg-brand-blue text-white' : 'bg-brand-line text-white'}`}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
