'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Lock, Globe, ImagePlus, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { updatePost } from '@/lib/api/posts'
import { uploadImages, deleteImages } from '@/lib/upload'

const CATEGORIES = ['일상', '고민', '실천', '나눔'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_MAP: Record<Category, string> = {
  '일상': 'daily',
  '고민': 'concern',
  '실천': 'practice',
  '나눔': 'sharing',
}

const CATEGORY_MAP_REVERSE: Record<string, Category> = {
  daily: '일상',
  concern: '고민',
  practice: '실천',
  sharing: '나눔',
}

const MAX_IMAGES = 1

export default function CommunityEditPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<Category>('일상')
  const [visibility, setVisibility] = useState<'public' | 'members'>('members')

  // 기존 사진 (R2 URL 문자열, 삭제 시 목록에서만 제거)
  const [existingUrls, setExistingUrls] = useState<string[]>([])
  // 수정 중 제거된 기존 사진 URL (저장 시 R2에서 실제 삭제)
  const [deletedUrls, setDeletedUrls] = useState<string[]>([])
  // 새로 추가한 사진 (File + 로컬 미리보기 URL)
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
        .select('title, content, category, visibility, author_id, media_urls')
        .eq('id', postId)
        .is('deleted_at', null)
        .single()

      if (fetchError || !data) {
        router.replace('/community')
        return
      }

      if (!user || data.author_id !== user.id) {
        router.replace(`/community/${postId}`)
        return
      }

      setTitle(data.title ?? '')
      setContent(data.content ?? '')
      setCategory(CATEGORY_MAP_REVERSE[data.category] ?? '일상')
      setVisibility(data.visibility === 'public' ? 'public' : 'members')
      setExistingUrls(Array.isArray(data.media_urls) ? data.media_urls : [])
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

  const handleSubmit = async () => {
    if (!title.trim()) return setError('제목을 입력해주세요')
    if (!content.trim()) return setError('내용을 입력해주세요')
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
      category: CATEGORY_MAP[category],
      visibility,
      media_urls,
      thumbnail_url: media_urls[0] ?? null,
    })

    if (result.success) {
      // DB 업데이트 성공 후 R2에서 삭제된 파일 제거
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
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      <div className="sticky top-14 lg:top-0 z-20 bg-brand-bg/95 backdrop-blur-sm border-b border-brand-line px-4 lg:px-6 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-brand-sub">
          <ArrowLeft size={18} />
          <span className="text-sm">취소</span>
        </button>
        <span className="font-medium text-sm">글 수정</span>
        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim() || !content.trim()}
          className="text-sm font-medium text-brand-green disabled:text-brand-muted transition-colors"
        >
          {loading ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="px-4 lg:px-6 py-5 space-y-5">
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

        <div>
          <textarea
            placeholder="내용을 입력해주세요"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={12}
            className="w-full text-sm leading-relaxed bg-transparent border-none outline-none resize-none placeholder:text-brand-muted"
          />
        </div>

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
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  )
}
