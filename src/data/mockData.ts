// ─── Types ───────────────────────────────────────────────
export interface User {
  id: number
  nickname: string
  status: string
  avatar: string
  isVerified?: boolean
  points: number
}

export interface FeedItem {
  id: number
  type: 'regular' | 'official' | 'video' | 'member-only'
  author: {
    nickname: string
    avatar: string
    isVerified?: boolean
  }
  title: string
  description: string
  images: string[]
  tags: string[]
  likes: number
  comments: number
  isLiked?: boolean
}

export interface Comment {
  id: number
  author: string
  avatar: string
  content: string
  time: string
  replies?: Comment[]
}

export interface Post {
  id: number
  category: 'couple' | 'parenting' | 'daily' | 'question'
  author: string
  authorStatus: string
  authorAvatar: string
  title: string
  content: string
  image?: string
  likes: number
  comments: Comment[]
  createdAt: string
  isPopular?: boolean
}

export interface Event {
  id: number
  type: 'festival' | 'lecture' | 'camp' | 'volunteer' | 'meetup'
  title: string
  date: string
  time?: string
  location: string
  participants: number
  maxParticipants?: number
  image: string
  description: string
  isFeatured?: boolean
  isClosingSoon?: boolean
  volunteerHours?: number
  donationOptions?: number[]
}

export interface Product {
  id: number
  category: 'book' | 'program' | 'photo' | 'goods'
  title: string
  price: number
  image: string
  isAffiliate?: boolean
  description: string
}

// ─── Current User ──────────────────────────────────────────
export const currentUser: User = {
  id: 0,
  nickname: '성호·유라 가정',
  status: '신혼 3년차',
  avatar: 'https://i.pravatar.cc/80?img=12',
  isVerified: false,
  points: 350,
}

