'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { joinFamilyByCode } from '@/lib/api/family'

type PageState = 'loading' | 'success' | 'error' | 'redirecting'

export default function InvitePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [state, setState] = useState<PageState>('loading')
  const [message, setMessage] = useState('')
  const [familyName, setFamilyName] = useState('')

  // 중복 호출 방지 플래그
  const joinedRef = useRef(false)

  useEffect(() => {
    if (isLoading) return

    // 비로그인 → 로그인 페이지로 보내되 code를 쿼리로 보존
    if (!user) {
      setState('redirecting')
      router.replace(`/login?redirect=/invite/${code}`)
      return
    }

    if (joinedRef.current) return
    joinedRef.current = true

    // 합류 처리
    joinFamilyByCode(user.id, user.family_id, code).then((result) => {
      if (result.error) {
        setState('error')
        setMessage(result.error)
      } else {
        setFamilyName(result.familyName ?? '')
        setState('success')
      }
    })
  }, [isLoading, user, code, router])

  // 성공 후 3초 뒤 홈으로 이동
  useEffect(() => {
    if (state !== 'success') return
    const timer = setTimeout(() => router.replace('/community'), 3000)
    return () => clearTimeout(timer)
  }, [state, router])

  // 로딩/리다이렉트 중
  if (state === 'loading' || state === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="text-brand-muted text-sm animate-pulse">잠시만요…</div>
      </div>
    )
  }

  // 성공
  if (state === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-green-light flex items-center justify-center mb-6">
          <span className="text-4xl">🏠</span>
        </div>
        <h1 className="font-serif text-2xl font-semibold text-brand-text mb-2">
          {familyName}에 들어왔어요!
        </h1>
        <p className="text-sm text-brand-sub">잠시 후 피드로 이동해요</p>
      </div>
    )
  }

  // 에러
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
        <span className="text-4xl">😕</span>
      </div>
      <h1 className="font-serif text-xl font-semibold text-brand-text mb-2">
        합류할 수 없어요
      </h1>
      <p className="text-sm text-brand-sub mb-8">{message}</p>
      <button
        onClick={() => router.replace('/community')}
        className="px-6 py-2.5 bg-brand-green text-white text-sm font-medium rounded-full"
      >
        홈으로 가기
      </button>
    </div>
  )
}
