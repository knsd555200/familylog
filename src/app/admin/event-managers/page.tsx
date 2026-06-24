'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, X, Building2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  getPendingApplications, approveApplication, rejectApplication,
  type EventManagerApplication,
} from '@/lib/api/eventManager'
import { focal } from '@/lib/avatarFocal'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function EventManagerReviewPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [apps, setApps]       = useState<EventManagerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (authLoading) return
    if (!user || !isAdmin) { setLoading(false); return }
    getPendingApplications()
      .then(setApps)
      .finally(() => setLoading(false))
  }, [authLoading, user, isAdmin])

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    const result = await approveApplication(id)
    setProcessingId(null)
    if (result.success) setApps(prev => prev.filter(a => a.id !== id))
    else alert(result.error ?? '승인에 실패했어요')
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)
    const result = await rejectApplication(id)
    setProcessingId(null)
    if (result.success) setApps(prev => prev.filter(a => a.id !== id))
    else alert(result.error ?? '거절에 실패했어요')
  }

  if (authLoading) {
    return <div className="flex items-center justify-center py-24 text-brand-muted text-sm">불러오는 중...</div>
  }

  if (!isAdmin) {
    return <div className="max-w-2xl mx-auto p-8 text-center text-brand-muted">관리자만 접근할 수 있습니다.</div>
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      {/* 상단 바 */}
      <div className="sticky top-14 lg:top-0 z-20 bg-brand-bg/95 backdrop-blur-sm border-b border-brand-line px-4 lg:px-6 py-3 flex items-center gap-2">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-brand-sub">
          <ArrowLeft size={18} />
          <span className="text-sm">뒤로</span>
        </button>
        <span className="font-medium text-sm">행사 관리자 심사</span>
      </div>

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {loading ? (
          [1, 2].map(n => (
            <div key={n} className="bg-white rounded-2xl border border-brand-line p-4 animate-pulse space-y-3">
              <div className="h-4 bg-brand-card rounded w-1/3" />
              <div className="h-3 bg-brand-card rounded w-2/3" />
              <div className="h-3 bg-brand-card rounded w-full" />
            </div>
          ))
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-8">
            <div className="w-14 h-14 rounded-full bg-brand-green-light flex items-center justify-center mb-4">
              <Building2 size={24} className="text-brand-green" />
            </div>
            <p className="font-serif text-lg text-brand-text mb-1.5">대기 중인 신청이 없어요</p>
            <p className="text-sm text-brand-muted leading-relaxed">새 신청이 들어오면 여기에 표시돼요.</p>
          </div>
        ) : (
          apps.map(app => (
            <div key={app.id} className="bg-white rounded-2xl border border-brand-line p-4">
              {/* 신청자 + 단체명 */}
              <div className="flex items-center gap-2 mb-3">
                {app.applicant_avatar
                  ? <img src={app.applicant_avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" style={focal(app.applicant_avatar_focal_x, app.applicant_avatar_focal_y)} />
                  : <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] text-white">{(app.applicant_nickname ?? '?').charAt(0)}</span>
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brand-text truncate">{app.org_name}</p>
                  <p className="text-[11px] text-brand-muted">{app.applicant_nickname ?? '회원'} · {formatDate(app.created_at)}</p>
                </div>
              </div>

              {/* 연락처 */}
              <div className="text-xs text-brand-sub mb-2">
                <span className="text-brand-muted">연락처</span> {app.contact}
              </div>

              {/* 소개 */}
              {app.description && (
                <p className="text-xs text-brand-sub leading-relaxed bg-brand-card rounded-xl p-3 mb-3 whitespace-pre-line">
                  {app.description}
                </p>
              )}

              {/* 승인 / 거절 */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(app.id)}
                  disabled={processingId === app.id}
                  className="flex-1 py-2.5 rounded-xl bg-brand-green text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Check size={15} /> 승인
                </button>
                <button
                  onClick={() => handleReject(app.id)}
                  disabled={processingId === app.id}
                  className="flex-1 py-2.5 rounded-xl border border-brand-line text-brand-sub text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <X size={15} /> 거절
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
