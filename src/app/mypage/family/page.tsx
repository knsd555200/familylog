'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Users, Copy, Check, X } from 'lucide-react'
import { createFamily, createInviteLink } from '@/lib/api/family'

// ── 토스트 훅 ─────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])
  const show = (msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(msg)
    timerRef.current = setTimeout(() => setToast(null), 2800)
  }
  return { toast, show }
}

// ── 샘플 더미 데이터 (미연동 상태 미리보기) ──────────────────────────────────
const SAMPLE_MEMBERS = [
  { name: '아빠', contribution: 72, color: 'bg-brand-green' },
  { name: '엄마', contribution: 58, color: 'bg-blue-400' },
  { name: '자녀', contribution: 34, color: 'bg-orange-400' },
]

function SampleContent() {
  const maxContrib = Math.max(...SAMPLE_MEMBERS.map(m => m.contribution))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '함께한 날',  value: '365일' },
          { label: '합산 포인트', value: '2,400P' },
          { label: '봉사 시간',   value: '12시간' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-brand-line p-3 text-center">
            <p className="text-[10px] text-brand-muted">{label}</p>
            <p className="text-sm font-bold text-brand-text mt-0.5">{value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-brand-line p-4">
        <p className="text-xs font-semibold text-brand-text mb-3">구성원 기여도</p>
        <div className="space-y-2.5">
          {SAMPLE_MEMBERS.map(m => (
            <div key={m.name} className="flex items-center gap-2">
              <span className="text-xs text-brand-sub w-6 flex-shrink-0">{m.name}</span>
              <div className="flex-1 h-2 bg-brand-card rounded-full overflow-hidden">
                <div
                  className={`h-full ${m.color} rounded-full`}
                  style={{ width: `${(m.contribution / maxContrib) * 100}%` }}
                />
              </div>
              <span className="text-xs text-brand-muted w-6 text-right flex-shrink-0">{m.contribution}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 가족 생성 시트 ─────────────────────────────────────────────────────────────
function CreateFamilySheet({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (inviteUrl: string) => void
}) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = useCallback(async () => {
    if (!user || !name.trim()) return
    setLoading(true)
    setError('')

    const result = await createFamily(user.id, user.family_id, name.trim())
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    // 가족 생성 직후 초대 링크 생성
    const linkResult = await createInviteLink(user.id, result.family!.id)
    setLoading(false)
    if (linkResult.error) {
      // 링크 생성 실패해도 가족 생성은 성공 — 빈 문자열로 진행
      onCreated('')
    } else {
      onCreated(linkResult.url ?? '')
    }
  }, [user, name])

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      {/* 배경 딤 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white w-full max-w-md rounded-t-3xl lg:rounded-3xl px-6 pt-6 pb-10 lg:pb-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-brand-muted">
          <X size={20} />
        </button>

        <h2 className="font-serif text-lg font-semibold text-brand-text mb-1">가족 만들기</h2>
        <p className="text-sm text-brand-sub mb-5">가정명을 입력하면 초대 링크가 만들어져요</p>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="예: 김씨 가족, 우리집"
          maxLength={20}
          className="w-full border border-brand-line rounded-xl px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-green mb-2"
          onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          autoFocus
        />
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className="w-full py-3 bg-brand-green text-white text-sm font-medium rounded-full disabled:opacity-40 mt-3"
        >
          {loading ? '만드는 중…' : '가족 만들기'}
        </button>
      </div>
    </div>
  )
}

// ── 초대 링크 시트 ─────────────────────────────────────────────────────────────
function InviteLinkSheet({
  inviteUrl,
  onClose,
  onGetLink,
}: {
  inviteUrl: string
  onClose: () => void
  onGetLink: () => Promise<void>
}) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드 실패 무시
    }
  }

  const handleGetLink = async () => {
    setLoading(true)
    await onGetLink()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white w-full max-w-md rounded-t-3xl lg:rounded-3xl px-6 pt-6 pb-10 lg:pb-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-brand-muted">
          <X size={20} />
        </button>

        <h2 className="font-serif text-lg font-semibold text-brand-text mb-1">가족 초대하기</h2>
        <p className="text-sm text-brand-sub mb-5">링크를 공유해서 가족을 초대하세요</p>

        {inviteUrl ? (
          <>
            {/* 링크 표시 + 복사 */}
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
        ) : (
          <button
            onClick={handleGetLink}
            disabled={loading}
            className="w-full py-3 bg-brand-green text-white text-sm font-medium rounded-full disabled:opacity-40"
          >
            {loading ? '링크 만드는 중…' : '초대 링크 만들기'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function MypageFamilyPage() {
  const { user, isLoading } = useAuth()
  const { toast, show: showToast } = useToast()

  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showInviteSheet, setShowInviteSheet] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')

  // 초대 링크 가져오기 (이미 가족이 있는 경우)
  const handleGetLink = useCallback(async () => {
    if (!user?.family_id) return
    const result = await createInviteLink(user.id, user.family_id)
    if (result.error) {
      showToast(result.error)
    } else {
      setInviteUrl(result.url ?? '')
    }
  }, [user, showToast])

  if (isLoading) {
    return (
      <div className="px-4 lg:px-6 py-5 space-y-3 animate-pulse">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(n => <div key={n} className="h-20 bg-brand-card rounded-2xl" />)}
        </div>
        <div className="h-32 bg-brand-card rounded-2xl" />
      </div>
    )
  }

  // 가족 연동 완료 상태
  if (user?.family_id) {
    return (
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* 가족 초대 버튼 */}
        <button
          onClick={() => {
            setInviteUrl('')
            setShowInviteSheet(true)
          }}
          className="w-full py-3 border border-brand-green text-brand-green text-sm font-medium rounded-full"
        >
          가족 초대하기
        </button>

        {/* 추후 실제 가족 발자취 데이터로 교체 예정 */}
        <div className="flex items-center justify-center py-16 text-brand-muted text-sm">
          가족 발자취를 준비 중이에요 🌱
        </div>

        {showInviteSheet && (
          <InviteLinkSheet
            inviteUrl={inviteUrl}
            onClose={() => setShowInviteSheet(false)}
            onGetLink={handleGetLink}
          />
        )}

        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-brand-text text-white text-sm px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap pointer-events-none">
            {toast}
          </div>
        )}
      </div>
    )
  }

  // 미연동 상태
  return (
    <div className="px-4 lg:px-6 py-5">
      <div className="relative">
        <div className="opacity-40 pointer-events-none select-none">
          <SampleContent />
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-5 text-center shadow-sm w-full max-w-xs">
            <div className="w-12 h-12 rounded-full bg-brand-green-light flex items-center justify-center mx-auto mb-3">
              <Users size={22} className="text-brand-green" />
            </div>
            <p className="text-sm font-semibold text-brand-text leading-snug mb-1">
              가족을 연결하면
            </p>
            <p className="text-sm text-brand-sub leading-snug mb-4">
              우리 가족의 여정이 여기 쌓여요
            </p>
            <button
              onClick={() => setShowCreateSheet(true)}
              className="w-full py-2.5 bg-brand-green text-white text-sm font-medium rounded-full"
            >
              가족 만들기
            </button>
          </div>
        </div>
      </div>

      {/* 가족 생성 시트 */}
      {showCreateSheet && (
        <CreateFamilySheet
          onClose={() => setShowCreateSheet(false)}
          onCreated={(url) => {
            setShowCreateSheet(false)
            setInviteUrl(url)
            setShowInviteSheet(true)
          }}
        />
      )}

      {/* 생성 직후 초대 시트 */}
      {showInviteSheet && (
        <InviteLinkSheet
          inviteUrl={inviteUrl}
          onClose={() => setShowInviteSheet(false)}
          onGetLink={handleGetLink}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-brand-text text-white text-sm px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
