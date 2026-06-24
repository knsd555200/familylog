export interface Comment {
  id: string
  author: string
  avatar: string
  avatarFocalX?: number
  avatarFocalY?: number
  status: string
  content: string
  time: string
  replies?: Comment[]
}

export interface CommunityPost {
  id: string
  category: '부부 관계' | '자녀 양육' | '일상' | '고민'
  title: string
  preview: string
  content: string
  author: string
  avatar: string
  avatarFocalX?: number
  avatarFocalY?: number
  status: string
  time: string
  likes: number
  comments: number
  thumbnail?: string
  mediaUrls?: string[]
  visibility: 'public' | 'family' | 'private'
  commentList: Comment[]
  authorId?: string
  // 정렬·상대시간 표시용 원시 타임스탬프 (ISO). mock은 합성값
  createdAt?: string
}

export interface FeedPost {
  id: string
  type: 'image' | 'video' | 'text'
  isOfficial?: boolean
  isMemberOnly?: boolean
  author: { nickname: string; avatar: string; status: string; avatarFocalX?: number; avatarFocalY?: number }
  title: string
  description: string
  images: string[]
  likes: number
  comments: number
  category: string
  videoThumb?: string
  authorId?: string
  familyName?: string | null
  familyId?: string | null
  familyAvatar?: string | null
  familyAvatarFocalX?: number | null
  familyAvatarFocalY?: number | null
  // DB posts.post_type 값 — CommentDrawer에서 event 여부 판단에 사용
  postType?: string
  // 정렬·상대시간 표시용 원시 타임스탬프 (ISO). mock은 합성값
  createdAt?: string
}
