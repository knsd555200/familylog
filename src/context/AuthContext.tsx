'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
  showOnboarding: boolean
  setShowOnboarding: (v: boolean) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loginWithKakao: () => {},
  logout: () => {},
  isLoggedIn: false,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    // 앱 시작 시 저장된 세션 복원 (손상·만료 시 로컬 스토리지 정리)
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        await supabase.auth.signOut()
        setUser(null)
        return
      }
      if (session?.user) {
        const built = await buildUser(session.user)
        setUser(built)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const built = await buildUser(session.user)
        setUser(built)
        const hideUntil = localStorage.getItem('familog_onboarding_hide_until')
        const shouldHide = hideUntil && Date.now() < Number(hideUntil)
        if (!shouldHide && window.location.pathname !== '/signup') {
          setShowOnboarding(true)
        }
      } else {
        // 로그아웃 또는 토큰 갱신 실패 시 오염된 로컬 세션 제거
        const tokenRefreshFailed = event === 'TOKEN_REFRESHED' && !session
        if (event === 'SIGNED_OUT' || tokenRefreshFailed) {
          await supabase.auth.signOut()
        }
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
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
    <AuthContext.Provider value={{ user, loginWithKakao, logout, isLoggedIn: !!user, showOnboarding, setShowOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)