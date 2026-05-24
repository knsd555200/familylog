'use client'
import { useState, useEffect, useRef } from 'react'
import { Share2, Link2, Check } from 'lucide-react'

interface Props {
  title: string
  url: string
  className?: string
}

declare global {
  interface Window {
    Kakao: any
  }
}

function loadKakaoSdk() {
  if (typeof window === 'undefined') return
  if (document.getElementById('kakao-sdk')) return
  const script = document.createElement('script')
  script.id = 'kakao-sdk'
  script.src = 'https://developers.kakao.com/sdk/js/kakao.js'
  script.async = true
  script.onload = () => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY)
    }
  }
  document.head.appendChild(script)
}

export default function ShareMenu({ title, url, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadKakaoSdk() }, [])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setOpen(false)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleKakaoShare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(false)

    if (!window.Kakao?.Share) {
      alert('카카오 공유를 불러오는 중이에요. 잠시 후 다시 시도해주세요.')
      return
    }

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description: '패밀로그에서 확인해보세요',
        imageUrl: 'https://pub-648fd4238b904af7a7f90225d2833cf8.r2.dev/og-image.png',
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [
        { title: '글 보러가기', link: { mobileWebUrl: url, webUrl: url } },
      ],
    })
  }

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v) }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-brand-sub hover:bg-brand-card transition-colors"
        aria-label="공유하기"
      >
        <Share2 size={16} />
      </button>

      {open && (
        <div
          className="absolute right-0 bottom-full mb-1 z-50 min-w-[148px] bg-white border border-brand-line rounded-xl shadow-lg py-1 animate-fade-in"
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-brand-text hover:bg-brand-card"
          >
            {copied
              ? <Check size={15} className="text-brand-green flex-shrink-0" />
              : <Link2 size={15} className="flex-shrink-0" />}
            {copied ? '복사됐어요!' : '링크 복사'}
          </button>
          <button
            type="button"
            onClick={handleKakaoShare}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-brand-text hover:bg-brand-card"
          >
            <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] flex-shrink-0" fill="#3C1E1E">
              <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.71 1.564 5.09 3.938 6.528L5 21l4.125-2.193C9.696 18.931 10.836 19 12 19c5.523 0 10-3.477 10-7.8C22 6.477 17.523 3 12 3z"/>
            </svg>
            카카오 공유
          </button>
        </div>
      )}

      {/* 복사 완료 토스트 */}
      {copied && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-brand-text text-white text-sm px-4 py-2 rounded-full shadow-lg animate-fade-in pointer-events-none whitespace-nowrap">
          링크가 복사됐어요
        </div>
      )}
    </div>
  )
}
