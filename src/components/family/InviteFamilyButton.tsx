'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Copy, Check, X, UserPlus } from 'lucide-react'
import { createInviteLink } from '@/lib/api/family'

// 트리거 모양: banner(자가소멸 큰 CTA) / button(전체폭 버튼) / icon(조용한 + 진입점)
type Variant = 'banner' | 'button' | 'icon'

/**
 * 가족 초대 트리거 + 초대 링크 시트를 한 컴포넌트로 묶음.
 * 가족 피드 배너 / 마이페이지 멤버 블록 / 발자취 탭에서 재사용.
 * family_id 없으면 아무것도 렌더하지 않음.
 */
export default function InviteFamilyButton({
  variant = 'button',
  autoOpen = false,
}: {
  variant?: Variant
  // 가족 생성 직후 등 — 마운트 시 시트 자동 오픈
  autoOpen?: boolean
}) {
  const { user } = useAuth()
  const [open, setOpen] = useState(autoOpen)
  const [inviteUrl, setInviteUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  // 시트 1회 자동 로딩 가드 (중복 호출 방지)
  const fetchedRef = useRef(false)

  const fetchLink = useCallback(async () => {
    if (!user?.family_id) return
    setLoading(true)
    const result = await createInviteLink(user.id, user.family_id)
    setLoading(false)
    if (!result.error) setInviteUrl(result.url ?? '')
  }, [user])

  // 시트 열릴 때 기존 링크 자동 호출
  useEffect(() => {
    if (!open || fetchedRef.current) return
    fetchedRef.current = true
    fetchLink()
  }, [open, fetchLink])

  const handleOpen = () => {
    fetchedRef.current = false
    setInviteUrl('')
    setOpen(true)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드 실패 무시
    }
  }

  if (!user?.family_id) return null

  return (
    <>
      {/* ── 트리거 ─────────────────────────────────────────────────────────── */}
      {variant === 'banner' && (
        <div className="bg-brand-green-light rounded-2xl px-5 py-5 text-center mb-4">
          <div className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center mx-auto mb-3">
            <UserPlus size={22} className="text-brand-green" />
          </div>
          <p className="text-sm font-semibold text-brand-text leading-snug mb-1">아직 나 혼자예요</p>
          <p className="text-sm text-brand-sub leading-snug mb-4">가족을 초대해 이 공간을 함께 채워보세요</p>
          <button
            onClick={handleOpen}
            className="w-full py-2.5 bg-brand-green text-white text-sm font-medium rounded-full"
          >
            가족 초대하기
          </button>
        </div>
      )}

      {variant === 'button' && (
        <button
          onClick={handleOpen}
          className="w-full py-3 border border-brand-green text-brand-green text-sm font-medium rounded-full"
        >
          가족 초대하기
        </button>
      )}

      {variant === 'icon' && (
        <button
          onClick={handleOpen}
          className="flex items-center gap-1 text-xs font-medium text-brand-green"
          aria-label="가족 초대하기"
        >
          <UserPlus size={14} /> 초대
        </button>
      )}

      {/* ── 초대 링크 시트 ─────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          <div className="relative bg-white w-full max-w-md rounded-t-3xl lg:rounded-3xl px-6 pt-6 pb-10 lg:pb-8">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 p-1 text-brand-muted">
              <X size={20} />
            </button>

            <h2 className="font-serif text-lg font-semibold text-brand-text mb-1">가족 초대하기</h2>
            <p className="text-sm text-brand-sub mb-5">링크를 공유해서 가족을 초대하세요</p>

            {inviteUrl ? (
              <>
                <div className="flex items-center gap-2 bg-brand-card rounded-xl px-4 py-3 mb-4">
                  <span className="flex-1 text-xs text-brand-sub truncate">{inviteUrl}</span>
                  <button onClick={handleCopy} className="flex-shrink-0 text-brand-green">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <button
                  onClick={handleCopy}
                  className="w-full py-3 bg-brand-green text-white text-sm font-medium rounded-full"
                >
                  {copied ? '복사됐어요 ✓' : '링크 복사하기'}
                </button>
              </>
            ) : loading ? (
              <div className="py-3 text-center text-sm text-brand-muted">링크 불러오는 중…</div>
            ) : (
              <button
                onClick={fetchLink}
                className="w-full py-3 bg-brand-green text-white text-sm font-medium rounded-full"
              >
                초대 링크 만들기
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
