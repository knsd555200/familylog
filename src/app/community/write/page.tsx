'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Globe, Users, EyeOff, ImagePlus, X, Calendar, Camera, ChevronDown, Check } from 'lucide-react'
import { createPost } from '@/lib/api/posts'
import { uploadImages } from '@/lib/upload'
import { useAuth } from '@/context/AuthContext'
import CreateFamilySheet from '@/components/family/CreateFamilySheet'

const MAX_IMAGES = 3

// 공개 범위 메타 — 칩/시트에서 공용 (아이콘·라벨·설명)
const VISIBILITY_META = {
  public:  { Icon: Globe,  label: '전체 공개', desc: '누구나 볼 수 있어요' },
  family:  { Icon: Users,  label: '가족만 보기', desc: '우리 가족만 볼 수 있어요' },
  private: { Icon: EyeOff, label: '나만 보기', desc: '지금은 나만 봐요. 먼 훗날 가족에게 전할 수 있어요' },
} as const
type Visibility = keyof typeof VISIBILITY_META

// 공통 텍스트 input / number input 스타일
const INPUT_CLS =
  'w-full px-3 py-2.5 text-sm bg-brand-card border border-brand-line rounded-xl outline-none focus:border-brand-green transition-colors placeholder:text-brand-muted'

function CommunityWriteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, status } = useAuth()

  // 행사 인증 컨텍스트
  const eventId          = searchParams.get('event_id')
  const eventTitle       = searchParams.get('event_title') ?? ''
  const eventMeritFromUrl = Number(searchParams.get('merit_reward') ?? 0)
  const isEventVerify    = !!eventId

  // 미션 탭 "오늘의 한 걸음"에서 넘어올 때 카테고리 프리필 (인증 글 제외)
  const categoryFromUrl  = searchParams.get('category')
  const writeCategory    = (['daily', 'concern', 'sharing'] as const).includes(categoryFromUrl as never)
    ? (categoryFromUrl as 'daily' | 'concern' | 'sharing')
    : 'daily'

  // 현재 로그인 유저의 권한 — 수퍼관리자 / 행사관리자
  const isAdmin        = user?.role === 'admin'
  const isEventManager = user?.role === 'event_manager'
  // 행사 글을 만들 수 있는 권한 (둘 중 하나면 가능)
  const canCreateEvent = isAdmin || isEventManager

  // ── 글 유형 (권한자만 전환 가능) ──────────────────────────────────────────
  //  · 행사관리자는 행사 글만 작성 가능 → 진입 시 행사 모드로 고정
  const [isEvent, setIsEvent] = useState(false)
  useEffect(() => {
    if (isEventManager) setIsEvent(true)
  }, [isEventManager])

  // ── 공통 필드 ─────────────────────────────────────────────────────────────
  const [title,      setTitle]      = useState('')
  const [content,    setContent]    = useState('')
  const [visibility, setVisibility] = useState<Visibility>('private')
  const visibilityInitializedRef = useRef(false)
  const visibilityTouchedRef = useRef(false)
  const [showVisibilitySheet, setShowVisibilitySheet] = useState(false)
  const [imageFiles,    setImageFiles]    = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [showNoFamilyModal, setShowNoFamilyModal] = useState(false)
  const [modalError, setModalError] = useState('')
  // 나만 보기로 저장 후 가족 만들기 시트 — 저장된 글 id 보관해 생성 후 그 글로 이동
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [savedPostId, setSavedPostId] = useState<string | null>(null)

  // 인증 사용자 확정 후 가정 유무로 기본 공개 범위를 한 번만 정한다.
  useEffect(() => {
    if (status !== 'authenticated' || !user) return
    if (visibilityInitializedRef.current || visibilityTouchedRef.current) return
    setVisibility(user.family_id ? 'family' : 'private')
    visibilityInitializedRef.current = true
  }, [status, user])

  const setUserVisibility = (next: Visibility) => {
    visibilityTouchedRef.current = true
    setVisibility(next)
  }

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

  // ── 가족만 보기 선택 시 — 가족 없으면 모달 표시 ─────────────────────────────
  const handleFamilyVisibilityClick = () => {
    if (!user?.family_id) {
      setModalError('')
      setShowNoFamilyModal(true)
    } else {
      setUserVisibility('family')
    }
  }

  // ── 제출 처리 ──────────────────────────────────────────────────────────────
  //  · visibilityOverride: 모달에서 private로 강제 저장 시 사용
  //  · opts.redirect=false: 저장만 하고 페이지 이동 보류(가족 만들기 시트로 이어갈 때)
  const handleSubmit = async (
    visibilityOverride?: Visibility,
    opts?: { redirect?: boolean }
  ): Promise<{ ok: boolean; id?: string }> => {
    const finalVisibility = visibilityOverride ?? visibility

    if (!title.trim())   { setError('제목을 입력해주세요'); return { ok: false } }
    if (!content.trim()) { setError('내용을 입력해주세요'); return { ok: false } }
    if (isEventVerify && imageFiles.length === 0) { setError('인증 사진을 첨부해주세요'); return { ok: false } }
    if (isEvent && !eventStartAt) { setError('행사 시작일시를 입력해주세요'); return { ok: false } }

    setLoading(true)
    setError('')

    try {
      let media_urls: string[] = []
      if (imageFiles.length > 0) {
        const { urls, error: uploadError } = await uploadImages(imageFiles)
        if (uploadError) {
          setError(uploadError)
          return { ok: false }
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
              post_type:           'community',
              title:               title.trim(),
              content:             content.trim(),
              category:            isEventVerify ? 'practice' : writeCategory,
              verify_merit_reward: isEventVerify ? eventMeritFromUrl : undefined,
              visibility:          finalVisibility,
              media_urls,
              thumbnail_url: media_urls[0] ?? undefined,
            }
      )

      if (result.success) {
        if (opts?.redirect !== false) {
          router.replace(
            isEventVerify ? `/events/${eventId}` : result.id ? `/community/${result.id}` : '/community'
          )
        }
        return { ok: true, id: result.id }
      } else {
        setError(result.error ?? '저장에 실패했어요. 다시 시도해주세요.')
        return { ok: false }
      }
    } catch {
      setError('저장에 실패했어요. 다시 시도해주세요.')
      return { ok: false }
    } finally {
      setLoading(false)
    }
  }

  // ── 모달: 나만 보기로 저장하고 → 그 자리에서 가족 만들기 시트 ────────────────
  const handleSavePrivateAndCreateFamily = async () => {
    if (!title.trim() || !content.trim()) {
      setModalError('제목과 내용을 입력한 후 진행할 수 있어요')
      return
    }
    setShowNoFamilyModal(false)
    // private로 저장하되 페이지 이동은 보류 → 저장된 글 id 보관 후 가족 만들기 시트
    const { ok, id } = await handleSubmit('private', { redirect: false })
    if (ok) {
      setSavedPostId(id ?? null)
      setShowCreateSheet(true)
    }
  }

  return (
    // 아래에서 슬라이드업 — 작성 박스에서 확장되는 느낌
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6" style={{ animation: 'writeSlideUp 0.28s ease-out' }}>
      {/* 상단 바 */}
      <div className="sticky top-14 lg:top-0 z-20 bg-brand-bg/95 backdrop-blur-sm border-b border-brand-line px-4 lg:px-6 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-brand-sub">
          <ArrowLeft size={18} />
          <span className="text-sm">취소</span>
        </button>
        <div className="flex items-center gap-2">
          {/* 공개 범위 칩 — 행사·인증 글이 아닐 때만. 누르면 시트로 선택 */}
          {!isEvent && !isEventVerify && (
            <button
              onClick={() => setShowVisibilitySheet(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-brand-card rounded-full text-xs font-medium text-brand-sub"
            >
              {(() => { const { Icon, label } = VISIBILITY_META[visibility]; return <><Icon size={13} /><span>{label}</span></> })()}
              <ChevronDown size={12} />
            </button>
          )}
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !title.trim() || !content.trim()}
            className="text-sm font-medium text-brand-green disabled:text-brand-muted transition-colors"
          >
            {loading ? '저장 중...' : '게시'}
          </button>
        </div>
      </div>

      <div className="px-4 lg:px-6 py-5 space-y-5">

        {/* ── 행사 인증 컨텍스트 배지 ────────────────────────────────────── */}
        {isEventVerify && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-green-light rounded-xl">
            <Camera size={15} className="text-brand-green flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-brand-green-dark">참여 인증 글</p>
              <p className="text-xs text-brand-green truncate">{eventTitle}</p>
            </div>
          </div>
        )}

        {/* ── 권한자 전용: 글 유형 토글 ──────────────────────────────────── */}
        {/*  · 수퍼관리자: 일반 글 / 행사 글 자유 전환                         */}
        {/*  · 행사관리자: 행사 글만 가능 → 일반 글 버튼 숨김(행사 모드 고정)  */}
        {canCreateEvent && (
          <div>
            <label className="text-xs text-brand-sub mb-2 block">글 유형</label>
            <div className="flex gap-2">
              {isAdmin && (
                <button
                  onClick={() => handleToggleEventMode(false)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    !isEvent ? 'bg-brand-text text-white' : 'bg-brand-card text-brand-sub'
                  }`}
                >
                  일반 글
                </button>
              )}
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

        {/* ── 제목 ─────────────────────────────────────────────────────── */}
        <div>
          <input
            type="text"
            placeholder="제목을 입력해주세요"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            autoFocus  // 진입 즉시 포커스 — 박스에서 바로 이어 쓰는 느낌
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

      {/* ── 공개 범위 선택 시트 ─────────────────────────────────────────────── */}
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
                      // 가족만 보기는 가족 유무 분기(없으면 안내 모달) — 기존 핸들러 재사용
                      if (v === 'family') handleFamilyVisibilityClick()
                      else setUserVisibility(v)
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

      {/* ── 가족 없을 때 안내 모달 ──────────────────────────────────────────── */}
      {showNoFamilyModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNoFamilyModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl lg:rounded-3xl px-6 pt-6 pb-10 lg:pb-8 space-y-4">
            <div>
              <p className="font-semibold text-brand-text mb-1">가족만 보기는 가족 공간이 필요해요</p>
              <p className="text-sm text-brand-sub">가족 공간을 만들거나 초대를 받아야 사용할 수 있어요.</p>
            </div>

            {modalError && <p className="text-xs text-red-500">{modalError}</p>}

            <div className="space-y-2.5">
              <button
                onClick={handleSavePrivateAndCreateFamily}
                disabled={loading}
                className="w-full py-3 bg-brand-green text-white text-sm font-semibold rounded-2xl disabled:opacity-50 transition-opacity"
              >
                {loading ? '저장 중…' : '나만 보기로 저장하고 가족 만들기'}
              </button>
              <button
                onClick={() => { setUserVisibility('private'); setShowNoFamilyModal(false) }}
                className="w-full py-3 bg-brand-card text-brand-text text-sm font-medium rounded-2xl"
              >
                나만 보기로 바꾸고 계속 쓰기
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

      {/* 나만 보기로 저장 직후 — 그 자리에서 가족 생성 → 저장한 글로 이동 */}
      {showCreateSheet && (
        <CreateFamilySheet
          onClose={() => setShowCreateSheet(false)}
          onCreated={() => {
            setShowCreateSheet(false)
            router.replace(savedPostId ? `/community/${savedPostId}` : '/community')
          }}
        />
      )}

      <style>{`@keyframes writeSlideUp { from { opacity: 0; transform: translateY(40px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  )
}

// useSearchParams() 사용 — 프리렌더 정적 bail-out 방지를 위해 Suspense로 감쌈
export default function CommunityWritePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24 text-brand-muted text-sm">불러오는 중...</div>}>
      <CommunityWriteForm />
    </Suspense>
  )
}