// ─── Feed Items ─────────────────────────────────────────────
export const feedItems: FeedItem[] = [
  {
    id: 1,
    type: 'official',
    author: {
      nickname: '패밀로그',
      avatar: 'https://i.pravatar.cc/80?img=68',
      isVerified: true,
    },
    title: '부부 관계에서 가장 중요한 한 가지',
    description: '10년을 함께 살아도 매일이 다를 수 있어요. 오늘 배우자에게 어떤 말을 건넸나요.',
    images: ['https://picsum.photos/seed/couple1/390/844'],
    tags: ['부부관계', '인사이트'],
    likes: 284,
    comments: 47,
    isLiked: false,
  },
  {
    id: 2,
    type: 'video',
    author: {
      nickname: '민준·수진 가정',
      avatar: 'https://i.pravatar.cc/80?img=32',
    },
    title: '우리 가족의 주말 아침 루틴',
    description: '6시 반에 일어나 함께 밥 먹고 산책하는 게 어느새 우리 가족의 문화가 됐어요 🌿',
    images: ['https://picsum.photos/seed/morning1/390/844'],
    tags: ['가족루틴', '주말'],
    likes: 512,
    comments: 89,
    isLiked: true,
  },
  {
    id: 3,
    type: 'regular',
    author: {
      nickname: '우석·지은 가정',
      avatar: 'https://i.pravatar.cc/80?img=45',
    },
    title: '오늘 아침 아이가 혼자 밥을 차려줬어요 😊',
    description: '여섯 살인데 계란후라이를 뒤집더라고요. 어디서 배웠는지... 이런 게 기록이 되어야 하는 순간이에요.',
    images: [
      'https://picsum.photos/seed/kitchen1/390/844',
      'https://picsum.photos/seed/kitchen2/390/844',
    ],
    tags: ['자녀양육', '일상'],
    likes: 198,
    comments: 34,
    isLiked: false,
  },
  {
    id: 4,
    type: 'member-only',
    author: {
      nickname: '재현·서연 가정',
      avatar: 'https://i.pravatar.cc/80?img=51',
    },
    title: '부부 갈등 솔직하게 털어놓기',
    description: '결혼 5년차인데 요즘 소통이 안 된다 느껴서요. 비슷한 경험 있으신 분 이야기 듣고 싶어요.',
    images: ['https://picsum.photos/seed/couple2/390/844'],
    tags: ['부부관계', '고민'],
    likes: 143,
    comments: 62,
    isLiked: false,
  },
  {
    id: 5,
    type: 'regular',
    author: {
      nickname: '민준·수진 가정',
      avatar: 'https://i.pravatar.cc/80?img=32',
    },
    title: '3개월째 지키고 있는 주말 루틴',
    description: '매주 토요일 아침, 아이들과 함께 한강 공원을 걷고 있어요. 단 한 번도 빠진 적 없어요.',
    images: [
      'https://picsum.photos/seed/park1/390/844',
      'https://picsum.photos/seed/park2/390/844',
      'https://picsum.photos/seed/park3/390/844',
    ],
    tags: ['가족루틴', '건강'],
    likes: 367,
    comments: 51,
    isLiked: false,
  },
  {
    id: 6,
    type: 'official',
    author: {
      nickname: '패밀로그',
      avatar: 'https://i.pravatar.cc/80?img=68',
      isVerified: true,
    },
    title: '위하는 삶이란 무엇인가',
    description: '"위한다"는 건 뭘 포기하는 게 아니에요. 내가 더 커지는 방법이에요. 오늘 한 번 생각해봐요.',
    images: ['https://picsum.photos/seed/insight1/390/844'],
    tags: ['인사이트', '가정문화'],
    likes: 421,
    comments: 73,
    isLiked: false,
  },
  {
    id: 7,
    type: 'regular',
    author: {
      nickname: '재현·서연 가정',
      avatar: 'https://i.pravatar.cc/80?img=51',
    },
    title: '퇴근 후 핸드폰 내려놓기 한 달째',
    description: '저녁 7시부터 9시까지는 가족 시간. 처음엔 손이 근질거렸는데 이제는 오히려 이 시간이 기다려져요.',
    images: ['https://picsum.photos/seed/dinner1/390/844'],
    tags: ['일상', '가족시간'],
    likes: 276,
    comments: 43,
    isLiked: false,
  },
  {
    id: 8,
    type: 'member-only',
    author: {
      nickname: '지민님',
      avatar: 'https://i.pravatar.cc/80?img=23',
    },
    title: '시댁 관계 고민 나눔',
    description: '명절이 다가오는데 항상 마음이 무거워요. 비슷한 분들과 솔직하게 이야기 나눠보고 싶어요.',
    images: ['https://picsum.photos/seed/home1/390/844'],
    tags: ['고민', '부부관계'],
    likes: 95,
    comments: 38,
    isLiked: false,
  },
  {
    id: 9,
    type: 'regular',
    author: {
      nickname: '우석·지은 가정',
      avatar: 'https://i.pravatar.cc/80?img=45',
    },
    title: '아이가 "우리 가족이 최고야" 라고 했어요',
    description: '아무것도 한 것 없는데 이 한 마디가 하루를 바꿔놨어요. 이런 순간들이 쌓여서 가정이 되는 것 같아요.',
    images: [
      'https://picsum.photos/seed/child1/390/844',
      'https://picsum.photos/seed/child2/390/844',
    ],
    tags: ['자녀양육', '일상'],
    likes: 589,
    comments: 104,
    isLiked: true,
  },
  {
    id: 10,
    type: 'video',
    author: {
      nickname: '민준·수진 가정',
      avatar: 'https://i.pravatar.cc/80?img=32',
    },
    title: '가족 캠프 브이로그',
    description: '가평에서 2박 3일. 핸드폰 없이 보낸 게 처음이었는데, 아이들이 너무 좋아했어요.',
    images: ['https://picsum.photos/seed/camp1/390/844'],
    tags: ['캠프', '가족여행'],
    likes: 743,
    comments: 128,
    isLiked: false,
  },
]

