'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Globe, Users, EyeOff, ImagePlus, X, ChevronDown, Check, Calendar } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { updatePost } from '@/lib/api/posts'
import { uploadImages, deleteImages } from '@/lib/upload'

const VISIBILITY_META = {
  public:  { Icon: Globe,  label: '전체 공개', desc: '누구나 볼 수 있어요' },
  family:  { Icon: Users,  label: '가족만 보기', desc: '우리 가족만 볼 수 있어요' },
  private: { Icon: EyeOff, label: '나만 보기', desc: '지금은 나만 봐요. 먼 훗날 가족에게 전할 수 있어요' },
} as const
type Visibility = keyof typeof VISIBILITY_META

const INPUT_CLS =
  'w-full px-3 py-2.5 text-sm bg-brand-card border border-brand-line rounded-xl outline-none focus:border-brand-green transition-colors placeholder:text-brand-muted'

const MAX_IMAGES = 3

export default function CommunityEditPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isEvent, setIsEvent] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('daily')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [showVisibilitySheet, setShowVisibilitySheet] = useState(false)
  const [showNoFamilyModal, setShowNoFamilyModal] = useState(false)

  // 행사 전용 필드
  const [eventStartAt, setEventStartAt] = useState('')
  const [eventEndAt, setEventEndAt] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventMaxParticipants, setEventMaxParticipants] = useState<string>('')
  const [eventMeritReward, setEventMeritReward] = useState<string>('50')

  const [existingUrls, setExistingUrls] = useState<string[]>([])
  const [deletedUrls, setDeletedUrls] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  const totalCount = existingUrls.length + newFiles.length

  useEffect(() => {
    if (!postId) return

    const load = async () => {
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select('title, content, category, visibility, author_id, media_urls, post_type, event_start_at, event_end_at, event_location, event_max_participants, event_merit_reward')
        .eq('id', postId)
        .is('deleted_at', null)
        .single()

      if (fetchError || !data) {
        router.replace('/community')
        return
      }

      // 작성자 본인 또는 수퍼관리자(admin)만 수정 가능
      if (!user || (data.author_id !== user.id && user.role !== 'admin')) {
        router.replace(`/community/${postId}`)
        return
      }

      const isEventPost = data.post_type === 'event'
      setIsEvent(isEventPost)
      setTitle(data.title ?? '')
      setContent(data.content ?? '')
      setCategory(data.category ?? 'daily')
      setVisibility(
        isEventPost ? 'public' :
        data.visibility === 'family' ? 'family' :
        data.visibility === 'private' ? 'private' : 'public'
      )
      setExistingUrls(Array.isArray(data.media_urls) ? data.media_urls : [])

      if (isEventPost) {
        setEventStartAt(data.event_start_at ? data.event_start_at.slice(0, 16) : '')
        setEventEndAt(data.event_end_at ? data.event_end_at.slice(0, 16) : '')
        setEventLocation(data.event_location ?? '')
        setEventMaxParticipants(data.event_max_participants != null ? String(data.event_max_participants) : '')
        setEventMeritReward(data.event_merit_reward != null ? String(data.event_merit_reward) : '50')
      }

      setFetching(false)
    }

    load()
  }, [postId, user, router])

  const removeExisting = (index: number) => {
    const url = existingUrls[index]
    setExistingUrls(prev => prev.filter((_, i) => i !== index))
    setDeletedUrls(prev => [...prev, url])
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const remaining = MAX_IMAGES - totalCount
    const accepted = files.slice(0, remaining)

    setNewFiles(prev => [...prev, ...accepted])
    accepted.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        setNewPreviews(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })

    e.target.value = ''
  }

  const removeNew = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index))
    setNewPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleFamilyVisibilityClick = () => {
    if (!user?.family_id) {
      setShowNoFamilyModal(true)
    } else {
      setVisibility('family')
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) return setError('제목을 입력해주세요')
    if (!content.trim()) return setError('내용을 입력해주세요')
    if (isEvent && !eventStartAt) return setError('행사 시작일시를 입력해주세요')
    setLoading(true)
    setError('')

    let uploadedUrls: string[] = []
    if (newFiles.length > 0) {
      const { urls, error: uploadError } = await uploadImages(newFiles)
      if (uploadError) {
        setError(uploadError)
        setLoading(false)
        return
      }
      uploadedUrls = urls
    }

    const media_urls = [...existingUrls, ...uploadedUrls]

    const result = await updatePost(postId, {
      title: title.trim(),
      content: content.trim(),
      category,
      visibility: isEvent ? 'public' : visibility,
      media_urls,
      thumbnail_url: media_urls[0] ?? null,
      ...(isEvent && {
        event_start_at:         eventStartAt  || null,
        event_end_at:           eventEndAt    || null,
        event_location:         eventLocation.trim() || null,
        event_max_participants: eventMaxParticipants ? Number(eventMaxParticipants) : null,
        event_merit_reward:     eventMeritReward ? Number(eventMeritReward) : 50,
      }),
    })

    if (result.success) {
      await deleteImages(deletedUrls)
      router.replace(`/community/${postId}`)
    } else {
      setError(result.error ?? '저장에 실패했어요. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-brand-muted text-sm">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6" style={{ animation: 'writeSlideUp 0.28s ease-out' }}>
      {/* 상단 바 */}
      <div className="sticky top-14 lg:top-0 z-20 bg-brand-bg/95 backdrop-blur-sm border-b border-brand-line px-4 lg:px-6 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-brand-sub">
          <ArrowLeft size={18} />
          <span className="text-sm">취소</span>
        </button>
        <div className="flex items-center gap-2">
          {/* 공개 범위 칩 — 행사 글은 전체 공개 고정이라 숨김 */}
          {!isEvent && (
            <button
              onClick={() => setShowVisibilitySheet(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-brand-card rounded-full text-xs font-medium text-brand-sub"
            >
              {(() => { const { Icon, label } = VISIBILITY_META[visibility]; return <><Icon size={13} /><span>{label}</span></> })()}
              <ChevronDown size={12} />
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !content.trim()}
            className="text-sm font-medium text-brand-green disabled:text-brand-muted transition-colors"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="px-4 lg:px-6 py-5 space-y-5">

        {/* 제목 */}
        <div>
          <input
            type="text"
            placeholder="제목을 입력해주세요"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            autoFocus
            className="w-full text-lg font-medium bg-transparent border-none outline-none placeholder:text-brand-muted"
          />
        </div>

        <div className="border-t border-brand-line" />

        {/* 내용 */}
        <div>
          <textarea
            placeholder="내용을 입력해주세요"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={12}
            className="w-full text-sm leading-relaxed bg-transparent border-none outline-none resize-none placeholder:text-brand-muted"
          />
        </div>

        {/* 행사 전용 필드 */}
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

        {/* 이미지 미리보기 */}
        {(existingUrls.length > 0 || newPreviews.length > 0) && (
          <div className="flex gap-2 flex-wrap">
            {existingUrls.map((url, i) => (
              <div key={`existing-${i}`} className="relative w-24 h-24 flex-shrink-0">
                <img
                  src={url}
                  alt={`기존 이미지 ${i + 1}`}
                  className="w-full h-full object-cover rounded-xl border border-brand-line"
                />
                <button
                  type="button"
                  onClick={() => removeExisting(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-text text-white rounded-full flex items-center justify-center"
                  aria-label="이미지 삭제"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {newPreviews.map((src, i) => (
              <div key={`new-${i}`} className="relative w-24 h-24 flex-shrink-0">
                <img
                  src={src}
                  alt={`새 이미지 ${i + 1}`}
                  className="w-full h-full object-cover rounded-xl border border-brand-green/40"
                />
                <button
                  type="button"
                  onClick={() => removeNew(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-text text-white rounded-full flex items-center justify-center"
                  aria-label="이미지 삭제"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 사진 첨부 버튼 */}
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
            disabled={totalCount >= MAX_IMAGES}
            className="flex items-center gap-2 text-sm text-brand-sub hover:text-brand-text disabled:text-brand-muted transition-colors"
          >
            <ImagePlus size={18} />
            <span>사진 첨부</span>
            <span className="text-xs text-brand-muted">(최대 {MAX_IMAGES}장)</span>
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* 공개 범위 선택 시트 */}
      {showVisibilitySheet && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowVisibilitySheet(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl lg:rounded-3xl px-5 pt-5 pb-10 lg:pb-6">
            <p className="font-semibold text-brand-text mb-4 px-1">공개 범위</p>
            <div className="space-y-1.5">
              {(['public', 'family', 'private'] as const).map(v => {
                const { Icon, label, desc } = VISIBILITY_META[v]
                const active = visibility === v
                return (
                  <button
                    key={v}
                    onClick={() => {
                      setShowVisibilitySheet(false)
                      if (v === 'family') handleFamilyVisibilityClick()
                      else setVisibility(v)
                    }}
                    className={`w-full flex items-start gap-3 px-3 py-3 rounded-2xl text-left transition-colors ${
                      active ? 'bg-brand-green-light' : 'hover:bg-brand-card'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-white' : 'bg-brand-card'}`}>
                      <Icon size={16} className={active ? 'text-brand-green' : 'text-brand-sub'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${active ? 'text-brand-green-dark' : 'text-brand-text'}`}>{label}</p>
                      <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                    {active && <Check size={16} className="text-brand-green flex-shrink-0 mt-2" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 가족 없을 때 안내 모달 */}
      {showNoFamilyModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNoFamilyModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl lg:rounded-3xl px-6 pt-6 pb-10 lg:pb-8 space-y-4">
            <div>
              <p className="font-semibold text-brand-text mb-1">가족만 보기는 가족 공간이 필요해요</p>
              <p className="text-sm text-brand-sub">가족 공간을 만들거나 초대를 받아야 사용할 수 있어요.</p>
            </div>
            <div className="space-y-2.5">
              <button
                onClick={() => { setVisibility('private'); setShowNoFamilyModal(false) }}
                className="w-full py-3 bg-brand-card text-brand-text text-sm font-medium rounded-2xl"
              >
                나만 보기로 변경
              </button>
              <button
                onClick={() => setShowNoFamilyModal(false)}
                className="w-full py-3 text-brand-muted text-sm"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes writeSlideUp { from { opacity: 0; transform: translateY(40px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  )
}
