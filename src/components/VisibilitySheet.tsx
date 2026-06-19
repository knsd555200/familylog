'use client'
import { useState, useEffect, useRef } from 'react'
import { Globe, Users, Lock, Check, X } from 'lucide-react'

export const VISIBILITY_OPTIONS = [
  { id: 'public',  label: '전체 공개',   desc: '누구나 볼 수 있어요',         icon: Globe },
  { id: 'family',  label: '가족만 보기', desc: '가족 구성원만 볼 수 있어요',   icon: Users },
  { id: 'private', label: '나만 보기',   desc: '나만 볼 수 있어요',            icon: Lock  },
] as const

export function getVisibility(id: string) {
  return VISIBILITY_OPTIONS.find(v => v.id === id) ?? VISIBILITY_OPTIONS[2]
}

interface Props {
  current: string
  onSelect: (v: string) => void
  onClose: () => void
}

export function VisibilitySheet({ current, onSelect, onClose }: Props) {
  const [show, setShow] = useState(false)
  const touchY = useRef(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleClose = () => {
    setShow(false)
    setTimeout(onClose, 300)
  }

  const renderContent = () => (
    <>
      <h3 className="text-base font-bold mb-1 text-center">공개 범위</h3>
      <p className="text-xs text-brand-muted text-center mb-4">이 프로필을 누가 볼 수 있을지 정해요</p>
      <div className="space-y-2">
        {VISIBILITY_OPTIONS.map(opt => {
          const Icon = opt.icon
          const active = opt.id === current
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => { onSelect(opt.id); handleClose() }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                active ? 'border-brand-green bg-brand-green-light' : 'border-brand-line bg-white'
              }`}
            >
              <Icon size={18} className={active ? 'text-brand-green' : 'text-brand-muted'} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${active ? 'text-brand-green-dark' : 'text-brand-text'}`}>{opt.label}</p>
                <p className="text-xs text-brand-muted mt-0.5">{opt.desc}</p>
              </div>
              {active && <Check size={15} className="text-brand-green flex-shrink-0" strokeWidth={2.5} />}
            </button>
          )
        })}
      </div>
    </>
  )

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      {/* 모바일: 하단 슬라이드 시트 */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl
          transition-transform duration-300 ease-out ${show ? 'translate-y-0' : 'translate-y-full'}`}
        onTouchStart={e => { touchY.current = e.touches[0].clientY }}
        onTouchEnd={e => { if (e.changedTouches[0].clientY - touchY.current > 80) handleClose() }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-brand-line rounded-full" />
        </div>
        <div className="px-6 pb-10">{renderContent()}</div>
      </div>
      {/* 데스크탑: 중앙 모달 */}
      <div
        className={`hidden lg:flex fixed top-0 right-0 bottom-0 left-64 z-50 items-center justify-center px-4
          transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      >
        <div
          className={`relative bg-white rounded-2xl shadow-xl max-w-md w-full px-6 pt-6 pb-8
            transition-all duration-300 ease-out ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
          onClick={e => e.stopPropagation()}
        >
          <button type="button" onClick={handleClose}
            className="absolute top-3 right-4 p-1 text-brand-muted hover:text-brand-text transition-colors">
            <X size={18} />
          </button>
          {renderContent()}
        </div>
      </div>
    </>
  )
}
