'use client'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { ChevronLeft } from 'lucide-react'

type Tab = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const { isLoggedIn, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      router.replace('/community')
    }
  }, [isLoggedIn, isLoading, router])

  const [tab, setTab] = useState<Tab>('login')

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
  const [signupDone, setSignupDone] = useState(false)
  const signupPasswordRef = useRef<HTMLInputElement>(null)
  const signupConfirmRef = useRef<HTMLInputElement>(null)

  const handleEmailLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('이메일 또는 비밀번호가 틀렸어요')
      setLoading(false)
    } else {
      // 전체 페이지 새로고침으로 이동해 세션·상태가 확실히 반영되도록 함
      window.location.href = '/community'
    }
  }

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

  const handleSignUp = async () => {
    setSignupError('')
    if (signupPassword !== confirmPassword) {
      setSignupError('비밀번호가 일치하지 않아요')
      return
    }
    setSignupLoading(true)
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setSignupError(toSignupErrorMessage(error.message))
      setSignupLoading(false)
    } else {
      setSignupDone(true)
    }
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    setError('')
    setSignupError('')
  }

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
              <img src="/familog logo full(1).png" alt="패밀로그 로고" className="w-96 max-w-[90vw] h-auto mx-auto object-contain" />
            </Link>
          </div>

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

          {/* 회원가입 탭 */}
          {tab === 'signup' && signupDone && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-brand-green-light rounded-xl text-center">
                <p className="text-sm text-brand-green font-medium leading-relaxed">
                  인증 메일을 보냈어요. 이메일을 확인하고 링크를 클릭하면 가입이 완료돼요.
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-brand-sub mb-2">이미 가입하셨나요?</p>
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="text-sm text-brand-green font-medium underline"
                >
                  로그인하기
                </button>
              </div>
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

        </div>
      </div>
    </div>
  )
}
