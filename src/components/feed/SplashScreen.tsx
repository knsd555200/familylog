'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1800)
    const t2 = setTimeout(() => onDone(), 2300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div className={`fixed inset-0 z-[9999] bg-brand-bg flex items-center justify-center transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-line overflow-hidden">
        <div className="h-full bg-brand-green animate-progress" />
      </div>

      <Image
        src="/logo-slogan.png"
        alt="패밀로그"
        width={320}
        height={96}
        className="w-72 max-w-[85vw] h-auto object-contain"
        priority
      />
    </div>
  )
}
