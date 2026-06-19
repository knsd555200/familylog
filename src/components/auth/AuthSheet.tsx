'use client'
import { X } from 'lucide-react'
import AuthForm, { AuthTab } from '@/components/auth/AuthForm'

/**
 * AuthForm을 담는 공용 모달 셸 (CreateFamilySheet와 동일한 시트 패턴).
 * 여러 인증 진입점(헤더·사이드바·좋아요·댓글·CTA)이 같은 모양으로 폼을 띄우도록 통일.
 * 띄우는 쪽이 표시 여부를 관리하고, onClose/onSuccess를 주입한다.
 */
export default function AuthSheet({
  initialTab = 'login',
  onClose,
  onSuccess,
}: {
  initialTab?: AuthTab
  onClose: () => void
  onSuccess: (kind: AuthTab) => void | Promise<void>
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-t-3xl lg:rounded-3xl px-6 pt-10 pb-10 lg:pb-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-brand-muted">
          <X size={20} />
        </button>
        <AuthForm initialTab={initialTab} onSuccess={onSuccess} />
      </div>
    </div>
  )
}
