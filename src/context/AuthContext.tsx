'use client'
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  nickname: string
  name: string
  email: string
  avatar: string
  points: number
  status: string
  tier: string
  bio: string
  role: string
}

interface AuthContextType {
  user: User | null
  loginWithKakao: () => void
  logout: () => void
  isLoggedIn: boolean
  // 세션 초기화가 완료되기 전까지 true (로그인 상태 확인 전 깜박임 방지용)
  isLoading: boolean
  showOnboarding: boolean
  setShowOnboarding: (v: boolean) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loginWithKakao: () => {},
  logout: () => {},
  isLoggedIn: false,
  isLoading: true,
  showOnboarding: false,
  setShowOnboarding: () => {},
})

async function buildUser(authUser: { id: string; email?: string; user_metadata?: Record<string, string> }): Promise<User> {
  const fallback: User = {
    id: authUser.id,
    nickname: authUser.user_metadata?.nickname || '새 멤버',
    name: authUser.user_metadata?.full_name || '',
    email: authUser.email || '',
    avatar: authUser.user_metadata?.avatar_url || '',
    points: 0,
    status: '',
    tier: '',
    bio: '',
    role: '',
  }

  const { data } = await supabase
    .from('users')
    .select('id, nickname, avatar_url, bio, role, tier, merit_total')
    .eq('id', authUser.id)
    .maybeSingle()

  if (!data) return fallback

  return {
    ...fallback,
    nickname: data.nickname || fallback.nickname,
    avatar: data.avatar_url || fallback.avatar,
    points: data.merit_total ?? 0,
    status: data.bio || '',
    tier: data.tier || '',
    bio: data.bio || '',
    role: data.role || '',
  }
}

function logAuth(event: string, uid: string | null, message: string) {
  try {
    const existing = JSON.parse(localStorage.getItem('auth_debug_log') ?? '[]')
    const next = [...existing, {
      event,
      uid,
      message,
      pathname: window.location.pathname,
      at: new Date().toISOString(),
    }]
    localStorage.setItem('auth_debug_log', JSON.stringify(next.slice(-50)))
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // onAuthStateChange 클로저에서 최신 uid를 읽기 위한 ref (state는 클로저에서 stale하게 읽힘)
  const currentUidRef = useRef<string | null>(null)
  // 세션 확인이 완료되기 전까지 true — 이 값이 true인 동안 UI를 숨겨 깜박임 방지
  const [isLoading, setIsLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)


  useEffect(() => {
    // INITIAL_SESSION이 3초 내 발생하지 않으면 강제로 isLoading 해제 (방어적 처리)
    const loadingTimeout = setTimeout(() => setIsLoading(false), 3000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sessionDesc = session ? `uid=${session.user.id} expires=${session.expires_at}` : 'null'
      logAuth(event, session?.user.id ?? null, `onAuthStateChange: ${event} / session: ${sessionDesc}`)

      // 토큰 갱신은 이미 로그인된 상태이므로 사용자 재조회 불필요
      if (event === 'TOKEN_REFRESHED') return

      if (event === 'SIGNED_OUT') {
        logAuth('SIGNED_OUT', null, 'SIGNED_OUT 발생 — 원인 후보: refresh token 만료·무효화, 다른 탭 로그아웃, 서버 세션 삭제')
      }

      if (session?.user) {
        // 이미 같은 uid로 로그인된 상태면 SIGNED_IN 재처리 불필요
        if (event === 'SIGNED_IN' && currentUidRef.current === session.user.id) {
          logAuth('SIGNED_IN_SKIPPED', session.user.id, '이미 동일 uid로 로그인 상태')
        } else {
          try {
            const built = await buildUser(session.user)
            currentUidRef.current = built.id
            setUser(built)
          } catch (err) {
            logAuth('BUILD_USER_ERROR', session.user.id, `buildUser 실패: ${err instanceof Error ? err.message : String(err)}`)
            currentUidRef.current = null
            setUser(null)
          }
          // 온보딩은 명시적 로그인 시에만 표시 (초기 세션 복원 시에는 표시하지 않음)
          if (event === 'SIGNED_IN') {
            const hideUntil = localStorage.getItem('familog_onboarding_hide_until')
            const shouldHide = hideUntil && Date.now() < Number(hideUntil)
            if (!shouldHide && window.location.pathname !== '/signup') {
              setShowOnboarding(true)
            }
          }
        }
      } else {
        currentUidRef.current = null
        setUser(null)
      }

      // INITIAL_SESSION은 마운트 시 정확히 한 번 발생 — 세션 확인 완료 시점
      if (event === 'INITIAL_SESSION') {
        clearTimeout(loadingTimeout)
        setIsLoading(false)
      }
    })

    return () => {
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const loginWithKakao = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'profile_nickname profile_image',
      },
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loginWithKakao, logout, isLoggedIn: !!user, isLoading, showOnboarding, setShowOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)