// ─── Community Posts ─────────────────────────────────────────
export const communityPosts: Post[] = [
  {
    id: 1,
    category: 'couple',
    author: '민준·수진 가정',
    authorStatus: '신혼 7년차',
    authorAvatar: 'https://i.pravatar.cc/80?img=32',
    title: '부부 싸움 후 화해하는 우리만의 방식',
    content: `결혼 7년 동안 정말 많이 싸웠어요. 초반엔 서로 이기려고만 했던 것 같아요. 지금 저희가 쓰는 방법은 이렇습니다.\n\n먼저 24시간 냉각기를 둬요. 감정이 뜨거울 때는 절대 대화를 이어가지 않아요. 그리고 다음날 아침, 어제 내가 잘못한 게 뭔지를 각자 종이에 써서 교환해요.\n\n처음엔 이게 무슨 소용인가 싶었는데, 상대가 뭘 힘들어했는지 글로 보니까 마음이 달라지더라고요. 이제 7년째 같은 방법을 쓰고 있어요.\n\n비슷한 방법 쓰시는 분 있으신가요? 다들 어떻게 하세요?`,
    image: 'https://picsum.photos/seed/couple3/400/300',
    likes: 156,
    comments: [
      { id: 1, author: '재현·서연 가정', avatar: 'https://i.pravatar.cc/80?img=51', content: '저도 비슷해요! 냉각기 진짜 중요하더라고요. 뜨거울 때 말하면 항상 후회해요.', time: '2시간 전',
        replies: [
          { id: 11, author: '민준·수진 가정', avatar: 'https://i.pravatar.cc/80?img=32', content: '맞아요 ㅎㅎ 초반엔 그걸 몰라서 얼마나 후회했는지..', time: '1시간 전' }
        ]
      },
      { id: 2, author: '우석·지은 가정', avatar: 'https://i.pravatar.cc/80?img=45', content: '글로 쓰는 방법 너무 좋아요. 말로 하면 감정이 섞이는데 글은 다르죠. 저희도 해봐야겠어요!', time: '1시간 전' },
      { id: 3, author: '지민님', avatar: 'https://i.pravatar.cc/80?img=23', content: '좋은 방법 공유해주셔서 감사해요 😊', time: '45분 전' },
    ],
    createdAt: '2025-05-15',
    isPopular: true,
  },
  {
    id: 2,
    category: 'parenting',
    author: '우석·지은 가정',
    authorStatus: '결혼 12년차',
    authorAvatar: 'https://i.pravatar.cc/80?img=45',
    title: '아이에게 스마트폰 줄 나이, 언제가 맞을까요?',
    content: `첫째가 곧 중학교에 들어가는데요. 친구들은 다들 핸드폰을 갖고 있다고 해서 고민이에요.\n\n저는 최대한 늦게 주고 싶은데, 아이는 친구들과 연락이 안 돼서 소외된다고 하고... 이게 쉽지 않더라고요.\n\n자녀분들 핸드폰 언제 주셨어요? 어떤 규칙을 정하셨는지도 궁금해요.`,
    likes: 89,
    comments: [
      { id: 4, author: '민준·수진 가정', avatar: 'https://i.pravatar.cc/80?img=32', content: '저희는 중1 때 드렸어요. 대신 저녁 9시 이후엔 현관에 두는 규칙을 만들었는데 잘 지켜줘서 다행이에요.', time: '3시간 전' },
      { id: 5, author: '재현·서연 가정', avatar: 'https://i.pravatar.cc/80?img=51', content: '요즘 애들이 카카오톡으로 숙제 공유하는 게 많아서... 아예 못 갖게 하기가 참 어렵더라고요.', time: '2시간 전' },
    ],
    createdAt: '2025-05-14',
    isPopular: true,
  },
  {
    id: 3,
    category: 'daily',
    author: '재현·서연 가정',
    authorStatus: '결혼 5년차',
    authorAvatar: 'https://i.pravatar.cc/80?img=51',
    title: '퇴근 후 핸드폰 내려놓기 챌린지 한 달 후기',
    content: `한 달 전에 이 챌린지 시작한다고 썼는데요, 오늘 후기 남기러 왔어요.\n\n결론: 진짜 삶이 달라졌어요.\n\n처음 일주일은 손이 계속 핸드폰을 찾더라고요. 그냥 습관이에요. 그런데 3주차쯤부터 저녁 시간이 길어진 것 같은 느낌이 들었어요. 아이와 레고를 30분이나 했는데 금방 끝난 것 같지 않았고, 아내와 대화가 늘었어요.\n\n한 달 해본 소감: 핸드폰이 없어도 시간은 충분히 있었어요. 그걸 몰랐던 게 신기해요.`,
    image: 'https://picsum.photos/seed/evening1/400/300',
    likes: 203,
    comments: [
      { id: 6, author: '우석·지은 가정', avatar: 'https://i.pravatar.cc/80?img=45', content: '공감 100%예요. 핸드폰 내려놓으면 시간이 늘어나는 마법 ㅎㅎ', time: '1시간 전' },
      { id: 7, author: '지민님', avatar: 'https://i.pravatar.cc/80?img=23', content: '저도 해보고 싶어요. 혼자는 외로울 것 같아서 같이 할 분 찾고 있어요 😅', time: '30분 전' },
    ],
    createdAt: '2025-05-13',
    isPopular: false,
  },
  {
    id: 4,
    category: 'question',
    author: '지민님',
    authorStatus: '미혼 싱글',
    authorAvatar: 'https://i.pravatar.cc/80?img=23',
    title: '결혼 전에 꼭 확인해야 하는 것들이 있을까요?',
    content: `내년에 결혼을 앞두고 있어요. 요즘 걱정이 많아서요.\n\n가정을 꾸리면서 어떤 가치관을 맞춰봐야 하는지, 어떤 대화를 미리 해봐야 하는지 선배 가정분들의 이야기가 듣고 싶어요.\n\n"이건 꼭 얘기해봐야 해!" 하는 게 있으시면 알려주세요 🙏`,
    likes: 67,
    comments: [
      { id: 8, author: '민준·수진 가정', avatar: 'https://i.pravatar.cc/80?img=32', content: '경제관념이요! 돈 쓰는 방식이 다르면 진짜 힘들어요. 저희 초반에 이게 제일 컸어요.', time: '4시간 전' },
      { id: 9, author: '우석·지은 가정', avatar: 'https://i.pravatar.cc/80?img=45', content: '명절 어디서 어떻게 보낼지 미리 합의해두는 거 추천해요. 실제로 맞닥뜨리면 감정이 상하기 쉽거든요.', time: '3시간 전',
        replies: [
          { id: 12, author: '지민님', avatar: 'https://i.pravatar.cc/80?img=23', content: '아 맞아요, 그건 생각도 못 했는데. 감사해요!', time: '2시간 전' }
        ]
      },
      { id: 10, author: '재현·서연 가정', avatar: 'https://i.pravatar.cc/80?img=51', content: '자녀 계획, 육아 방식, 양가 부모님과의 관계... 다 중요해요. 근데 제일 중요한 건 이 사람과 대화가 잘 되는가 아닐까요.', time: '2시간 전' },
    ],
    createdAt: '2025-05-12',
    isPopular: false,
  },
  {
    id: 5,
    category: 'parenting',
    author: '민준·수진 가정',
    authorStatus: '신혼 7년차',
    authorAvatar: 'https://i.pravatar.cc/80?img=32',
    title: '아이와 함께하는 저녁 대화 루틴 공유해요',
    content: `저희 집은 저녁 식사 때 "오늘의 좋은 일 하나"를 돌아가면서 얘기해요.\n\n처음엔 아이가 귀찮아했는데, 이제는 본인이 먼저 시작해요. 가끔 너무 사소한 것들을 말해서 웃음이 터지기도 하고요.\n\n"오늘 학교 복도에서 새 연필 발견했어요" 이런 것도 아이한테는 소중한 거잖아요. 이 시간이 너무 좋아서 공유합니다.`,
    likes: 144,
    comments: [
      { id: 13, author: '우석·지은 가정', avatar: 'https://i.pravatar.cc/80?img=45', content: '이 루틴 너무 좋아요! 저희도 내일부터 해볼게요 🌱', time: '5시간 전' },
    ],
    createdAt: '2025-05-11',
    isPopular: true,
  },
  {
    id: 6,
    category: 'couple',
    author: '우석·지은 가정',
    authorStatus: '결혼 12년차',
    authorAvatar: 'https://i.pravatar.cc/80?img=45',
    title: '결혼 12년, 아직도 설레는 게 있어요',
    content: `뻔한 얘기처럼 들릴 수 있는데요.\n\n저는 아내가 자기 일에 몰입해있을 때가 제일 예뻐요. 12년 봐왔는데도 그래요. 어제도 책 읽다가 킥킥거리는 거 보고 같은 느낌이 들었어요.\n\n익숙해진다는 게 무뎌진다는 게 아닌 것 같아요. 보는 눈이 더 정확해지는 거 아닐까요.`,
    likes: 312,
    comments: [
      { id: 14, author: '민준·수진 가정', avatar: 'https://i.pravatar.cc/80?img=32', content: '읽다가 뭉클해졌어요. 저도 그런 순간이 오기를 바라면서...', time: '6시간 전' },
      { id: 15, author: '재현·서연 가정', avatar: 'https://i.pravatar.cc/80?img=51', content: '이런 글이 패밀로그에 있어야 하는 이유 같아요 💚', time: '4시간 전' },
    ],
    createdAt: '2025-05-10',
    isPopular: true,
  },
  {
    id: 7,
    category: 'daily',
    author: '재현·서연 가정',
    authorStatus: '결혼 5년차',
    authorAvatar: 'https://i.pravatar.cc/80?img=51',
    title: '처음으로 아이 없이 부부 여행 다녀왔어요',
    content: `결혼하고 5년 만에 처음이에요. 아이를 할머니한테 맡기고 1박 2일.\n\n솔직히 처음 2시간은 아이 걱정에 폰만 봤어요. 그런데 저녁 먹으면서 남편이 이런 말을 했어요.\n\n"우리 언제부터 이렇게 됐지? 둘이 얘기하는 게 이렇게 어색해졌어?"\n\n그 한 마디가 저는 좀 슬펐어요. 그리고 동시에 이 여행이 필요했다는 걸 알았어요. 더 자주 해야겠다 싶었어요.`,
    likes: 178,
    comments: [
      { id: 16, author: '지민님', avatar: 'https://i.pravatar.cc/80?img=23', content: '읽으면서 나중에 꼭 이런 시간 만들어야겠다 싶었어요. 좋은 이야기 감사해요.', time: '7시간 전' },
    ],
    createdAt: '2025-05-09',
    isPopular: false,
  },
  {
    id: 8,
    category: 'question',
    author: '지민님',
    authorStatus: '미혼 싱글',
    authorAvatar: 'https://i.pravatar.cc/80?img=23',
    title: '싱글인데 패밀로그에서 얻어갈 게 있을까요?',
    content: `아직 결혼도 안 했고 연애 중도 아닌데, 친구 소개로 여기 들어왔어요.\n\n처음엔 이 공간이 나랑 관련 없는 곳이라고 생각했는데, 글을 읽다 보니까 나도 언젠가 만들고 싶은 가정의 모습이 여기에 있더라고요.\n\n가정이 없어도 여기 있어도 될까요? 여러분은 어떻게 생각하세요?`,
    likes: 94,
    comments: [
      { id: 17, author: '민준·수진 가정', avatar: 'https://i.pravatar.cc/80?img=32', content: '당연하죠! 오히려 결혼 전에 이런 이야기들 많이 들어두면 좋아요. 저희는 결혼 전에 이런 걸 몰랐거든요 😅', time: '8시간 전' },
      { id: 18, author: '패밀로그', avatar: 'https://i.pravatar.cc/80?img=68', content: '패밀로그는 가정이 있어야만 들어올 수 있는 곳이 아니에요. 지금 어디에 있든 여기서 얻어가는 것들이 분명히 있을 거예요 🌱', time: '6시간 전' },
    ],
    createdAt: '2025-05-08',
    isPopular: false,
  },
  {
    id: 9,
    category: 'parenting',
    author: '우석·지은 가정',
    authorStatus: '결혼 12년차',
    authorAvatar: 'https://i.pravatar.cc/80?img=45',
    title: '세 아이를 키우면서 배운 것들',
    content: `열두 살, 여덟 살, 다섯 살. 셋을 키우면서 매일이 전쟁이에요.\n\n그런데 신기한 건, 아이가 하나일 때보다 셋일 때 부모가 오히려 더 단단해지는 것 같아요. 한 아이에게 몰빵할 에너지가 없으니까요.\n\n모든 아이에게 공평하게 신경 쓰다 보면, 자연스럽게 각각의 아이가 보이기 시작해요. 첫째는 첫째고, 막내는 막내이고.`,
    likes: 256,
    comments: [
      { id: 19, author: '재현·서연 가정', avatar: 'https://i.pravatar.cc/80?img=51', content: '셋을 키우시다니... 존경합니다 진심으로.', time: '10시간 전' },
    ],
    createdAt: '2025-05-07',
    isPopular: true,
  },
  {
    id: 10,
    category: 'couple',
    author: '민준·수진 가정',
    authorStatus: '신혼 7년차',
    authorAvatar: 'https://i.pravatar.cc/80?img=32',
    title: '서로 다른 MBTI가 결혼 생활에 미치는 영향',
    content: `저는 INFJ, 아내는 ESTP예요. 정반대.\n\n처음엔 정말 힘들었어요. 제가 혼자 있고 싶을 때 아내는 같이 나가고 싶어 하고, 제가 깊은 대화를 원할 때 아내는 그냥 밥 먹으러 가자고 하고.\n\n그런데 7년 지나고 보니까, 상대가 내가 못 하는 걸 하고 있다는 게 보여요. 아내 덕분에 제가 세상과 연결된 것 같고, 저 덕분에 아내가 조금 더 내면을 들여다보게 됐다고 해요.\n\n차이가 문제가 아니었어요. 차이를 어떻게 보느냐가 문제였어요.`,
    likes: 189,
    comments: [
      { id: 20, author: '우석·지은 가정', avatar: 'https://i.pravatar.cc/80?img=45', content: '마지막 문장이 너무 좋아요. 저장해뒀어요.', time: '12시간 전' },
    ],
    createdAt: '2025-05-06',
    isPopular: false,
  },
]

