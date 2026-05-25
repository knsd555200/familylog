'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock, Globe, ImagePlus, X, Calendar } from 'lucide-react'
import { createPost } from '@/lib/api/posts'
import { uploadImages } from '@/lib/upload'
import { useAuth } from '@/context/AuthContext'

const CATEGORIES = ['일상', '고민', '실천', '나눔'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_MAP: Record<Category, string> = {
  '일상': 'daily',
  '고민': 'concern',
  '실천': 'practice',
  '나눔': 'sharing',
}

const MAX_IMAGES = 3

// 공통 텍스트 input / number input 스타일
const INPUT_CLS =
  'w-full px-3 py-2.5 text-sm bg-brand-card border border-brand-line rounded-xl outline-none focus:border-brand-green transition-colors placeholder:text-brand-muted'

export default function CommunityWritePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  // 현재 로그인 유저가 관리자인지 여부
  const isAdmin = user?.role === 'admin'

  // ── 글 유형 (관리자만 전환 가능) ──────────────────────────────────────────
  const [isEvent, setIsEvent] = useState(false)

  // ── 공통 필드 ─────────────────────────────────────────────────────────────
  const [title,      setTitle]      = useState('')
  const [content,    setContent]    = useState('')
  const [category,   setCategory]   = useState<Category>('일상')
  const [visibility, setVisibility] = useState<'public' | 'members'>('members')
  const [imageFiles,    setImageFiles]    = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // ── 행사 전용 필드 ────────────────────────────────────────────────────────
  const [eventStartAt,         setEventStartAt]         = useState('')
  const [eventEndAt,           setEventEndAt]           = useState('')
  const [eventLocation,        setEventLocation]        = useState('')
  const [eventMaxParticipants, setEventMaxParticipants] = useState<string>('')
  const [eventMeritReward,     setEventMeritReward]     = useState<string>('50')

  // ── 이미지 선택 ───────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const remaining = MAX_IMAGES - imageFiles.length
    const accepted  = files.slice(0, remaining)

    setImageFiles(prev => [...prev, ...accepted])
    accepted.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        setImagePreviews(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })

    // 같은 파일 재선택 허용을 위해 input 값 초기화
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  // ── 글 유형 전환 시 행사 전용 필드 초기화 ─────────────────────────────────
  const handleToggleEventMode = (toEvent: boolean) => {
    setIsEvent(toEvent)
    if (toEvent) {
      // 행사 글은 전체 공개 고정 — 실천 탭 배너·행사 목록 노출을 위해 public으로 설정
      setVisibility('public')
    } else {
      setEventStartAt('')
      setEventEndAt('')
      setEventLocation('')
      setEventMaxParticipants('')
      setEventMeritReward('50')
    }
  }

  // ── 제출 처리 ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim())   return setError('제목을 입력해주세요')
    if (!content.trim()) return setError('내용을 입력해주세요')
    if (isEvent && !eventStartAt) return setError('행사 시작일시를 입력해주세요')

    setLoading(true)
    setError('')

    try {
      // 이미지 업로드
      let media_urls: string[] = []
      if (imageFiles.length > 0) {
        const { urls, error: uploadError } = await uploadImages(imageFiles)
        if (uploadError) {
          setError(uploadError)
          return
        }
        media_urls = urls
      }

      const result = await createPost(
        isEvent
          ? {
              post_type:              'event',
              title:                  title.trim(),
              content:                content.trim(),
              category:               'practice',
              visibility:             'public',
              media_urls,
              thumbnail_url:          media_urls[0] ?? undefined,
              event_start_at:         eventStartAt  || null,
              event_end_at:           eventEndAt    || null,
              event_location:         eventLocation.trim() || null,
              event_max_participants: eventMaxParticipants ? Number(eventMaxParticipants) : null,
              event_merit_reward:     eventMeritReward ? Number(eventMeritReward) : 50,
              event_is_closed:        false,
            }
          : {
              post_type:    'community',
              title:        title.trim(),
              content:      content.trim(),
              category:     CATEGORY_MAP[category],
              visibility,
              media_urls,
              thumbnail_url: media_urls[0] ?? undefined,
            }
      )

      if (result.success) {
        router.push('/community')
        router.refresh()
      } else {
        setError(result.error ?? '저장에 실패했어요. 다시 시도해주세요.')
      }
    } catch {
      setError('저장에 실패했어요. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      {/* 상단 바 */}
      <div className="sticky top-14 lg:top-0 z-20 bg-brand-bg/95 backdrop-blur-sm border-b border-brand-line px-4 lg:px-6 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-brand-sub">
          <ArrowLeft size={18} />
          <span className="text-sm">취소</span>
        </button>
        <span className="font-medium text-sm">
          {isEvent ? '행사 글 쓰기' : '글 쓰기'}
        </span>
        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim() || !content.trim()}
          className="text-sm font-medium text-brand-green disabled:text-brand-muted transition-colors"
        >
          {loading ? '저장 중...' : '게시'}
        </button>
      </div>

      <div className="px-4 lg:px-6 py-5 space-y-5">

        {/* ── 관리자 전용: 글 유형 토글 ──────────────────────────────────── */}
        {isAdmin && (
          <div>
            <label className="text-xs text-brand-sub mb-2 block">글 유형</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleToggleEventMode(false)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  !isEvent ? 'bg-brand-text text-white' : 'bg-brand-card text-brand-sub'
                }`}
              >
                일반 글
              </button>
              <button
                onClick={() => handleToggleEventMode(true)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isEvent ? 'bg-brand-green text-white' : 'bg-brand-card text-brand-sub'
                }`}
              >
                <Calendar size={12} />
                행사 글
              </button>
            </div>
          </div>
        )}

        {/* ── 카테고리 (행사 글이면 숨김 — 'practice'로 자동 고정) ─────── */}
        {!isEvent && (
          <div>
            <label className="text-xs text-brand-sub mb-2 block">카테고리</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    category === c ? 'bg-brand-text text-white' : 'bg-brand-card text-brand-sub'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 공개 범위 (행사 글이면 숨김 — 'public'으로 자동 고정) ─────── */}
        {!isEvent && (
          <div>
            <label className="text-xs text-brand-sub mb-2 block">공개 범위</label>
            <div className="flex gap-2">
              <button
                onClick={() => setVisibility('members')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  visibility === 'members' ? 'bg-brand-text text-white' : 'bg-brand-card text-brand-sub'
                }`}
              >
                <Lock size={12} /> 멤버 공개
              </button>
              <button
                onClick={() => setVisibility('public')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  visibility === 'public' ? 'bg-brand-text text-white' : 'bg-brand-card text-brand-sub'
                }`}
              >
                <Globe size={12} /> 전체 공개
              </button>
            </div>
          </div>
        )}

        {/* ── 제목 ─────────────────────────────────────────────────────── */}
        <div>
          <input
            type="text"
            placeholder="제목을 입력해주세요"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            className="w-full text-lg font-medium bg-transparent border-none outline-none placeholder:text-brand-muted"
          />
        </div>

        <div className="border-t border-brand-line" />

        {/* ── 내용 ─────────────────────────────────────────────────────── */}
        <div>
          <textarea
            placeholder="내용을 입력해주세요"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={12}
            className="w-full text-sm leading-relaxed bg-transparent border-none outline-none resize-none placeholder:text-brand-muted"
          />
        </div>

        {/* ── 행사 전용 필드 ────────────────────────────────────────────── */}
        {isEvent && (
          <div className="space-y-4 bg-brand-card rounded-2xl p-4 border border-brand-line">
            <p className="text-xs font-medium text-brand-green flex items-center gap-1.5">
              <Calendar size={13} /> 행사 정보
            </p>

            {/* 시작일시 */}
            <div>
              <label className="text-xs text-brand-sub mb-1.5 block">
                행사 시작일시 <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={eventStartAt}
                onChange={e => setEventStartAt(e.target.value)}
                className={INPUT_CLS}
              />
            </div>

            {/* 종료일시 */}
            <div>
              <label className="text-xs text-brand-sub mb-1.5 block">행사 종료일시</label>
              <input
                type="datetime-local"
                value={eventEndAt}
                onChange={e => setEventEndAt(e.target.value)}
                min={eventStartAt || undefined}
                className={INPUT_CLS}
              />
            </div>

            {/* 장소 */}
            <div>
              <label className="text-xs text-brand-sub mb-1.5 block">장소</label>
              <input
                type="text"
                placeholder="예) 올림픽공원 평화의 광장"
                value={eventLocation}
                onChange={e => setEventLocation(e.target.value)}
                maxLength={100}
                className={INPUT_CLS}
              />
            </div>

            {/* 최대 참가 인원 */}
            <div>
              <label className="text-xs text-brand-sub mb-1.5 block">최대 참가 인원</label>
              <input
                type="number"
                placeholder="제한 없으면 비워두세요"
                value={eventMaxParticipants}
                onChange={e => setEventMaxParticipants(e.target.value)}
                min={1}
                className={INPUT_CLS}
              />
            </div>

            {/* 참여 포인트 */}
            <div>
              <label className="text-xs text-brand-sub mb-1.5 block">참여 포인트 (NP)</label>
              <input
                type="number"
                value={eventMeritReward}
                onChange={e => setEventMeritReward(e.target.value)}
                min={0}
                step={10}
                className={INPUT_CLS}
              />
            </div>
          </div>
        )}

        {/* ── 이미지 미리보기 ───────────────────────────────────────────── */}
        {imagePreviews.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 flex-shrink-0">
                <img
                  src={src}
                  alt={`첨부 이미지 ${i + 1}`}
                  className="w-full h-full object-cover rounded-xl border border-brand-line"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-text text-white rounded-full flex items-center justify-center"
                  aria-label="이미지 삭제"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── 사진 첨부 버튼 ─────────────────────────────────────────────── */}
        <div className="border-t border-brand-line pt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageFiles.length >= MAX_IMAGES}
            className="flex items-center gap-2 text-sm text-brand-sub hover:text-brand-text disabled:text-brand-muted transition-colors"
          >
            <ImagePlus size={18} />
            <span>사진 첨부</span>
            <span className="text-xs text-brand-muted">(최대 {MAX_IMAGES}장)</span>
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  )
}
