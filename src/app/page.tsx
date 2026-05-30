'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function RootPage() {
  const { status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === 'initializing') return
    router.replace('/community') // 로그인 여부 무관하게 피드가 첫 화면
  }, [status, router])

  return null
}