// ─── Events ──────────────────────────────────────────────────
export const events: Event[] = [
  {
    id: 1,
    type: 'festival',
    title: 'K-가족축제 2025',
    date: '2025년 9월 20일 (토)',
    time: '오전 10시 – 오후 6시',
    location: '올림픽공원 평화의 광장',
    participants: 248,
    image: 'https://picsum.photos/seed/festival1/400/250',
    description: '가정이 중심이 되는 대한민국 최대 가족 문화 축제. 공연, 전시, 체험 부스, 모델 가정 시상식이 함께합니다. 가족 모두 함께 오세요.',
    donationOptions: [10000, 30000, 50000],
  },
  {
    id: 2,
    type: 'festival',
    title: '가정평화포럼 2025',
    date: '2025년 10월 11일 (토)',
    time: '오전 9시 – 오후 5시',
    location: '코엑스 그랜드볼룸',
    participants: 92,
    image: 'https://picsum.photos/seed/forum1/400/250',
    description: '가정이 평화의 기초라는 주제로, 국내외 전문가와 모델 가정이 함께하는 토론과 강연의 장.',
    donationOptions: [10000, 30000, 50000],
  },
  {
    id: 3,
    type: 'lecture',
    title: '행복한 부부 관계 특강',
    date: '2025년 6월 28일 (토)',
    time: '오후 2시 – 5시',
    location: '피스센터 대강당',
    participants: 34,
    image: 'https://picsum.photos/seed/lecture1/400/250',
    description: '부부 관계 전문 상담사를 초청하여 소통의 기술, 갈등 해결 방법을 실습 중심으로 배웁니다. 부부가 함께 참여 권장.',
    donationOptions: [10000, 30000],
  },
  {
    id: 4,
    type: 'lecture',
    title: '자녀 교육 전문가 초청 강연',
    date: '2025년 7월 12일 (토)',
    time: '오후 2시 – 4시',
    location: '피스센터 교육관',
    participants: 21,
    image: 'https://picsum.photos/seed/lecture2/400/250',
    description: '디지털 시대 자녀 교육의 원칙, 미디어 리터러시, 자존감 형성에 대한 전문가 강연.',
    donationOptions: [10000, 30000],
  },
  {
    id: 5,
    type: 'camp',
    title: '패밀리 자연 캠프',
    date: '2025년 8월 1일 – 3일',
    time: '1박 2일',
    location: '가평 ○○ 수련원',
    participants: 45,
    maxParticipants: 50,
    image: 'https://picsum.photos/seed/camp2/400/250',
    description: '디지털 기기 없이 자연 속에서 가족이 함께하는 2박 3일. 프로그램: 새벽 산책, 가족 요리, 이야기 나눔 모닥불.',
    isFeatured: true,
    isClosingSoon: true,
    donationOptions: [30000, 50000, 100000],
  },
  {
    id: 6,
    type: 'camp',
    title: '부부 주말 워크숍',
    date: '2025년 7월 19일 – 20일',
    time: '1박 2일',
    location: '피스센터',
    participants: 18,
    image: 'https://picsum.photos/seed/workshop1/400/250',
    description: '부부 둘이서만 참여하는 집중 워크숍. 커뮤니케이션 훈련, 감사 표현, 갈등 패턴 분석.',
    donationOptions: [30000, 50000],
  },
  {
    id: 7,
    type: 'volunteer',
    title: '한강 환경 정화 봉사',
    date: '2025년 6월 21일 (토)',
    time: '오전 9시 – 12시',
    location: '여의도 한강공원',
    participants: 28,
    image: 'https://picsum.photos/seed/volunteer1/400/250',
    description: '가족이 함께하는 한강 쓰레기 줍기 봉사. 아이들도 참여 가능. 참가 시 봉사 시간 3시간이 발자취에 기록됩니다.',
    volunteerHours: 3,
  },
  {
    id: 8,
    type: 'volunteer',
    title: '소외계층 지원 바자회',
    date: '2025년 7월 5일 (토)',
    time: '오전 10시 – 오후 4시',
    location: '피스센터 로비',
    participants: 15,
    image: 'https://picsum.photos/seed/volunteer2/400/250',
    description: '지역 소외계층을 위한 물품 기증 및 판매 바자회. 수익금 전액은 지역 복지관에 기부됩니다. 참가 시 봉사 시간 4시간.',
    volunteerHours: 4,
  },
  {
    id: 9,
    type: 'meetup',
    title: '신혼 가정 모임 초대',
    date: '2025년 6월 14일 (토)',
    time: '오후 3시',
    location: '피스센터 라운지',
    participants: 8,
    maxParticipants: 12,
    image: 'https://picsum.photos/seed/meetup1/400/250',
    description: '결혼 3년 이하 신혼 가정들이 편하게 이야기 나누는 소규모 모임. 주제: 부부 첫 집 꾸리기 경험담.',
    isClosingSoon: false,
  },
  {
    id: 10,
    type: 'meetup',
    title: '육아 나눔 모임',
    date: '2025년 6월 21일 (토)',
    time: '오후 2시',
    location: '피스센터 교육관',
    participants: 6,
    maxParticipants: 10,
    image: 'https://picsum.photos/seed/meetup2/400/250',
    description: '자녀 3~7세 자녀를 둔 가정들의 육아 고민 나눔 모임. 아이 동반 환영.',
  },
]

