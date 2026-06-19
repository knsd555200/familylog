'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type AuthTab = 'login' | 'signup'

/**
 * 로그인/회원가입 폼.
 * 탭 전환·입력·Supabase 인증 호출까지 폼 로직을 한 곳에 모은다.
 * 인증 성공 후 무엇을 할지(리다이렉트/모달 닫기 등)는 onSuccess로 호출처가 주입.
 * 풀스크린 페이지(login)와 모달(헤더) 양쪽에서 동일하게 재사용한다.
 */
export default function AuthForm({
  initialTab = 'login',
  onSuccess,
}: {
  initialTab?: AuthTab
  onSuccess: (kind: AuthTab) => void | Promise<void>
}) {
  const [tab, setTab] = useState<AuthTab>(initialTab)
  const [signupDone, setSignupDone] = useState(false)

  // 호출처가 initialTab을 나중에 확정하는 경우(예: ?tab 쿼리 파싱) 반영
  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  // 로그인
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

  // 회원가입
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [signupError, setSignupError] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const signupPasswordRef = useRef<HTMLInputElement>(null)
  const signupConfirmRef = useRef<HTMLInputElement>(null)

  // 인증 진행 중 재클릭/중복 onSuccess 호출 방지 (버튼 disabled와 이중 방어)
  const processingRef = useRef(false)

  const handleEmailLogin = useCallback(async () => {
    if (processingRef.current) return
    processingRef.current = true
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('이메일 또는 비밀번호가 틀렸어요')
      setLoading(false)
      processingRef.current = false
      return
    }
    // 성공 후처리는 호출처가 결정 (페이지: 리다이렉트 / 모달: 닫기)
    await onSuccess('login')
    processingRef.current = false
  }, [email, password, onSuccess])

  const toSignupErrorMessage = (message: string) => {
    if (message.includes('Unable to validate email address: invalid format')) {
      return '올바른 이메일 형식이 아니에요'
    }
    if (message.includes('Password should be at least')) {
      return '비밀번호는 8자 이상이어야 해요'
    }
    if (message.includes('User already registered')) {
      return '이미 가입된 이메일이에요'
    }
    return '회원가입에 실패했어요. 다시 시도해주세요'
  }

  const handleSignUp = useCallback(async () => {
    if (processingRef.current) return
    setSignupError('')
    if (signupPassword !== confirmPassword) {
      setSignupError('비밀번호가 일치하지 않아요')
      return
    }
    processingRef.current = true
    setSignupLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setSignupError(toSignupErrorMessage(error.message))
      setSignupLoading(false)
      processingRef.current = false
    } else if (data.session) {
      // 이메일 자동확인 환경: signUp과 동시에 로그인됨 → 호출처가 온보딩으로 보냄
      await onSuccess('signup')
      processingRef.current = false
    } else {
      // 이메일 확인 필요: 메일 발송 완료 메시지 표시 (세션 없음 → 후처리 없음)
      setSignupDone(true)
      processingRef.current = false
    }
  }, [signupEmail, signupPassword, confirmPassword, onSuccess])

  const switchTab = (t: AuthTab) => {
    setTab(t)
    setError('')
    setSignupError('')
  }

  return (
    <>
      {/* 탭 */}
      <div className="flex bg-brand-card rounded-xl p-1 mb-6">
        <button
          onClick={() => switchTab('login')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'login' ? 'bg-white text-brand-text shadow-sm' : 'text-brand-muted'}`}
        >
          로그인
        </button>
        <button
          onClick={() => switchTab('signup')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'signup' ? 'bg-white text-brand-text shadow-sm' : 'text-brand-muted'}`}
        >
          회원가입
        </button>
      </div>

      {/* 로그인 탭 */}
      {tab === 'login' && (
        <div className="space-y-2">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                passwordRef.current?.focus()
              }
            }}
            className="w-full px-4 py-3 bg-white border border-brand-line rounded-xl text-sm outline-none focus:border-brand-green"
          />
          <input
            ref={passwordRef}
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleEmailLogin()
              }
            }}
            className="w-full px-4 py-3 bg-white border border-brand-line rounded-xl text-sm outline-none focus:border-brand-green"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleEmailLogin}
            disabled={loading}
            className="w-full py-3 bg-brand-green text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </div>
      )}

      {/* 회원가입 완료 — 인증 없이 즉시 로그인되어 곧 온보딩으로 이동 */}
      {tab === 'signup' && signupDone && (
        <div className="mt-6 p-4 bg-brand-green-light rounded-xl text-center">
          <p className="text-sm text-brand-green font-medium leading-relaxed">
            가입 완료! 프로필 설정으로 이동할게요…
          </p>
        </div>
      )}

      {tab === 'signup' && !signupDone && (
        <div className="mt-4 space-y-2">
          <input
            type="email"
            placeholder="이메일"
            value={signupEmail}
            onChange={e => setSignupEmail(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                signupPasswordRef.current?.focus()
              }
            }}
            className="w-full px-4 py-3 bg-white border border-brand-line rounded-xl text-sm outline-none focus:border-brand-green"
          />
          <input
            ref={signupPasswordRef}
            type="password"
            placeholder="비밀번호"
            value={signupPassword}
            onChange={e => setSignupPassword(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                signupConfirmRef.current?.focus()
              }
            }}
            className="w-full px-4 py-3 bg-white border border-brand-line rounded-xl text-sm outline-none focus:border-brand-green"
          />
          <input
            ref={signupConfirmRef}
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSignUp()
              }
            }}
            className="w-full px-4 py-3 bg-white border border-brand-line rounded-xl text-sm outline-none focus:border-brand-green"
          />
          {signupError && <p className="text-xs text-red-500">{signupError}</p>}
          <button
            onClick={handleSignUp}
            disabled={signupLoading}
            className="w-full py-3 bg-brand-green text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {signupLoading ? '가입 중...' : '이메일로 가입하기'}
          </button>
        </div>
      )}
    </>
  )
}
