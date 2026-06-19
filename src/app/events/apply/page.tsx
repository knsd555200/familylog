'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Check, Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  applyEventManager, getMyApplication, canManageEvents,
  type EventManagerApplication,
} from '@/lib/api/eventManager'

const INPUT_CLS =
  'w-full px-3 py-2.5 text-sm bg-brand-card border border-brand-line rounded-xl outline-none focus:border-brand-green transition-colors placeholder:text-brand-muted'

export default function EventManagerApplyPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [orgName, setOrgName]         = useState('')
  const [contact, setContact]         = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  // 기존 신청 상태 (대기/거절) — 폼 대신 상태 화면 표시용
  const [myApp, setMyApp]   = useState<EventManagerApplication | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
    // 이미 권한 보유자면 마이페이지(행사 탭)로
    if (canManageEvents(user.role)) { router.replace('/mypage'); return }
    getMyApplication()
      .then(setMyApp)
      .finally(() => setFetching(false))
  }, [authLoading, user, router])

  const handleSubmit = async () => {
    if (!orgName.trim())  { setError('단체·업체명을 입력해주세요'); return }
    if (!contact.trim())  { setError('연락처를 입력해주세요'); return }
    setLoading(true)
    setError('')
    const result = await applyEventManager({
      org_name:    orgName.trim(),
      contact:     contact.trim(),
      description: description.trim() || undefined,
    })
    setLoading(false)
    if (result.success) {
      // 제출 후 상태 화면으로 전환
      const app = await getMyApplication()
      setMyApp(app)
    } else {
      setError(result.error ?? '제출에 실패했어요. 다시 시도해주세요.')
    }
  }

  if (authLoading || fetching) {
    return <div className="flex items-center justify-center py-24 text-brand-muted text-sm">불러오는 중...</div>
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      {/* 상단 바 */}
      <div className="sticky top-14 lg:top-0 z-20 bg-brand-bg/95 backdrop-blur-sm border-b border-brand-line px-4 lg:px-6 py-3 flex items-center gap-2">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-brand-sub">
          <ArrowLeft size={18} />
          <span className="text-sm">뒤로</span>
        </button>
        <span className="font-medium text-sm">행사 관리자 신청</span>
      </div>

      <div className="px-4 lg:px-6 py-5 space-y-5">
        {/* 대기 중 신청이 있으면 상태 화면 */}
        {myApp?.status === 'pending' ? (
          <div className="flex flex-col items-center text-center py-12 px-6">
            <div className="w-14 h-14 rounded-full bg-brand-green-light flex items-center justify-center mb-4">
              <Clock size={24} className="text-brand-green" />
            </div>
            <p className="font-serif text-lg text-brand-text mb-1.5">심사 중이에요</p>
            <p className="text-sm text-brand-muted leading-relaxed">
              <strong className="text-brand-sub">{myApp.org_name}</strong>의 신청을 검토하고 있어요.<br />
              승인되면 행사를 등록할 수 있어요.
            </p>
            <Link href="/events" className="mt-6 text-sm text-brand-green">행사 목록으로</Link>
          </div>
        ) : (
          <>
            {/* 거절 이력 안내 */}
            {myApp?.status === 'rejected' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                이전 신청이 승인되지 않았어요. 정보를 보완해 다시 신청할 수 있어요.
              </div>
            )}

            {/* 안내 */}
            <div className="flex items-start gap-2 px-3 py-3 bg-brand-green-light rounded-xl">
              <Calendar size={16} className="text-brand-green flex-shrink-0 mt-0.5" />
              <p className="text-xs text-brand-green-dark leading-relaxed">
                인증된 단체·업체는 행사 관리자로서 행사를 등록하고 수정·삭제할 수 있어요.
                신청 내용을 검토한 뒤 승인해 드려요.
              </p>
            </div>

            {/* 단체·업체명 */}
            <div>
              <label className="text-xs text-brand-sub mb-1.5 block">
                단체·업체명 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="예) 행복가정연구소"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                maxLength={50}
                className={INPUT_CLS}
              />
            </div>

            {/* 연락처 */}
            <div>
              <label className="text-xs text-brand-sub mb-1.5 block">
                담당자 연락처 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="이메일 또는 전화번호"
                value={contact}
                onChange={e => setContact(e.target.value)}
                maxLength={100}
                className={INPUT_CLS}
              />
            </div>

            {/* 소개 / 사업자 정보 */}
            <div>
              <label className="text-xs text-brand-sub mb-1.5 block">단체 소개 · 사업자 정보</label>
              <textarea
                placeholder="어떤 단체인지, 어떤 행사를 운영하려는지 알려주세요"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                maxLength={500}
                className={`${INPUT_CLS} resize-none`}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading || !orgName.trim() || !contact.trim()}
              className="w-full py-3 bg-brand-green text-white text-sm font-semibold rounded-2xl disabled:opacity-50 transition-opacity flex items-center justify-center gap-1.5"
            >
              {loading ? '제출 중...' : <><Check size={16} /> 신청하기</>}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