// ─── Store Products ───────────────────────────────────────────
export const products: Product[] = [
  { id: 1, category: 'book', title: '위하는 삶', price: 18000, image: 'https://picsum.photos/seed/book1/200/280', isAffiliate: false, description: '가정에서 시작하는 위하는 삶의 실천에 대한 이야기.' },
  { id: 2, category: 'book', title: '부부 대화법', price: 15000, image: 'https://picsum.photos/seed/book2/200/280', isAffiliate: false, description: '상처 없이 솔직하게 말하는 법을 배웁니다.' },
  { id: 3, category: 'book', title: '자녀와 함께하는 시간', price: 16000, image: 'https://picsum.photos/seed/book3/200/280', isAffiliate: false, description: '바쁜 부모를 위한 짧지만 깊은 가족 대화 가이드.' },
  { id: 4, category: 'book', title: '가정이 먼저다', price: 14000, image: 'https://picsum.photos/seed/book4/200/280', isAffiliate: false, description: '모든 성장의 출발점이 되는 가정 이야기.' },
  { id: 5, category: 'program', title: '부부 소통 온라인 클래스 4주', price: 89000, image: 'https://picsum.photos/seed/prog1/200/280', isAffiliate: false, description: '매주 2회, 총 8회 라이브 세션으로 진행되는 부부 소통 훈련.' },
  { id: 6, category: 'program', title: '자녀 교육 워크북 세트', price: 45000, image: 'https://picsum.photos/seed/prog2/200/280', isAffiliate: false, description: '연령별로 구성된 자녀 교육 워크북 3권 세트.' },
  { id: 7, category: 'program', title: '가정 비전 가이드 키트', price: 32000, image: 'https://picsum.photos/seed/prog3/200/280', isAffiliate: false, description: '가족이 함께 미래를 그려보는 대화형 키트.' },
  { id: 8, category: 'goods', title: '패밀로그 가정 달력 2026', price: 12000, image: 'https://picsum.photos/seed/goods1/200/280', isAffiliate: false, description: '가족 일정을 함께 기록하는 따뜻한 벽 달력.' },
  { id: 9, category: 'goods', title: '가족 식탁 대화 카드 52장', price: 18000, image: 'https://picsum.photos/seed/goods2/200/280', isAffiliate: true, description: '매주 한 장씩, 1년간 가족 대화를 이끌어주는 카드 세트.' },
  { id: 10, category: 'goods', title: '부부 다이어리 세트', price: 24000, image: 'https://picsum.photos/seed/goods3/200/280', isAffiliate: true, description: '각자의 하루를 기록하고 공유하는 커플 다이어리.' },
  { id: 11, category: 'goods', title: '가족 루틴 보드', price: 35000, image: 'https://picsum.photos/seed/goods4/200/280', isAffiliate: false, description: '냉장고에 붙이는 가족 루틴 화이트보드.' },
]

