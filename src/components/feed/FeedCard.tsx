'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Share2, Bookmark, Play, Lock, Volume2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { FeedPost } from '@/types/post'
import { MILONE_SYSTEM_USER_ID } from '@/lib/constants'

const CATEGORY_LABEL: Record<string, string> = {
  daily: '일상',
  concern: '고민',
  practice: '실천',
  sharing: '나눔',
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category
}

interface Props {
  post: FeedPost
  isLoggedIn: boolean
  isLiked: boolean
  likeCount: number
  commentCount: number
  onLike: () => void
  onLockedClick: () => void
  onCommentClick: (post: FeedPost) => void
}

export default function FeedCard({
  post, isLoggedIn, isLiked, likeCount, commentCount, onLike, onLockedClick, onCommentClick,
}: Props) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)

  const isLocked = post.isMemberOnly && !isLoggedIn
  // 밀로네 시스템 계정 글 판별 — boolean 단순 비교라 매 렌더 새 참조가 생기지 않음(리렌더 영향 없음)
  const isMilone = post.authorId === MILONE_SYSTEM_USER_ID
  const images = post.type === 'video' && post.videoThumb ? [post.videoThumb] : post.images
  const displayImg = images[imgIdx] || images[0]

  const handleCardClick = () => {
    if (!isLocked) router.push(`/community/${post.id}`)
  }

  return (
    <article className="feed-snap-card relative w-full overflow-hidden bg-black">
      {/* Background — clickable area */}
      <div className="absolute inset-0 cursor-pointer" onClick={handleCardClick}>
        <img src={displayImg} alt={post.title} className={`w-full h-full object-cover ${isLocked ? 'blur-2xl scale-110' : ''}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      </div>

      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20 px-6">
          <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center mb-3">
            <Lock size={26} className="text-white" />
          </div>
          <div className="text-white font-medium mb-1">멤버 전용 콘텐츠</div>
          <div className="text-white/70 text-sm mb-5 max-w-xs">로그인하면 이 가정의 솔직한 이야기를 확인할 수 있어요</div>
          <button onClick={onLockedClick} className="px-6 py-2.5 bg-white text-brand-text rounded-full font-medium text-sm">
            로그인하고 보기
          </button>
        </div>
      )}

      {post.type === 'video' && !isLocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-16 h-16 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Play size={28} className="text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {post.isOfficial && !isLocked && (
        <div className="absolute top-16 lg:top-6 left-4 z-20">
          <span className="bg-brand-green text-white text-[10px] font-medium px-2 py-1 rounded-full">공식</span>
        </div>
      )}

      {!isLocked && images.length > 1 && (
        <div className="absolute top-16 lg:top-6 left-1/2 -translate-x-1/2 flex gap-1 z-20 pointer-events-none">
          {images.map((_, i) => (
            <div key={i} className={`h-0.5 rounded-full transition-all ${i === imgIdx ? 'w-6 bg-white' : 'w-3 bg-white/40'}`} />
          ))}
        </div>
      )}

      {!isLocked && images.length > 1 && (
        <>
          {imgIdx > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setImgIdx(imgIdx - 1) }} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
              <ChevronLeft size={18} />
            </button>
          )}
          {imgIdx < images.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setImgIdx(imgIdx + 1) }} className="absolute right-14 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
              <ChevronRight size={18} />
            </button>
          )}
        </>
      )}

      {/* Right action bar — stops propagation */}
      {!isLocked && (
        <div className="absolute right-3 bottom-28 lg:bottom-12 flex flex-col items-center gap-5 z-20">
          <button onClick={(e) => { e.stopPropagation(); onLike() }} className="flex flex-col items-center gap-1">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md ${isLiked ? 'bg-red-500' : 'bg-black/30'}`}>
              <Heart size={22} className="text-white" fill={isLiked ? 'white' : 'none'} />
            </div>
            <span className="text-white text-[11px] font-medium">{likeCount}</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onCommentClick(post) }} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              <MessageCircle size={22} className="text-white" />
            </div>
            <span className="text-white text-[11px] font-medium">{commentCount}</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setSaved(!saved) }} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              <Bookmark size={20} className="text-white" fill={saved ? 'white' : 'none'} />
            </div>
            <span className="text-white text-[11px] font-medium">저장</span>
          </button>
          <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              <Share2 size={20} className="text-white" />
            </div>
            <span className="text-white text-[11px] font-medium">공유</span>
          </button>
          {post.type === 'video' && (
            <div className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              <Volume2 size={16} className="text-white" />
            </div>
          )}
        </div>
      )}

      {/* Bottom info — clickable → detail */}
      {!isLocked && (
        <div className="absolute left-0 right-16 bottom-20 lg:bottom-12 px-4 z-20 cursor-pointer" onClick={handleCardClick}>
          <div className="flex items-center gap-2 mb-3">
            <img src={post.author.avatar} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white/30" />
            <div>
              <div className="text-white font-medium text-sm leading-tight">{post.author.nickname}</div>
              <div className="text-white/70 text-[11px]">{post.author.status}</div>
            </div>
            {/* 밀로네는 family_id가 없는 빈 계정 — 팔로우(프로필 이동성) 제거하고 이름/아바타는 일반 텍스트·이미지로만 표시 */}
            {!isMilone && (
              <button onClick={(e) => e.stopPropagation()} className="ml-2 px-3 py-1 border border-white/50 rounded-full text-white text-[11px] font-medium">
                팔로우
              </button>
            )}
          </div>
          <h3 className="text-white font-medium text-base mb-1.5 leading-snug line-clamp-2">{post.title}</h3>
          <p className="text-white/85 text-[13px] leading-relaxed line-clamp-2">{post.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center text-[11px] text-white/60 bg-white/10 backdrop-blur-sm rounded-full px-2.5 py-0.5">#{getCategoryLabel(post.category)}</span>
            <span className="text-[11px] text-white/50">탭하여 자세히 보기 →</span>
          </div>
        </div>
      )}
    </article>
  )
}
