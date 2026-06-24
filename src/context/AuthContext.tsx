'use client'
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

const ONBOARDING_ENABLED = false // 미션 온보딩 팝업. v26: 평천하 대기 자산이라 지금은 끔. 나중에 미션 단계에서 true로.

type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated'

interface User {
  id: string
  nickname: string
  name: string
  email: string
  avatar: string
  avatarFocalX?: number
  avatarFocalY?: number
  points: number
  status: string
  tier: string
  bio: string
  role: string
  family_id: string | null
  created_at: string | null
  life_stage: string | null
  family_start_date: string | null
  visibility: string
}

interface AuthContextType {
  user: User | null
  loginWithKakao: () => void
  logout: () => void
  isLoggedIn: boolean
  // 소비 컴포넌트 호환 유지 — status === 'initializing' 파생값
  isLoading: boolean
  status: AuthStatus
  showOnboarding: boolean
  setShowOnboarding: (v: boolean) => void
  updateUser: (partial: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loginWithKakao: () => {},
  logout: () => {},
  isLoggedIn: false,
  isLoading: true,
  status: 'initializing',
  showOnboarding: false,
  setShowOnboarding: () => {},
  updateUser: () => {},
})

async function buildUser(authUser: { id: string; email?: string; user_metadata?: Record<string, string> }, accessToken: string): Promise<User> {
  const fallback: User = {
    id: authUser.id,
    // 완료 판정 sentinel이 nickname이므로 미온보딩(DB null) 상태를 '새 멤버'로 가리지 않고 빈 값으로 정직하게 둔다
    nickname: authUser.user_metadata?.nickname || '',
    name: authUser.user_metadata?.full_name || '',
    email: authUser.email || '',
    avatar: authUser.user_metadata?.avatar_url || '',
    avatarFocalX: 50,
    avatarFocalY: 50,
    points: 0,
    status: '',
    tier: '',
    bio: '',
    role: '',
    family_id: null,
    created_at: null,
    life_stage: null,
    family_start_date: null,
    visibility: 'members',
  }

  try {
    const dbUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${authUser.id}&select=id,nickname,avatar_url,avatar_focal_x,avatar_focal_y,bio,role,tier,merit_total,family_id,created_at,life_stage,family_start_date,visibility&limit=1`
    const dbRes = await fetch(dbUrl, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
    const dbArr = dbRes.ok ? await dbRes.json() : []
    const data = Array.isArray(dbArr) && dbArr.length > 0 ? dbArr[0] : null

    if (!data) return fallback

    return {
      ...fallback,
      nickname: data.nickname || fallback.nickname,
      avatar: data.avatar_url || fallback.avatar,
      avatarFocalX: data.avatar_focal_x ?? fallback.avatarFocalX,
      avatarFocalY: data.avatar_focal_y ?? fallback.avatarFocalY,
      points: data.merit_total ?? 0,
      status: data.bio || '',
      tier: data.tier || '',
      bio: data.bio || '',
      role: data.role || '',
      family_id: data.family_id ?? null,
      created_at: data.created_at ?? null,
      life_stage: data.life_stage ?? null,
      family_start_date: data.family_start_date ?? null,
      visibility: data.visibility ?? 'members',
    }
  } catch {
    return fallback
  }
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('initializing')
  // onAuthStateChange 클로저에서 최신 uid를 읽기 위한 ref (state는 클로저에서 stale하게 읽힘)
  const currentUidRef = useRef<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const isLoading = status === 'initializing'

  useEffect(() => {
    let mounted = true

    // 초기 세션을 직접 조회 — INITIAL_SESSION 이벤트 의존 제거
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return

      if (session?.user) {
        currentUidRef.current = session.user.id
        try {
          const built = await buildUser(session.user, session.access_token)
          if (!mounted) return
          setUser(built)
          setStatus('authenticated')
        } catch {
          if (!mounted) return
          currentUidRef.current = null
          setUser(null)
          setStatus('unauthenticated')
        }
      } else {
        setStatus('unauthenticated')
      }
    }).catch(() => {
      if (mounted) setStatus('unauthenticated')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 초기 세션은 getSession()으로 처리했으므로 무시
      if (event === 'INITIAL_SESSION') return

      // 토큰 갱신은 이미 로그인된 상태이므로 사용자 재조회 불필요
      if (event === 'TOKEN_REFRESHED') return

      if (session?.user) {
        // 이미 같은 uid로 로그인된 상태면 SIGNED_IN 재처리 불필요
        if (event === 'SIGNED_IN' && currentUidRef.current === session.user.id) return
        currentUidRef.current = session.user.id
        try {
          const built = await buildUser(session.user, session.access_token)
          if (!mounted) return
          setUser(built)
          setStatus('authenticated')
        } catch {
          if (!mounted) return
          currentUidRef.current = null
          setUser(null)
          setStatus('unauthenticated')
        }
        // 온보딩은 명시적 로그인 시에만 표시 (초기 세션 복원 시에는 표시하지 않음)
        if (event === 'SIGNED_IN' && mounted) {
          const hideUntil = localStorage.getItem('familog_onboarding_hide_until')
          const shouldHide = hideUntil && Date.now() < Number(hideUntil)
          if (ONBOARDING_ENABLED && !shouldHide && window.location.pathname !== '/signup') {
            setShowOnboarding(true)
          }
        }
      } else {
        if (!mounted) return
        currentUidRef.current = null
        setUser(null)
        setStatus('unauthenticated')
      }
    })

    return () => {
      mounted = false
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

  const updateUser = (partial: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...partial } : prev)
  }

  return (
    <AuthContext.Provider value={{ user, loginWithKakao, logout, isLoggedIn: !!user, isLoading, status, showOnboarding, setShowOnboarding, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
