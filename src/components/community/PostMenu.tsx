'use client'
import { useState, useEffect, useRef } from 'react'
import { MoreHorizontal, Trash2, Flag, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { deletePost } from '@/lib/api/posts'

interface Props {
  postId: string
  authorId?: string
  /** mock 글(c1 등)은 삭제·수정 불가 */
  isMock?: boolean
  onDeleted?: () => void
  className?: string
}

export default function PostMenu({ postId, authorId, isMock, onDeleted, className = '' }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 로그인한 유저의 role 조회
  useEffect(() => {
    if (!user) { setUserRole(null); return }
    supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setUserRole(data?.role ?? null))
  }, [user])

  // 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  // DB 글이면서 본인 글이거나 admin인 경우에만 삭제 가능
  const canDelete =
    !isMock &&
    !!user &&
    !!authorId &&
    (user.id === authorId || userRole === 'admin')

  // 수정은 작성자 본인만 가능
  const canEdit =
    !isMock &&
    !!user &&
    !!authorId &&
    user.id === authorId

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(false)
    if (!window.confirm('이 글을 삭제할까요? 삭제 후에는 복구할 수 없어요.')) return

    setDeleting(true)
    const result = await deletePost(postId)
    setDeleting(false)

    if (result.success) {
      onDeleted?.()
    } else {
      alert(result.error ?? '삭제에 실패했어요')
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(false)
    router.push(`/community/edit/${postId}`)
  }

  const handleReport = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(false)
    // 신고 API 연동 전 임시 처리
    alert('신고가 접수되었어요. 검토 후 조치할게요.')
  }

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(v => !v)
        }}
        disabled={deleting}
        className="p-1.5 rounded-lg text-brand-muted hover:bg-brand-card hover:text-brand-text transition-colors"
        aria-label="게시글 옵션"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[120px] bg-white border border-brand-line rounded-xl shadow-lg py-1 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 작성자 본인에게만 수정 버튼 표시 */}
          {canEdit && (
            <button
              type="button"
              onClick={handleEdit}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-text hover:bg-brand-card"
            >
              <Pencil size={16} />
              수정
            </button>
          )}
          {/* 작성자·admin에게만 삭제 버튼 표시 */}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={16} />
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          )}
          {/* 본인 글이 아닌 경우에만 신고 표시 */}
          {!(user && authorId && user.id === authorId) && (
            <button
              type="button"
              onClick={handleReport}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-sub hover:bg-brand-card"
            >
              <Flag size={16} />
              신고
            </button>
          )}
        </div>
      )}
    </div>
  )
}
