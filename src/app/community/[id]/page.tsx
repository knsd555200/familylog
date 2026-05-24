'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { communityPosts } from '@/data/community'
import type { CommunityPost } from '@/types/post'
import { Heart, MessageSquare, Bookmark, Send, ChevronLeft, Lock, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { toggleLike, getComments, createComment, DbComment } from '@/lib/api/posts'
import PostMenu from '@/components/community/PostMenu'
import ShareMenu from '@/components/community/ShareMenu'

const CATEGORY_LABEL: Record<string, string> = {
  daily: '일상',
  concern: '고민',
  practice: '실천',
  sharing: '나눔',
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d === 1) return '어제'
  if (d < 7) return `${d}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

export default function CommunityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isLoggedIn, user } = useAuth()
  const [post, setPost] = useState<CommunityPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dbComments, setDbComments] = useState<DbComment[]>([])
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    const id = params.id as string

    const mockPost = communityPosts.find(p => p.id === id)
    if (mockPost) {
      setPost(mockPost)
      setLikeCount(mockPost.likes)
      setLoading(false)
      return
    }

    supabase
      .from('posts')
      .select('*, users(nickname, avatar_url, bio)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setLoading(false); return }
        setPost({
          id: data.id,
          category: data.category,
          title: data.title,
          preview: (data.content ?? '').slice(0, 120),
          content: data.content ?? '',
          author: data.users?.nickname ?? '패밀로그 회원',
          avatar: data.users?.avatar_url ?? 'https://i.pravatar.cc/100?img=30',
          status: data.users?.bio ?? '',
          time: formatTime(data.created_at),
          likes: data.like_count ?? 0,
          comments: data.comment_count ?? 0,
          thumbnail: data.thumbnail_url ?? undefined,
          mediaUrls: Array.isArray(data.media_urls) && data.media_urls.length > 0
            ? data.media_urls
            : undefined,
          visibility: data.visibility === 'members' ? 'member' : 'public',
          commentList: [],
          authorId: data.author_id,
        })
        setLikeCount(data.like_count ?? 0)
        setLoading(false)
      })

    // 댓글 불러오기
    getComments(id).then(setDbComments)

    // 내 좋아요 여부
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_type', 'post')
        .eq('target_id', id)
        .maybeSingle()
        .then(({ data }) => { if (data) setLiked(true) })
    })
  }, [params.id])

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const isLiked = liked
    setLiked(!isLiked)
    setLikeCount(prev => prev + (isLiked ? -1 : 1))
    await toggleLike(params.id as string)
  }

  const handleSubmitComment = async () => {
    if (!comment.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setSubmitting(true)
    const result = await createComment({
      post_id: params.id as string,
      content: comment.trim(),
      parent_comment_id: replyTo?.id,
    })

    if (result.success) {
      setComment('')
      setReplyTo(null)
      // 댓글 새로고침
      getComments(params.id as string).then(setDbComments)
    }
    setSubmitting(false)
  }

  if (loading) {
    return <div className="p-6 text-center text-sm text-brand-muted">불러오는 중...</div>
  }

  if (!post) {
    return (
      <div className="p-6 text-center">
        <p>게시글을 찾을 수 없어요.</p>
        <Link href="/community" className="text-brand-blue text-sm">목록으로</Link>
      </div>
    )
  }

  const isLocked = post.visibility === 'member' && !isLoggedIn

  // mock 댓글 + DB 댓글 합치기 (mock 게시글이면 mock 댓글만)
  const isMockPost = post.id.startsWith('c')
  const topLevelComments = isMockPost
    ? post.commentList
    : dbComments.filter(c => !c.parent_comment_id)
  const getReplies = (commentId: string) =>
    dbComments.filter(c => c.parent_comment_id === commentId)

  return (
    <div className="max-w-2xl mx-auto pb-32 lg:pb-6">
      <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-brand-line">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-brand-sub text-sm">
          <ChevronLeft size={18} /> 뒤로
        </button>
        <PostMenu
          postId={post.id}
          authorId={post.authorId}
          isMock={isMockPost}
          onDeleted={() => router.push('/community')}
        />
      </div>

      <div className="px-4 lg:px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <img src={post.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
          <div className="flex-1">
            <div className="font-medium text-sm">{post.author}</div>
            <div className="text-[11px] text-brand-muted">{post.status} · {post.time}</div>
          </div>
          <PostMenu
            postId={post.id}
            authorId={post.authorId}
            isMock={isMockPost}
            onDeleted={() => router.push('/community')}
            className="lg:hidden flex-shrink-0"
          />
          <button className="px-3 py-1.5 border border-brand-line rounded-full text-xs font-medium text-brand-sub hidden sm:inline-flex">팔로우</button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] px-2 py-0.5 bg-brand-green-light text-brand-green-dark rounded-full font-medium">{getCategoryLabel(post.category)}</span>
          {post.visibility === 'member' && (
            <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full font-medium flex items-center gap-1">
              <Lock size={9} /> 멤버 전용
            </span>
          )}
        </div>
        <h1 className="font-serif font-bold text-xl lg:text-2xl leading-tight mb-4">{post.title}</h1>

        {isLocked ? (
          <div className="my-8 py-8 px-6 bg-brand-card rounded-2xl text-center">
            <Lock size={28} className="mx-auto mb-3 text-brand-muted" />
            <div className="font-medium mb-2">멤버 전용 콘텐츠입니다</div>
            <p className="text-sm text-brand-sub mb-4 leading-relaxed">로그인하면 이 가정의 솔직한 이야기를 확인할 수 있어요.</p>
            <Link href="/login" className="inline-block px-6 py-2.5 bg-brand-green text-white rounded-full font-medium text-sm">
              로그인하고 보기
            </Link>
          </div>
        ) : (
          <>
            <div className="prose prose-sm max-w-none text-brand-text leading-relaxed whitespace-pre-line mb-6">
              {post.content}
            </div>
            {(() => {
              const image = post.mediaUrls?.[0]
                ?? (post.thumbnail ? post.thumbnail.replace('200/200', '800/500') : null)
              if (!image) return null
              return (
                <>
                  {/* 이미지 인라인 표시 */}
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(0)}
                    className="block w-full mb-5 rounded-2xl overflow-hidden focus:outline-none"
                    aria-label="이미지 확대"
                  >
                    <img src={image} alt="첨부 이미지" className="w-full object-cover max-h-[400px]" />
                  </button>

                  {/* 라이트박스 */}
                  {lightboxIndex !== null && (
                    <div
                      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-14"
                      onClick={() => setLightboxIndex(null)}
                    >
                      <button
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                        onClick={e => { e.stopPropagation(); setLightboxIndex(null) }}
                        aria-label="닫기"
                      >
                        <X size={20} />
                      </button>
                      <img
                        src={image}
                        alt="첨부 이미지"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  )}
                </>
              )
            })()}
          </>
        )}

        {!isLocked && (
          <div className="flex items-center gap-2 py-4 border-y border-brand-line">
            <button onClick={handleLike} className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors ${liked ? 'bg-red-50 text-red-500' : 'text-brand-sub hover:bg-brand-card'}`}>
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              <span className="text-sm font-medium">{likeCount}</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-full text-brand-sub hover:bg-brand-card">
              <MessageSquare size={16} />
              <span className="text-sm font-medium">{isMockPost ? post.comments : dbComments.length}</span>
            </button>
            <button onClick={() => setSaved(!saved)} className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors ${saved ? 'bg-brand-green-light text-brand-green-dark' : 'text-brand-sub hover:bg-brand-card'}`}>
              <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
            </button>
            <ShareMenu
              title={post.title}
              url={typeof window !== 'undefined' ? `${window.location.origin}/community/${post.id}` : `/community/${post.id}`}
              className="ml-auto"
            />
          </div>
        )}

        {!isLocked && (
          <section className="mt-6">
            <h3 className="font-medium text-sm mb-4">
              댓글 {isMockPost ? post.commentList.length : dbComments.length}
            </h3>
            <div className="space-y-5">
              {isMockPost ? (
                // mock 댓글
                post.commentList.map(c => (
                  <div key={c.id}>
                    <div className="flex gap-2.5">
                      <img src={c.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="text-xs font-medium">{c.author}</span>
                          <span className="text-[10px] text-brand-muted">{c.status}</span>
                        </div>
                        <p className="text-sm leading-relaxed">{c.content}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[11px] text-brand-muted">{c.time}</span>
                          <button className="text-[11px] text-brand-muted font-medium">답글</button>
                        </div>
                      </div>
                    </div>
                    {c.replies && c.replies.length > 0 && (
                      <div className="ml-10 mt-3 space-y-3 pl-3 border-l-2 border-brand-line">
                        {c.replies.map(r => (
                          <div key={r.id} className="flex gap-2.5">
                            <img src={r.avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-xs font-medium">{r.author}</span>
                                <span className="text-[10px] text-brand-muted">{r.status}</span>
                              </div>
                              <p className="text-sm leading-relaxed">{r.content}</p>
                              <span className="text-[11px] text-brand-muted">{r.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // DB 댓글 (topLevelComments는 mock Comment와 합쳐져 author가 string으로 추론되므로 dbComments만 사용)
                dbComments.filter(c => !c.parent_comment_id).map(c => (
                  <div key={c.id}>
                    <div className="flex gap-2.5">
                      {/* users 조인 객체의 avatar_url (mock 댓글의 author 문자열과 구분) */}
                      <img src={c.author?.avatar_url ?? 'https://i.pravatar.cc/60?img=30'} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="text-xs font-medium">{c.author?.nickname ?? '패밀로그 회원'}</span>
                          <span className="text-[10px] text-brand-muted">{c.author?.bio}</span>
                        </div>
                        <p className="text-sm leading-relaxed">{c.content}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[11px] text-brand-muted">{formatTime(c.created_at)}</span>
                          <button
                            onClick={() => setReplyTo({ id: c.id, author: c.author?.nickname ?? '패밀로그 회원' })}
                            className="text-[11px] text-brand-muted hover:text-brand-text font-medium"
                          >
                            답글
                          </button>
                        </div>
                      </div>
                    </div>
                    {getReplies(c.id).length > 0 && (
                      <div className="ml-10 mt-3 space-y-3 pl-3 border-l-2 border-brand-line">
                        {getReplies(c.id).map(r => (
                          <div key={r.id} className="flex gap-2.5">
                            <img src={r.author?.avatar_url ?? 'https://i.pravatar.cc/60?img=30'} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-xs font-medium">{r.author?.nickname ?? '패밀로그 회원'}</span>
                              </div>
                              <p className="text-sm leading-relaxed">{r.content}</p>
                              <span className="text-[11px] text-brand-muted">{formatTime(r.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              {!isMockPost && dbComments.length === 0 && (
                <div className="text-center py-8 text-sm text-brand-muted">첫 댓글을 남겨주세요.</div>
              )}
            </div>
          </section>
        )}
      </div>

      {!isLocked && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-white border-t border-brand-line p-3 z-30 lg:left-64">
          <div className="max-w-2xl mx-auto">
            {replyTo && (
              <div className="flex items-center justify-between px-2 pb-2 text-xs text-brand-muted">
                <span>↩ {replyTo.author}에게 답글</span>
                <button onClick={() => setReplyTo(null)} className="text-brand-muted">✕</button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <img src={user?.avatar ?? 'https://i.pravatar.cc/60?img=30'} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
              <div className="flex-1 flex items-center bg-brand-card rounded-full pr-1">
                <input
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
                  placeholder={replyTo ? `${replyTo.author}에게 답글...` : '따뜻한 댓글을 남겨보세요...'}
                  className="flex-1 bg-transparent px-4 py-2 text-sm outline-none"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!comment.trim() || submitting}
                  className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center disabled:bg-brand-line"
                >
                  <Send size={14} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}