'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Send, Heart, Camera } from 'lucide-react'
import type { FeedPost, Comment as MockComment } from '@/types/post'
import { communityPosts } from '@/data/community'
import { getComments, createComment, deleteComment, getMyCommentLikes, toggleCommentLike, type DbComment } from '@/lib/api/posts'
import { uploadImages } from '@/lib/upload'
import { useAuth } from '@/context/AuthContext'

interface Props {
  post: FeedPost | null
  onClose: () => void
  onCommentCountChange: (postId: string, count: number) => void
  // post_type='event'일 때만 사진 첨부 버튼 노출
  postType?: string
}

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

// mock 댓글 + 답글 개수 합산
function countMockComments(commentList: MockComment[]): number {
  return commentList.reduce((sum, c) => sum + 1 + (c.replies?.length ?? 0), 0)
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

function countVisibleDbComments(comments: DbComment[]): number {
  return comments
    .filter(c => !c.parent_comment_id)
    .reduce((sum, c) => {
      const replies = comments.filter(r => r.parent_comment_id === c.id)
      if (c.deleted_at && replies.length === 0) return sum
      return sum + 1 + replies.length
    }, 0)
}

function getVisibleTopLevel(comments: DbComment[]): DbComment[] {
  return comments.filter(c => !c.parent_comment_id)
}

export default function CommentDrawer({ post, onClose, onCommentCountChange, postType }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const [dbComments, setDbComments] = useState<DbComment[]>([])
  const [loading, setLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null)
  const [showLoginToast, setShowLoginToast] = useState(false)
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set())
  const loginToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const likingLockRef = useRef(false)

  // 댓글 첨부 이미지 (event 글에서만 사용, 최대 1장)
  const [commentImage, setCommentImage] = useState<File | null>(null)
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // 이미지 선택 핸들러 — FileReader로 미리보기 생성
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCommentImage(file)
    const reader = new FileReader()
    reader.onload = ev => setCommentImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    // 같은 파일 재선택 허용을 위해 input 값 초기화
    e.target.value = ''
  }

  // 선택한 이미지 제거
  const handleRemoveImage = () => {
    setCommentImage(null)
    setCommentImagePreview(null)
  }

  const showLoginRequiredToast = useCallback(() => {
    setShowLoginToast(true)
    if (loginToastTimerRef.current) clearTimeout(loginToastTimerRef.current)
    loginToastTimerRef.current = setTimeout(() => setShowLoginToast(false), 3000)
  }, [])

  useEffect(() => {
    return () => {
      if (loginToastTimerRef.current) clearTimeout(loginToastTimerRef.current)
    }
  }, [])

  const mockPost = post ? communityPosts.find(p => p.id === post.id) : null
  const isMock = post ? !isUUID(post.id) : false

  useEffect(() => {
    if (!post) return
    const mock = communityPosts.find(p => p.id === post.id)

    if (!isUUID(post.id) && mock) {
      const count = countMockComments(mock.commentList)
      onCommentCountChange(post.id, count)
      setDbComments([])
      setLikedCommentIds(new Set())
      setLoading(false)
      return
    }

    setLoading(true)
    getComments(post.id).then(async data => {
      setDbComments(data)
      onCommentCountChange(post.id, countVisibleDbComments(data))
      const likes = await getMyCommentLikes(data.filter(c => !c.deleted_at).map(c => c.id))
      setLikedCommentIds(likes)
      setLoading(false)
    })
  }, [post?.id, onCommentCountChange])

  const refreshComments = async () => {
    if (!post) return
    const data = await getComments(post.id)
    setDbComments(data)
    onCommentCountChange(post.id, countVisibleDbComments(data))
    const likes = await getMyCommentLikes(data.filter(c => !c.deleted_at).map(c => c.id))
    setLikedCommentIds(likes)
  }

  const handleToggleLike = async (commentId: string) => {
    if (likingLockRef.current) return

    if (!user) {
      showLoginRequiredToast()
      return
    }

    const wasLiked = likedCommentIds.has(commentId)
    likingLockRef.current = true

    setLikedCommentIds(prev => {
      const next = new Set(prev)
      if (wasLiked) next.delete(commentId)
      else next.add(commentId)
      return next
    })
    setDbComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, like_count: Math.max(0, c.like_count + (wasLiked ? -1 : 1)) }
        : c
    ))

    const result = await toggleCommentLike(commentId)
    likingLockRef.current = false

    if (result.error) {
      setLikedCommentIds(prev => {
        const next = new Set(prev)
        if (wasLiked) next.add(commentId)
        else next.delete(commentId)
        return next
      })
      setDbComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, like_count: Math.max(0, c.like_count + (wasLiked ? 1 : -1)) }
          : c
      ))
      if (result.error === '로그인이 필요해요') showLoginRequiredToast()
    }
  }

  const handleSubmit = async () => {
    if (!post || !commentText.trim()) return

    if (!user) {
      showLoginRequiredToast()
      return
    }

    // 첨부 이미지가 있으면 먼저 업로드 (event 글 댓글 전용)
    let media_urls: string[] | undefined
    if (commentImage) {
      setImageUploading(true)
      const { urls, error: uploadError } = await uploadImages([commentImage])
      setImageUploading(false)
      if (uploadError) {
        alert(uploadError)
        return
      }
      media_urls = urls
    }

    const result = await createComment({
      post_id: post.id,
      content: commentText.trim(),
      parent_comment_id: replyTo?.id,
      media_urls,
    })
    if (!result.success) {
      if (result.error === '로그인이 필요해요') {
        showLoginRequiredToast()
        return
      }
      alert(result.error ?? '댓글 등록에 실패했어요')
      return
    }

    // 전송 완료 후 입력 상태 초기화
    setCommentText('')
    setReplyTo(null)
    setCommentImage(null)
    setCommentImagePreview(null)
    await refreshComments()
  }

  const handleDelete = async (commentId: string) => {
    if (!post) return

    const result = await deleteComment(commentId)
    if (!result.success) return

    if (replyTo?.id === commentId) setReplyTo(null)
    await refreshComments()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!post) return null

  const displayCount = isMock && mockPost
    ? countMockComments(mockPost.commentList)
    : countVisibleDbComments(dbComments)

  const visibleTopLevel = getVisibleTopLevel(dbComments)
  const getReplies = (parentId: string) => dbComments.filter(c => c.parent_comment_id === parentId)

  const renderCommentActions = (comment: DbComment, parentId?: string) => {
    if (comment.deleted_at) return null

    const replyParentId = parentId ?? comment.id
    const replyAuthor = comment.author?.nickname ?? '패밀로그 회원'

    return (
      <div className="flex items-center gap-4 mt-1.5">
        <span className="text-[11px] text-brand-muted">{formatTime(comment.created_at)}</span>
        <button
          type="button"
          onClick={() => handleToggleLike(comment.id)}
          className={`flex items-center gap-0.5 text-[11px] ${
            likedCommentIds.has(comment.id) ? 'text-red-500' : 'text-brand-muted hover:text-brand-text'
          }`}
        >
          <Heart size={12} fill={likedCommentIds.has(comment.id) ? 'currentColor' : 'none'} />
          <span>{comment.like_count}</span>
        </button>
        <button
          type="button"
          onClick={() => setReplyTo({ id: replyParentId, author: replyAuthor })}
          className="text-[11px] text-brand-muted hover:text-brand-text"
        >
          답글
        </button>
        {user?.id === comment.author_id && (
          <button
            type="button"
            onClick={() => handleDelete(comment.id)}
            className="text-[11px] text-brand-muted hover:text-red-500"
          >
            삭제
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-end animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-3xl h-[75vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-brand-line">
          <div className="text-sm font-medium">댓글 {displayCount}개</div>
          <button onClick={onClose} className="p-1 text-brand-muted">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading && (
            <div className="text-center py-8 text-sm text-brand-muted">불러오는 중...</div>
          )}

          {!loading && isMock && mockPost && (
            mockPost.commentList.length === 0 ? (
              <div className="text-center py-8 text-sm text-brand-muted">첫 댓글을 남겨주세요.</div>
            ) : (
              mockPost.commentList.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <img src={c.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-brand-text">{c.author}</span>
                      <span className="text-[10px] text-brand-muted">{c.status}</span>
                    </div>
                    <p className="text-sm text-brand-text mt-0.5 leading-relaxed">{c.content}</p>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-[11px] text-brand-muted">{c.time}</span>
                      <button className="text-[11px] text-brand-muted hover:text-brand-text">답글</button>
                    </div>
                    {c.replies && c.replies.length > 0 && (
                      <div className="mt-3 ml-2 pl-3 border-l-2 border-brand-line space-y-3">
                        {c.replies.map(r => (
                          <div key={r.id}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-brand-text">{r.author}</span>
                              <span className="text-[10px] text-brand-muted">{r.status}</span>
                            </div>
                            <p className="text-sm text-brand-text mt-0.5 leading-relaxed">{r.content}</p>
                            <span className="text-[11px] text-brand-muted">{r.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )
          )}

          {!loading && !isMock && (
            visibleTopLevel.length === 0 ? (
              <div className="text-center py-8 text-sm text-brand-muted">첫 댓글을 남겨주세요.</div>
            ) : (
              visibleTopLevel.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  {!c.deleted_at && (
                    <img
                      src={c.author?.avatar_url ?? 'https://i.pravatar.cc/60?img=30'}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  <div className={`flex-1 min-w-0 ${c.deleted_at ? 'ml-10' : ''}`}>
                    {!c.deleted_at && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-brand-text">{c.author?.nickname ?? '패밀로그 회원'}</span>
                        <span className="text-[10px] text-brand-muted">{c.author?.bio}</span>
                      </div>
                    )}
                    {c.deleted_at ? (
                      <p className="text-sm text-brand-muted mt-0.5">삭제된 댓글입니다</p>
                    ) : (
                      <p className="text-sm text-brand-text mt-0.5 leading-relaxed">{c.content}</p>
                    )}
                    {renderCommentActions(c)}
                    {getReplies(c.id).length > 0 && (
                      <div className="mt-3 ml-2 pl-3 border-l-2 border-brand-line space-y-3">
                        {getReplies(c.id).map(r => (
                          <div key={r.id}>
                            {!r.deleted_at && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-brand-text">{r.author?.nickname ?? '패밀로그 회원'}</span>
                              </div>
                            )}
                            {r.deleted_at ? (
                              <p className="text-sm text-brand-muted mt-0.5">삭제된 댓글입니다</p>
                            ) : (
                              <p className="text-sm text-brand-text mt-0.5 leading-relaxed">{r.content}</p>
                            )}
                            {renderCommentActions(r, c.id)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )
          )}
        </div>

        <div className="border-t border-brand-line p-3">
          {showLoginToast && (
            <div
              role="status"
              className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-brand-green/25 bg-brand-card px-4 py-3 shadow-sm animate-slide-up"
            >
              <p className="text-sm text-brand-text">댓글을 달려면 로그인이 필요해요</p>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="flex-shrink-0 rounded-full bg-brand-green px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
              >
                로그인하기
              </button>
            </div>
          )}
          {replyTo && (
            <div className="flex items-center justify-between px-1 pb-2 text-xs text-brand-muted">
              <span>@{replyTo.author} 에게 답글</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-brand-muted"
                aria-label="답글 취소"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* 이미지 미리보기 — 선택된 첨부 이미지 표시 (event 글 전용) */}
          {commentImagePreview && (
            <div className="relative mb-2 w-fit">
              <img
                src={commentImagePreview}
                alt="첨부 이미지 미리보기"
                className="h-20 rounded-xl object-cover border border-brand-line"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-text text-white rounded-full flex items-center justify-center"
                aria-label="이미지 제거"
              >
                <X size={11} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <img
              src={user?.avatar || 'https://i.pravatar.cc/100?img=30'}
              alt=""
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />

            {/* event 글 댓글일 때만 카메라 버튼 노출 */}
            {postType === 'event' && (
              <>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={!!commentImage}
                  className="flex-shrink-0 text-brand-muted hover:text-brand-text disabled:text-brand-muted/40 transition-colors"
                  aria-label="사진 첨부"
                >
                  <Camera size={20} />
                </button>
              </>
            )}

            <div className="flex-1 flex items-center bg-brand-card rounded-full pr-1">
              <input
                className="flex-1 bg-transparent px-4 py-2 text-sm outline-none"
                placeholder="댓글 달기..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={imageUploading}
                className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center disabled:opacity-50"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
