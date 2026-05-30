'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { MERIT_LABELS, formatRelativeDate } from '@/lib/growth'

interface MeritRow { id: string; merit_type: string; points: number; created_at: string }

const PER_PAGE = 30

async function fetchMerits(uid: string, token: string, offset: number): Promise<MeritRow[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const res = await fetch(
    `${base}/rest/v1/merits?user_id=eq.${uid}&select=id,merit_type,points,created_at&order=created_at.desc&limit=${PER_PAGE}&offset=${offset}`,
    { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: 'no-store' }
  )
  return res.ok ? res.json() : []
}

export default function PointsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [items,       setItems]       = useState<MeritRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore,     setHasMore]     = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      try {
        const first = await fetchMerits(user.id, session.access_token, 0)
        setItems(first)
        setHasMore(first.length === PER_PAGE)
      } catch { setItems([]) }
      finally { setLoading(false) }
    })
  }, [authLoading, user])

  const handleLoadMore = async () => {
    if (!user || loadingMore) return
    setLoadingMore(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const more = await fetchMerits(user.id, session.access_token, items.length)
      setItems(prev => [...prev, ...more])
      setHasMore(more.length === PER_PAGE)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6 bg-brand-bg min-h-screen">

      {/* 상단 바 */}
      <div className="sticky top-14 lg:top-0 z-20 bg-white border-b border-brand-line px-4 lg:px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-brand-sub">
          <ArrowLeft size={20} />
        </button>
        <span className="font-semibold text-base">활동·포인트 기록</span>
      </div>

      <div className="px-4 lg:px-6 py-5 space-y-4">

        {/* 보유 포인트 요약 */}
        {user && (
          <div className="bg-white rounded-2xl border border-brand-line px-4 py-4 text-center">
            <p className="text-xs text-brand-muted">현재 보유 포인트</p>
            <p className="font-serif text-3xl font-bold text-brand-text mt-1">{user.points.toLocaleString()}<span className="text-lg"> P</span></p>
          </div>
        )}

        {/* 내역 */}
        {loading ? (
          <div className="space-y-2 animate-pulse">{[1,2,3,4,5].map(n => <div key={n} className="h-14 bg-brand-card rounded-2xl" />)}</div>
        ) : !items.length ? (
          <p className="text-sm text-brand-muted text-center py-10">아직 적립 내역이 없어요.</p>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-brand-line divide-y divide-brand-line overflow-hidden">
              {items.map(m => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-brand-text">{MERIT_LABELS[m.merit_type] ?? m.merit_type}</p>
                    <p className="text-[11px] text-brand-muted mt-0.5">{formatRelativeDate(m.created_at)}</p>
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ${m.points >= 0 ? 'text-brand-green' : 'text-brand-muted'}`}>
                    {m.points >= 0 ? `+${m.points}` : m.points}P
                  </span>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-3 text-sm text-brand-muted hover:text-brand-text border border-brand-line rounded-2xl bg-white transition-colors disabled:opacity-50"
              >
                {loadingMore ? '불러오는 중...' : '더 보기'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
