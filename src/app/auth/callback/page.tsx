'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/** hash(#access_token=...) 형태의 쿼리 파라미터 파싱 */
function parseHashParams(hash: string): URLSearchParams {
  if (!hash || hash === '#') return new URLSearchParams()
  const query = hash.startsWith('#') ? hash.slice(1) : hash
  return new URLSearchParams(query)
}

type OtpType =
  | 'signup'
  | 'invite'
  | 'magiclink'
  | 'recovery'
  | 'email_change'
  | 'email'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search)
        const hashParams = parseHashParams(window.location.hash)

        const code = searchParams.get('code') ?? hashParams.get('code')
        const tokenHash =
          searchParams.get('token_hash') ?? hashParams.get('token_hash')
        const type = searchParams.get('type') ?? hashParams.get('type')
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        // 1) hash fragment의 access_token → setSession으로 직접 세션 설정
        if (accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken ?? '',
          })
          if (error) throw error
        }
        // 2) OAuth / PKCE: authorization code 교환
        else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        }
        // 3) 이메일 OTP / Magic Link 등: token_hash 검증
        else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as OtpType,
          })
          if (error) throw error
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!session) {
          router.replace('/login')
          return
        }

        const { data, error: dbError } = await supabase
          .from('users')
          .select('nickname')
          .eq('id', session.user.id)
          .maybeSingle()
        if (dbError) throw dbError

        const nickname = data?.nickname?.trim()
        router.replace(nickname ? '/feed' : '/signup')
      } catch {
        // 토큰 교환·세션·DB 오류 등 모든 실패 시 로그인으로 이동
        router.replace('/login')
      }
    }

    run()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-brand-sub">로그인 중...</p>
      </div>
    </div>
  )
}
