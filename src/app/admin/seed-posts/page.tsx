'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { feedPosts } from '@/data/feed'
import { communityPosts } from '@/data/community'

interface Result {
  title: string
  status: 'ok' | 'error'
  message?: string
}

const CATEGORY_MAP: Record<string, string> = {
  '일상': 'daily',
  '자녀 양육': 'daily',
  '부부 관계': 'concern',
  '고민': 'concern',
  '인사이트': 'daily',
  '나눔': 'sharing',
  '인증': 'practice',
}

function mapCategory(label: string): string {
  return CATEGORY_MAP[label] ?? 'daily'
}

// 이전 실행에서 이미 성공한 제목 — 중복 방지용 스킵 목록
const ALREADY_INSERTED = new Set([
  '가족 식사 시간, 얼마나 지키세요?',
  '시어머니와 대화법, 도움 요청해요',
  '가족 여행 계획 세울 때 아이 의견 얼마나 반영하세요?',
  '맞벌이 집 집안일 분담, 현실적인 방법 있을까요?',
  '아침형 가족으로 바꾸신 분 계세요?',
  '가정 우선 vs 커리어, 어떻게 균형 잡으세요?',
])

const isUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export default function SeedPostsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [done, setDone] = useState(false)

  const isAdmin = user?.role === 'admin'

  async function runMigration(skipAlreadyInserted: boolean) {
    if (!user) return
    setRunning(true)
    setResults([])
    setDone(false)

    const log = (r: Result) => setResults(prev => [...prev, r])

    // 피드 글 (post_type = 'text')
    for (const p of feedPosts.filter(fp => !isUUID(fp.id))) {
      if (skipAlreadyInserted && ALREADY_INSERTED.has(p.title)) {
        log({ title: `[피드] ${p.title}`, status: 'ok', message: '스킵 (이미 삽입됨)' })
        continue
      }
      const mediaUrls = p.images.length > 0 ? p.images : p.videoThumb ? [p.videoThumb] : []
      const { error } = await supabase.from('posts').insert({
        author_id: user.id,
        post_type: 'text',
        category: mapCategory(p.category),
        title: p.title,
        content: p.description,
        visibility: 'public',
        media_urls: mediaUrls,
        like_count: 0,
        comment_count: 0,
        view_count: 0,
      })
      log({ title: `[피드] ${p.title}`, status: error ? 'error' : 'ok', message: error?.message })
    }

    // 커뮤니티 글 (post_type = 'text')
    for (const p of communityPosts.filter(cp => !isUUID(cp.id))) {
      if (skipAlreadyInserted && ALREADY_INSERTED.has(p.title)) {
        log({ title: `[커뮤니티] ${p.title}`, status: 'ok', message: '스킵 (이미 삽입됨)' })
        continue
      }
      const mediaUrls = p.mediaUrls ?? (p.thumbnail ? [p.thumbnail] : [])
      const visibility = 'public'
      const { error } = await supabase.from('posts').insert({
        author_id: user.id,
        post_type: 'text',
        category: mapCategory(p.category),
        title: p.title,
        content: p.content,
        visibility,
        media_urls: mediaUrls,
        like_count: 0,
        comment_count: 0,
        view_count: 0,
      })
      log({ title: `[커뮤니티] ${p.title}`, status: error ? 'error' : 'ok', message: error?.message })
    }

    setDone(true)
    setRunning(false)
  }

  if (!user) return (
    <div className="max-w-2xl mx-auto p-8 text-center text-brand-muted">로그인이 필요합니다.</div>
  )
  if (!isAdmin) return (
    <div className="max-w-2xl mx-auto p-8 text-center text-brand-muted">관리자만 접근할 수 있습니다.</div>
  )

  const okCount = results.filter(r => r.status === 'ok').length
  const errCount = results.filter(r => r.status === 'error').length

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-1">Mock 데이터 → DB 마이그레이션</h1>
        <p className="text-sm text-brand-muted mb-2">
          현재 계정({user.email})으로 DB에 삽입합니다.
        </p>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          이전 실행에서 커뮤니티 글 6개가 이미 삽입됐습니다.
          <strong className="block mt-0.5">아래 "실패한 16개만" 버튼을 사용하세요.</strong>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => runMigration(true)}
          disabled={running || done}
          className="px-5 py-2.5 bg-brand-green text-white text-sm font-semibold rounded-full disabled:opacity-50"
        >
          {running ? '진행 중…' : done ? '완료' : '실패한 16개만 삽입 (권장)'}
        </button>
        <button
          onClick={() => runMigration(false)}
          disabled={running || done}
          className="px-5 py-2.5 bg-brand-card text-brand-text text-sm font-semibold rounded-full disabled:opacity-50"
        >
          전체 22개 삽입 (중복 주의)
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-1.5">
          {done && (
            <p className="text-sm font-medium mb-3">
              완료: 성공/스킵 {okCount}개 / 실패 {errCount}개
            </p>
          )}
          {results.map((r, i) => (
            <div
              key={i}
              className={`text-sm flex items-start gap-2 ${r.status === 'error' ? 'text-red-500' : 'text-brand-sub'}`}
            >
              <span className="flex-shrink-0">{r.status === 'ok' ? '✓' : '✗'}</span>
              <span>
                {r.title}
                {r.message && <span className="text-xs ml-1 opacity-60">— {r.message}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {done && errCount === 0 && (
        <div className="p-4 bg-brand-green-light rounded-2xl text-sm text-brand-green-dark space-y-2">
          <p className="font-semibold">마이그레이션 완료!</p>
          <p>이제 mock 배열을 비워 중복 노출을 막으세요.</p>
          <code className="block text-xs bg-white/60 p-2 rounded-lg whitespace-pre">{
`// src/data/feed.ts
export const feedPosts: FeedPost[] = []

// src/data/community.ts
export const communityPosts: CommunityPost[] = []`
          }</code>
          <button
            onClick={() => router.push('/community')}
            className="block mt-1 text-brand-green font-medium underline underline-offset-2"
          >
            피드 확인하러 가기 →
          </button>
        </div>
      )}
    </div>
  )
}
