import type { FeedPost } from '@/types/post'
export type { FeedPost }

const P = (id: number, w: number, h: number) => `https://picsum.photos/id/${id}/${w}/${h}`
const AV = (n: number) => `https://i.pravatar.cc/100?img=${n}`

export const feedPosts: FeedPost[] = [
  {
    id: 'c3', type: 'image', isOfficial: true,
    author: { nickname: '패밀로그', avatar: AV(1), status: '공식 계정' },
    title: '부부 관계에서 가장 중요한 한 가지',
    description: '오랜 시간 수백 쌍의 부부를 만나며 발견한 공통점이 있어요. 행복한 부부는 모두 "먼저 주는 사람"이 있었어요. 작은 것부터 시작해보세요.',
    images: [P(26, 600, 900), P(28, 600, 900)],
    likes: 284, comments: 47, category: '부부 관계',
  },
  {
    id: 'c7', type: 'video',
    author: { nickname: '민준·수진 가정', avatar: AV(5), status: '신혼 7년차' },
    title: '우리 가족의 주말 아침 루틴',
    description: '매주 토요일 아침 7시, 이 루틴이 우리 가족을 바꿨어요. 처음엔 힘들었는데 이제는 이게 없으면 허전해요 🌅',
    images: [], videoThumb: P(39, 600, 900),
    likes: 512, comments: 83, category: '일상',
  },
  {
    id: 'c6', type: 'image',
    author: { nickname: '우석·지은 가정', avatar: AV(9), status: '결혼 12년차' },
    title: '오늘 아침 아이가 혼자 밥을 차려줬어요 😊',
    description: '8살짜리가 혼자서 토스트를 만들어 왔어요. 서툴지만 이게 진짜 교육이구나 싶었어요. 가르치는 것보다 함께하는 것이 먼저더라고요.',
    images: [P(48, 600, 900)],
    likes: 341, comments: 62, category: '자녀 양육',
  },
  {
    id: 'c4', type: 'image', isMemberOnly: true,
    author: { nickname: '재현·서연 가정', avatar: AV(13), status: '결혼 5년차' },
    title: '부부 갈등, 솔직하게 털어놓기',
    description: '결혼 5년차에 겪은 가장 큰 갈등과 어떻게 극복했는지 솔직하게 나눠요.',
    images: [P(75, 600, 900)],
    likes: 198, comments: 91, category: '고민',
  },
  {
    id: 'c10', type: 'image',
    author: { nickname: '성호·유라 가정', avatar: AV(20), status: '신혼 3년차' },
    title: '3개월째 지키고 있는 주말 루틴',
    description: '가족 소풍 루틴을 시작한 지 3개월이 지났어요. 처음엔 부담스러웠는데 지금은 아이들이 먼저 챙겨요.',
    images: [P(110, 600, 900), P(135, 600, 900), P(167, 600, 900)],
    likes: 427, comments: 55, category: '일상',
  },
  {
    id: 'c1', type: 'image', isOfficial: true,
    author: { nickname: '패밀로그', avatar: AV(1), status: '공식 계정' },
    title: '"위하는 삶"이란 무엇인가',
    description: '나를 먼저 챙기는 삶 vs. 상대를 먼저 생각하는 삶. 어느 쪽이 더 행복할까요? 심리학 연구 결과가 놀랍습니다.',
    images: [P(192, 600, 900)],
    likes: 619, comments: 104, category: '인사이트',
  },
  {
    id: 'c9', type: 'image',
    author: { nickname: '민준·수진 가정', avatar: AV(5), status: '신혼 7년차' },
    title: '퇴근 후 핸드폰 내려놓기 한 달째',
    description: '저녁 6시 이후 핸드폰 안 보기 챌린지 한 달 결과를 공유해요. 가족 대화가 두 배 이상 늘었어요.',
    images: [P(218, 600, 900)],
    likes: 289, comments: 38, category: '일상',
  },
  {
    id: 'c8', type: 'image', isMemberOnly: true,
    author: { nickname: '지민님', avatar: AV(25), status: '미혼' },
    title: '시댁 관계 고민 나눔',
    description: '멤버 전용 콘텐츠입니다.',
    images: [P(240, 600, 900)],
    likes: 156, comments: 73, category: '고민',
  },
  {
    id: 'c2', type: 'image',
    author: { nickname: '우석·지은 가정', avatar: AV(9), status: '결혼 12년차' },
    title: '아이가 "우리 가족이 최고야"라고 했어요',
    description: '아무것도 아닌 순간인데 눈물이 났어요. 아이는 다 알고 있더라고요. 오늘 하루도 수고했어요.',
    images: [P(260, 600, 900)],
    likes: 783, comments: 127, category: '자녀 양육',
  },
  {
    id: 'c5', type: 'video',
    author: { nickname: '재현·서연 가정', avatar: AV(13), status: '결혼 5년차' },
    title: '가족 캠프 브이로그',
    description: '가평에서 보낸 3일. 자연이 최고의 교실이었어요. 아이들이 모닥불 피우는 것만 세 번 연습했어요 🌿',
    images: [], videoThumb: P(280, 600, 900),
    likes: 445, comments: 68, category: '일상',
  },
]