// ─── Notifications ────────────────────────────────────────────
export const notifications = [
  { id: 1, type: 'like', content: '민준·수진 가정이 회원님의 글을 좋아합니다.', time: '방금 전', isRead: false },
  { id: 2, type: 'comment', content: '우석·지은 가정이 댓글을 달았습니다: "공감 100%예요!"', time: '5분 전', isRead: false },
  { id: 3, type: 'point', content: '미션 완료! 첫 댓글 달기 +30P 적립됐어요.', time: '1시간 전', isRead: false },
  { id: 4, type: 'event', content: '패밀리 자연 캠프 마감 임박! 잔여 5팀.', time: '2시간 전', isRead: true },
  { id: 5, type: 'system', content: '환영해요! 패밀로그에서 첫 글을 써보세요. +100P', time: '어제', isRead: true },
  { id: 6, type: 'like', content: '재현·서연 가정이 회원님의 글을 좋아합니다.', time: '어제', isRead: true },
  { id: 7, type: 'comment', content: '지민님이 댓글을 달았습니다: "저도 해보고 싶어요!"', time: '2일 전', isRead: true },
  { id: 8, type: 'point', content: '행사 참여 완료! +50P 적립됐어요.', time: '2일 전', isRead: true },
]

// ─── Chat Data ────────────────────────────────────────────────
export const chatRooms = [
  {
    id: 1,
    name: '민준·수진 가정',
    avatar: 'https://i.pravatar.cc/80?img=32',
    lastMessage: '다음 주 모임에 참여하실 수 있나요?',
    time: '오전 11:23',
    unread: 2,
    messages: [
      { id: 1, from: 'them', content: '안녕하세요! 지난번 캠프 잘 보셨나요?', time: '오전 10:00' },
      { id: 2, from: 'me', content: '네 정말 좋았어요! 아이들도 너무 좋아했고요.', time: '오전 10:05' },
      { id: 3, from: 'them', content: '저희도요 ㅎㅎ 다음에 또 가고 싶더라고요.', time: '오전 10:07' },
      { id: 4, from: 'me', content: '그러게요. 그때 찍은 사진 혹시 공유해주실 수 있어요?', time: '오전 10:15' },
      { id: 5, from: 'them', content: '물론이죠! 잠깐만요 찾아볼게요.', time: '오전 10:16' },
      { id: 6, from: 'them', content: '다음 주 모임에 참여하실 수 있나요?', time: '오전 11:23' },
    ],
  },
  {
    id: 2,
    name: '우석·지은 가정',
    avatar: 'https://i.pravatar.cc/80?img=45',
    lastMessage: '글 잘 봤어요. 많이 공감됐어요 😊',
    time: '어제',
    unread: 0,
    messages: [
      { id: 1, from: 'them', content: '오늘 올리신 글 봤어요!', time: '어제 오후 3:00' },
      { id: 2, from: 'them', content: '글 잘 봤어요. 많이 공감됐어요 😊', time: '어제 오후 3:01' },
      { id: 3, from: 'me', content: '감사해요! 용기 내서 올렸는데 다행이에요.', time: '어제 오후 4:30' },
    ],
  },
  {
    id: 3,
    name: '패밀로그 공식',
    avatar: 'https://i.pravatar.cc/80?img=68',
    lastMessage: '패밀로그에 오신 걸 환영해요! 🌿',
    time: '5일 전',
    unread: 0,
    messages: [
      { id: 1, from: 'them', content: '패밀로그에 오신 걸 환영해요! 🌿', time: '5일 전' },
      { id: 2, from: 'them', content: '첫 온보딩 미션을 완료하면 특별 배지가 생겨요.', time: '5일 전' },
    ],
  },
]
