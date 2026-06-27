'use client'

import { useRef, type PointerEvent } from 'react'
import { focal } from '@/lib/avatarFocal'

type FocalValue = { x?: number | null; y?: number | null }
type Props = {
  imageUrl: string
  value: FocalValue
  onChange: (x: number, y: number) => void
  aspectRatio?: 'circle' | '3:4' | '16:9'
}

export default function FocalPointPicker({ imageUrl, value, onChange, aspectRatio = 'circle' }: Props) {
  const draggingRef = useRef(false)
  const x = value.x ?? 50
  const y = value.y ?? 50
  const shapeClass =
    aspectRatio === 'circle'
      ? 'aspect-square rounded-full'
      : aspectRatio === '16:9'
        ? 'aspect-[16/9] rounded-xl'
        : 'aspect-[3/4] rounded-xl'

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const nextX = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
    const nextY = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))
    onChange(Math.round(nextX), Math.round(nextY))
  }

  return (
    <div
      className={`relative w-full overflow-hidden bg-brand-card border border-brand-line ${shapeClass}`}
      style={{ touchAction: 'none' }}
      onPointerDown={e => {
        draggingRef.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        move(e)
      }}
      onPointerMove={e => { if (draggingRef.current) move(e) }}
      onPointerUp={() => { draggingRef.current = false }}
      onPointerCancel={() => { draggingRef.current = false }}
    >
      <img src={imageUrl} alt="" className="h-full w-full object-cover" style={focal(x, y)} draggable={false} />
      <span
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_8px_rgba(0,0,0,0.45)] ring-1 ring-black/10"
        style={{ left: `${x}%`, top: `${y}%` }}
      />
    </div>
  )
}
