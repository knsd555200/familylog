'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sweepKey, setSweepKey] = useState(0)
  const firstRender = useRef(true)

  useEffect(() => {
    // 최초 마운트(새로고침/첫 진입)에는 스위프를 띄우지 않음
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setSweepKey(k => k + 1)
  }, [pathname])

  return (
    <>
      {sweepKey > 0 && <div key={sweepKey} className="page-bar" aria-hidden />}
      <div key={pathname} className="page-transition">
        {children}
      </div>
    </>
  )
}
