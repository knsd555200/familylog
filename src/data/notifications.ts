export interface Notification {
  id: string
  type: 'comment' | 'like' | 'event' | 'point' | 'system' | 'gathering'
  title: string
  body: string
  time: string
  read: boolean
  avatar?: string
}

export const notifications: Notification[] = [
  { id: 'n1', type: 'comment', title: '새 댓글', body: '민준·수진 가정님이 회원님의 글에 댓글을 달았어요: "저는 남편이 들어오면 15분은..."', time: '방금', read: false, avatar: 'https://i.pravatar.cc/60?img=5' },
  { id: 'n2', type: 'like', title: '좋아요', body: '우석·지은 가정님 외 23명이 회원님의 글을 좋아해요.', time: '1시간 전', read: false, avatar: 'https://i.pravatar.cc/60?img=9' },
  { id: 'n3', type: 'point', title: '포인트 적립', body: '첫 댓글 달기 미션 완료! +30P가 적립됐어요 🌿', time: '2시간 전', read: false },
  { id: 'n4', type: 'event', title: '행사 마감 임박', body: '패밀리 자연 캠프 마감까지 5팀 남았어요. 서둘러주세요!', time: '3시간 전', read: true },
  { id: 'n5', type: 'comment', title: '새 댓글', body: '재현·서연 가정님이 "오 이거 진짜 좋은 방법이다!"라고 댓글을 달았어요.', time: '5시간 전', read: true, avatar: 'https://i.pravatar.cc/60?img=13' },
  { id: 'n6', type: 'point', title: '포인트 적립', body: '행사 참여 신청 완료! +50P가 적립됐어요 🌿', time: '어제', read: true },
  { id: 'n7', type: 'gathering', title: '모임 초대', body: '민준·수진 가정님이 "주말 가족 산책 모임"에 초대했어요.', time: '어제', read: true, avatar: 'https://i.pravatar.cc/60?img=5' },
  { id: 'n8', type: 'system', title: '공지사항', body: '6월 정기 점검 안내: 6월 20일 새벽 2시~4시 서비스 점검이 예정되어 있습니다.', time: '2일 전', read: true },
  { id: 'n9', type: 'like', title: '좋아요', body: '성호·유라 가정님 외 11명이 회원님의 댓글을 좋아해요.', time: '3일 전', read: true, avatar: 'https://i.pravatar.cc/60?img=20' },
  { id: 'n10', type: 'point', title: '주간 미션 완료', body: '이번 주 미션 3/3 완료! 보너스 +100P가 적립됐어요 🎉', time: '5일 전', read: true },
]

export interface ChatRoom {
  id: string
  name: string
  avatar: string
  lastMessage: string
  time: string
  unread: number
  messages: ChatMessage[]
}

export interface ChatMessage {
  id: string
  isMine: boolean
  content: string
  time: string
}

export const chatRooms: ChatRoom[] = [
  {
    id: 'ch1',
    name: '민준·수진 가정',
    avatar: 'https://i.pravatar.cc/100?img=5',
    lastMessage: '다음 캠프 같이 신청하셨나요? 😊',
    time: '방금',
    unread: 2,
    messages: [
      { id: 'm1', isMine: false, content: '안녕하세요! 지난번 모임에서 반가웠어요 😊', time: '어제 오후 3:12' },
      { id: 'm2', isMine: true, content: '저도요! 아이들이 잘 어울리던데요.', time: '어제 오후 3:15' },
      { id: 'm3', isMine: false, content: '그러게요 ㅎㅎ 자주 만나면 좋겠어요.', time: '어제 오후 3:18' },
      { id: 'm4', isMine: true, content: '맞아요. 다음 달 캠프 신청하셨어요?', time: '어제 오후 3:20' },
      { id: 'm5', isMine: false, content: '네! 신청했어요 🏕️ 같이 가면 좋겠어요!', time: '어제 오후 3:22' },
      { id: 'm6', isMine: true, content: '저희도 신청해야 할 것 같아요. 마감 임박이라던데', time: '오늘 오전 9:10' },
      { id: 'm7', isMine: false, content: '맞아요! 빨리 신청하세요 ㅋㅋ', time: '오늘 오전 9:12' },
      { id: 'm8', isMine: false, content: '다음 캠프 같이 신청하셨나요? 😊', time: '방금' },
    ],
  },
  {
    id: 'ch2',
    name: '우석·지은 가정',
    avatar: 'https://i.pravatar.cc/100?img=9',
    lastMessage: '형제 싸움 중재 방법 공유 감사해요!',
    time: '1시간 전',
    unread: 0,
    messages: [
      { id: 'm1', isMine: false, content: '안녕하세요~ 커뮤니티에서 글 잘 봤어요.', time: '오전 10:00' },
      { id: 'm2', isMine: true, content: '감사해요! 도움이 됐으면 좋겠어요.', time: '오전 10:05' },
      { id: 'm3', isMine: false, content: '형제 싸움 중재 방법 공유 감사해요!', time: '1시간 전' },
    ],
  },
  {
    id: 'ch3',
    name: '패밀로그 운영팀',
    avatar: 'https://i.pravatar.cc/100?img=1',
    lastMessage: '피드 첫 등록을 환영해요! 🌱',
    time: '2일 전',
    unread: 0,
    messages: [
      { id: 'm1', isMine: false, content: '패밀로그에 오신 것을 환영해요! 궁금한 점이 있으면 언제든지 문의해주세요 😊', time: '3일 전' },
      { id: 'm2', isMine: false, content: '피드 첫 등록을 환영해요! 🌱', time: '2일 전' },
    ],
  },
  {
    id: 'ch4',
    name: '재현·서연 가정',
    avatar: 'https://i.pravatar.cc/100?img=13',
    lastMessage: '댓글 감사해요 ☺️',
    time: '3일 전',
    unread: 0,
    messages: [
      { id: 'm1', isMine: true, content: '안녕하세요~ 글 잘 읽었어요!', time: '3일 전 오후 2:00' },
      { id: 'm2', isMine: false, content: '댓글 감사해요 ☺️', time: '3일 전 오후 2:30' },
    ],
  },
  {
    id: 'ch5',
    name: '지민님',
    avatar: 'https://i.pravatar.cc/100?img=25',
    lastMessage: '다음에 같이 봉사 가요!',
    time: '일주일 전',
    unread: 0,
    messages: [
      { id: 'm1', isMine: false, content: '안녕하세요! 봉사 모임에서 봤는데 반가웠어요.', time: '일주일 전' },
      { id: 'm2', isMine: true, content: '저도요! 좋은 활동이었어요.', time: '일주일 전' },
      { id: 'm3', isMine: false, content: '다음에 같이 봉사 가요!', time: '일주일 전' },
    ],
  },
]
