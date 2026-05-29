'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Pencil, Globe, Bell, Lock, BookOpen, MessageSquare, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function SettingsPage() {
  const router = useRouter()
  const { logout } = useAuth()
  const [toast, setToast] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const showToast = (msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(msg)
    timerRef.current = setTimeout(() => setToast(null), 2800)
  }

  const stub = () => showToast('준비 중이에요')

  const handleLogout = () => {
    logout()
    router.push('/community')
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      {/* 상단 바 */}
      <div className="sticky top-14 lg:top-0 z-20 bg-white border-b border-brand-line px-4 lg:px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-brand-sub">
          <ArrowLeft size={20} />
        </button>
        <span className="font-semibold text-base">계정 설정</span>
      </div>

      <div className="px-4 lg:px-6 py-5 space-y-5">
        {/* 계정 설정 섹션 */}
        <section>
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2 px-1">계정 설정</h2>
          <div className="bg-white rounded-2xl border border-brand-line divide-y divide-brand-line overflow-hidden">
            <button onClick={() => router.push('/mypage/edit')}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-brand-card transition-colors">
              <Pencil size={17} className="text-brand-sub flex-shrink-0" />
              <span className="flex-1 text-sm text-brand-text text-left">프로필 수정</span>
              <ChevronRight size={16} className="text-brand-muted" />
            </button>
            <button onClick={stub}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-brand-card transition-colors">
              <Globe size={17} className="text-brand-sub flex-shrink-0" />
              <span className="flex-1 text-sm text-brand-text text-left">공개 범위 설정</span>
              <ChevronRight size={16} className="text-brand-muted" />
            </button>
            <button onClick={stub}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-brand-card transition-colors">
              <Bell size={17} className="text-brand-sub flex-shrink-0" />
              <span className="flex-1 text-sm text-brand-text text-left">알림 설정</span>
              <ChevronRight size={16} className="text-brand-muted" />
            </button>
            <button onClick={stub}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-brand-card transition-colors">
              <Lock size={17} className="text-brand-sub flex-shrink-0" />
              <span className="flex-1 text-sm text-brand-text text-left">개인정보 관리</span>
              <ChevronRight size={16} className="text-brand-muted" />
            </button>
          </div>
        </section>

        {/* 고객 지원 섹션 */}
        <section>
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2 px-1">고객 지원</h2>
          <div className="bg-white rounded-2xl border border-brand-line divide-y divide-brand-line overflow-hidden">
            <button onClick={stub}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-brand-card transition-colors">
              <BookOpen size={17} className="text-brand-sub flex-shrink-0" />
              <span className="flex-1 text-sm text-brand-text text-left">서비스 안내</span>
              <ChevronRight size={16} className="text-brand-muted" />
            </button>
            <button onClick={stub}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-brand-card transition-colors">
              <MessageSquare size={17} className="text-brand-sub flex-shrink-0" />
              <span className="flex-1 text-sm text-brand-text text-left">문의하기</span>
              <ChevronRight size={16} className="text-brand-muted" />
            </button>
          </div>
        </section>

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 border border-brand-line rounded-2xl text-sm text-brand-sub hover:bg-brand-card transition-colors"
        >
          <LogOut size={15} /> 로그아웃
        </button>

        <p className="text-center text-[11px] text-brand-muted pt-2">
          패밀로그 v0.1.0 · One Family under God, one family at a time
        </p>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-brand-text text-white text-sm px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
