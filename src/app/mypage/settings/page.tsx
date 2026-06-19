'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Pencil, Globe, Bell, Lock, BookOpen, MessageSquare, LogOut, Receipt, Building2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { VisibilitySheet } from '@/components/VisibilitySheet'
import { canManageEvents } from '@/lib/api/eventManager'

export default function SettingsPage() {
  const router = useRouter()
  const { user, logout, updateUser } = useAuth()
  // 행사 진입점 분기 — canManage: 관리 권한(admin·event_manager), isSuperAdmin: 심사 권한
  const canManage    = canManageEvents(user?.role)
  const isSuperAdmin = user?.role === 'admin'
  const [toast, setToast] = useState<string | null>(null)
  const [showVisibility, setShowVisibility] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const showToast = (msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(msg)
    timerRef.current = setTimeout(() => setToast(null), 2800)
  }

  const stub = () => showToast('준비 중이에요')

  const handleVisibilityChange = async (v: string) => {
    if (!user || v === user.visibility) return
    const prev = user.visibility
    updateUser({ visibility: v })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { updateUser({ visibility: prev }); return }
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          apikey:         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization:  `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Prefer:         'return=minimal',
        },
        body: JSON.stringify({ visibility: v }),
      })
      if (!res.ok) updateUser({ visibility: prev })
    } catch {
      updateUser({ visibility: prev })
    }
  }

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
            <button onClick={() => setShowVisibility(true)}
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

        {/* 활동 섹션 */}
        <section>
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2 px-1">활동</h2>
          <div className="bg-white rounded-2xl border border-brand-line divide-y divide-brand-line overflow-hidden">
            <button onClick={() => router.push('/mypage/points')}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-brand-card transition-colors">
              <Receipt size={17} className="text-brand-sub flex-shrink-0" />
              <span className="flex-1 text-sm text-brand-text text-left">활동·포인트 기록</span>
              <ChevronRight size={16} className="text-brand-muted" />
            </button>
          </div>
        </section>

        {/* 행사 섹션 — 일반: 주최 신청 / 수퍼관리자: 심사 (관리는 마이페이지 '행사' 탭) */}
        {/*  · 비-admin 행사관리자는 표시할 항목이 없어 섹션 자체를 숨김 */}
        {(!canManage || isSuperAdmin) && (
          <section>
            <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2 px-1">행사</h2>
            <div className="bg-white rounded-2xl border border-brand-line divide-y divide-brand-line overflow-hidden">
              {!canManage && (
                <button onClick={() => router.push('/events/apply')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-brand-card transition-colors">
                  <Building2 size={17} className="text-brand-sub flex-shrink-0" />
                  <span className="flex-1 text-sm text-brand-text text-left">행사 주최 신청</span>
                  <ChevronRight size={16} className="text-brand-muted" />
                </button>
              )}
              {isSuperAdmin && (
                <button onClick={() => router.push('/admin/event-managers')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-brand-card transition-colors">
                  <ShieldCheck size={17} className="text-brand-sub flex-shrink-0" />
                  <span className="flex-1 text-sm text-brand-text text-left">행사 관리자 심사</span>
                  <ChevronRight size={16} className="text-brand-muted" />
                </button>
              )}
            </div>
          </section>
        )}

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

      {/* 공개 범위 시트 */}
      {showVisibility && user && (
        <VisibilitySheet
          current={user.visibility}
          onSelect={handleVisibilityChange}
          onClose={() => setShowVisibility(false)}
        />
      )}
    </div>
  )
}
