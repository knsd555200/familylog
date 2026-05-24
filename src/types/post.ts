export interface Comment {
  id: string
  author: string
  avatar: string
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
  status: string
  time: string
  likes: number
  comments: number
  thumbnail?: string
  mediaUrls?: string[]
  visibility: 'public' | 'member'
  commentList: Comment[]
  authorId?: string
}

export interface FeedPost {
  id: string
  type: 'image' | 'video' | 'text'
  isOfficial?: boolean
  isMemberOnly?: boolean
  author: { nickname: string; avatar: string; status: string }
  title: string
  description: string
  images: string[]
  likes: number
  comments: number
  category: string
  videoThumb?: string
  authorId?: string
  // DB posts.post_type 값 — CommentDrawer에서 event 여부 판단에 사용
  postType?: string
}
