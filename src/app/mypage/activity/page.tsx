'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Heart, MessageSquare } from 'lucide-react'

// ── 타입 ──────────────────────────────────────────────────────────────────────
interface MyPost {
  id: string
  title: string
  content: string
  like_count: number
  comment_count: number
  created_at: string
}

interface Merit {
  id: string
  merit_type: string
  points: number
  created_at: string
}

interface ActivityData {
  posts: MyPost[]
  merits: Merit[]
}

// ── merit_type 한국어 라벨 ────────────────────────────────────────────────────
const MERIT_LABELS: Record<string, string> = {
  post_created:    '글 작성',
  comment_created: '댓글 작성',
  like_received:   '공감 받음',
  event_joined:    '행사 참여',
}

function meritLabel(type: string) {
  return MERIT_LABELS[type] ?? type
}

// ── 날짜 포맷 ─────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60)  return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7)   return `${d}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

// ── raw fetch ─────────────────────────────────────────────────────────────────
async function fetchActivity(userId: string, accessToken: string): Promise<ActivityData> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const headers = {
    apikey: key,
    Authorization: `Bearer ${accessToken}`,
  }

  const [postsRes, meritsRes] = await Promise.all([
    fetch(
      `${base}/rest/v1/posts?author_id=eq.${userId}&deleted_at=is.null&select=id,title,content,like_count,comment_count,created_at&order=created_at.desc`,
      { headers, cache: 'no-store' }
    ),
    fetch(
      `${base}/rest/v1/merits?user_id=eq.${userId}&select=id,merit_type,points,created_at&order=created_at.desc&limit=10`,
      { headers, cache: 'no-store' }
    ),
  ])

  const posts:  MyPost[] = postsRes.ok  ? await postsRes.json()  : []
  const merits: Merit[]  = meritsRes.ok ? await meritsRes.json() : []

  return { posts, merits }
}

// ── 스켈레톤 ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="px-4 lg:px-6 py-5 space-y-5 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 bg-brand-card rounded w-24" />
        {[1, 2, 3].map(n => <div key={n} className="h-20 bg-brand-card rounded-2xl" />)}
      </div>
      <div className="border-t border-brand-line" />
      <div className="space-y-3">
        <div className="h-4 bg-brand-card rounded w-24" />
        {[1, 2, 3, 4].map(n => <div key={n} className="h-12 bg-brand-card rounded-2xl" />)}
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function MypageActivityPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<ActivityData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setDataLoading(false); return }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setDataLoading(false); return }
      try {
        setData(await fetchActivity(user.id, session.access_token))
      } catch {
        setData({ posts: [], merits: [] })
      } finally {
        setDataLoading(false)
      }
    })
  }, [authLoading, user])

  if (authLoading || dataLoading) return <Skeleton />

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24 text-brand-muted text-sm">
        로그인이 필요해요
      </div>
    )
  }

  const posts  = data?.posts  ?? []
  const merits = data?.merits ?? []

  return (
    <div className="px-4 lg:px-6 py-5 space-y-5">
      {/* ── 내가 쓴 글 ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-brand-text mb-3">내가 쓴 글</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-brand-muted py-6 text-center">아직 작성한 글이 없어요.</p>
        ) : (
          <div className="space-y-2">
            {posts.map(post => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="block bg-white rounded-2xl border border-brand-line px-4 py-3 hover:bg-brand-card transition-colors"
              >
                <p className="text-sm font-medium text-brand-text truncate">{post.title}</p>
                {post.content && (
                  <p className="text-xs text-brand-sub mt-0.5 line-clamp-1">
                    {post.content.split('\n')[0]}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-brand-muted">
                  <span>{formatDate(post.created_at)}</span>
                  <span className="flex items-center gap-0.5">
                    <Heart size={11} /> {post.like_count ?? 0}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <MessageSquare size={11} /> {post.comment_count ?? 0}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="border-t border-brand-line" />

      {/* ── 포인트 적립 내역 ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-brand-text mb-3">포인트 적립 내역</h2>
        {merits.length === 0 ? (
          <p className="text-sm text-brand-muted py-6 text-center">아직 적립 내역이 없어요.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-brand-line divide-y divide-brand-line overflow-hidden">
            {merits.map(merit => (
              <div key={merit.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-brand-text">{meritLabel(merit.merit_type)}</p>
                  <p className="text-[11px] text-brand-muted mt-0.5">{formatDate(merit.created_at)}</p>
                </div>
                <span className="text-sm font-semibold text-brand-green flex-shrink-0">
                  +{merit.points}P
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
