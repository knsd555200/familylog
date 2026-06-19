'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { consumePendingInvite } from '@/lib/pendingInvite'
import { ChevronLeft } from 'lucide-react'
import AuthForm, { AuthTab } from '@/components/auth/AuthForm'

export default function LoginPage() {
  const router = useRouter()
  const { isLoggedIn, isLoading } = useAuth()
  const [initialTab, setInitialTab] = useState<AuthTab>('login')

  // 진입 시 ?tab=signup이면 회원가입 탭으로 시작 (모델하우스 CTA가 이 쿼리로 보냄)
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t === 'signup' || t === 'login') setInitialTab(t)
  }, [])

  // 로그인된 상태에서: 초대 링크로 들어온 기존 유저면 합류 페이지로, 그 외엔 /community로
  // (가입 직후 온보딩 이동은 onSuccess에서 별도 처리)
  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      const inviteCode = consumePendingInvite()
      if (inviteCode) {
        router.replace(`/invite/${inviteCode}`)
      } else if (window.location.pathname !== '/community') {
        router.replace('/community')
      }
    }
  }, [isLoggedIn, isLoading, router])

  // 인증 성공 후처리: 가입은 프로필 설정으로, 로그인은 위 isLoggedIn effect가 담당
  const handleSuccess = useCallback((kind: AuthTab) => {
    if (kind === 'signup') router.replace('/signup')
  }, [router])

  return (
    <div className="relative min-h-dvh flex flex-col bg-brand-bg">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center px-4 py-3">
        <button onClick={() => router.back()} className="p-1 text-brand-sub">
          <ChevronLeft size={22} />
        </button>
      </div>

      <div className="flex w-full flex-1 min-h-0 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-2">
            <Link href="/community" className="inline-block">
              <img src="/logo-slogan.png" alt="패밀로그 로고" className="w-96 max-w-[90vw] h-auto mx-auto object-contain" />
            </Link>
          </div>

          <AuthForm initialTab={initialTab} onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  )
}
