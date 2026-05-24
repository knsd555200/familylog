'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function FeedDetailPage() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/community/${params.id}`)
  }, [params.id, router])

  return (
    <div className="p-6 text-center text-sm text-brand-muted">이동 중...</div>
  )
}