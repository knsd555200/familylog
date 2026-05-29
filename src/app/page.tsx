'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function RootPage() {
  const { status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === 'initializing') return
    router.replace(status === 'authenticated' ? '/mypage' : '/community')
  }, [status, router])

  return null
}
