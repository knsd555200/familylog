'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 홈 탭은 폐지되었습니다 (맥락문서 v14).
// 콘텐츠 재배치: 인기글 → 홈(피드 /community), 오늘의 미션·행사 → 미션 탭(/benefits).
// 기존 /home URL(외부 링크·북마크·sitemap)은 피드로 보냅니다.
export default function HomePage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/community')
  }, [router])
  return null
}
