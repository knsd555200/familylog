'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { resolveHomePath } from '@/lib/resolveHome'

export default function RootPage() {
  const { user, status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === 'initializing') return
    router.replace(status === 'authenticated' ? resolveHomePath(user) : '/community')
  }, [user, status, router])

  return null
}
