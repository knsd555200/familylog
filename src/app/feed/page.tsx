'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function FeedPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/community')
  }, [router])

  return (
    <div className="p-6 text-center text-sm text-brand-muted">이동 중...</div>
  )
}
