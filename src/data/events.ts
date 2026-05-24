export interface Event {
  id: string
  type: 'large' | 'lecture' | 'camp' | 'volunteer' | 'gathering'
  title: string
  date: string
  time?: string
  location: string
  participants: number
  maxParticipants?: number
  description: string
  image: string
  isFeatured?: boolean
  isDeadlineSoon?: boolean
  volunteerHours?: number
  donationOptions?: number[]
  category: string
  comments: Array<{ id: string; author: string; avatar: string; content: string; time: string }>
}

const P = (id: number) => `https://picsum.photos/id/${id}/800/400`
const AV = (n: number) => `https://i.pravatar.cc/60?img=${n}`

export const events: Event[] = [
  { id: 'e1', type: 'large', title: 'K-가족축제 2025', date: '9월 20일 (토)', time: '오전 10시 ~ 오후 6시', location: '올림픽공원 평화의 광장', participants: 248, description: '가족과 함께하는 하루를 만들어요. 공연, 체험 부스, 가족 사진관, 먹거리 마당이 준비되어 있어요.', image: P(325), category: '대형 행사', donationOptions: [10000, 30000, 50000], comments: [
    { id: 'ec1', author: '민준·수진 가정', avatar: AV(5), content: '작년에 갔다가 진짜 좋았어요! 올해도 기대돼요 😊', time: '3일 전' },
    { id: 'ec2', author: '우석·지은 가정', avatar: AV(9), content: '아이들이 너무 좋아해서 올해도 가족 모두 신청했어요.', time: '2일 전' },
  ]},
  { id: 'e2', type: 'large', title: '가정평화포럼 2025', date: '10월 11일 (토)', time: '오전 9시 ~ 오후 5시', location: '코엑스 컨벤션홀', participants: 92, description: '건강한 가정이 사회의 기초입니다. 전문가 강연과 패널토론, 모델 가정 간증으로 구성된 반나절 포럼입니다. 부부 함께 오시기를 권장합니다.', image: P(338), category: '대형 행사', donationOptions: [10000, 30000, 50000], comments: [
    { id: 'ec3', author: '재현·서연 가정', avatar: AV(13), content: '강연 라인업이 정말 기대돼요. 부부 둘이 신청했습니다!', time: '5일 전' },
  ]},
  { id: 'e3', type: 'lecture', title: '행복한 부부 관계 특강', date: '6월 28일 (토)', time: '오후 2시 ~ 오후 5시', location: '피스센터 2층 세미나실', participants: 34, maxParticipants: 50, description: '실제 부부 사례를 중심으로 한 소통 전략 강의입니다. 부부 함께 오시면 현장 실습도 진행합니다.', image: P(352), category: '강연', donationOptions: [10000, 30000], comments: [] },
  { id: 'e4', type: 'lecture', title: '자녀 교육 전문가 초청 강연', date: '7월 12일 (토)', time: '오후 2시 ~ 오후 4시', location: '피스센터 대강당', participants: 21, maxParticipants: 80, description: '미디어 과다사용 시대, 아이들의 집중력과 정서 발달을 위한 실질적 가이드를 전합니다.', image: P(367), category: '강연', comments: [] },
  { id: 'e5', type: 'camp', title: '패밀리 자연 캠프', date: '8월 1일 (금) ~ 3일 (일)', time: '1박 2일 / 2박 3일 선택', location: '가평 자연 캠프장', participants: 45, maxParticipants: 50, description: '자연 속에서 가족과 함께하는 2박 3일. 자연 탐험, 가족 워크숍, 캠프파이어가 준비되어 있습니다. 마감이 얼마 남지 않았어요!', image: P(381), isFeatured: true, isDeadlineSoon: true, category: '캠프', donationOptions: [30000, 50000], comments: [
    { id: 'ec4', author: '민준·수진 가정', avatar: AV(5), content: '작년에 이 캠프 진짜 최고였어요. 아이들이 아직도 얘기해요.', time: '일주일 전' },
    { id: 'ec5', author: '성호·유라 가정', avatar: AV(20), content: '저희 가족 신청했어요! 기대됩니다 🌿', time: '5일 전' },
  ]},
  { id: 'e6', type: 'camp', title: '부부 주말 워크숍', date: '7월 19일 (토) ~ 20일 (일)', time: '토 오전 10시 시작', location: '피스센터 교육관', participants: 18, maxParticipants: 30, description: '1박 2일 부부만을 위한 시간. 서로를 다시 발견하는 부부 관계 집중 워크숍입니다.', image: P(396), category: '캠프', comments: [] },
  { id: 'e7', type: 'volunteer', title: '한강 환경 정화 봉사', date: '6월 21일 (토)', time: '오전 9시 ~ 오후 12시', location: '여의도 한강공원', participants: 28, description: '가족 모두가 함께하는 환경 봉사 활동입니다.', image: P(411), volunteerHours: 3, category: '봉사', comments: [
    { id: 'ec6', author: '우석·지은 가정', avatar: AV(9), content: '아이들이랑 함께 봉사하면 정말 뿌듯해요. 신청합니다!', time: '2일 전' },
  ]},
  { id: 'e8', type: 'volunteer', title: '소외계층 지원 바자회', date: '7월 5일 (토)', time: '오전 10시 ~ 오후 4시', location: '피스센터 1층 로비', participants: 15, description: '지역 소외계층을 위한 물품 기증 및 판매 바자회입니다.', image: P(425), volunteerHours: 4, category: '봉사', comments: [] },
]

export interface Gathering {
  id: string; title: string; host: string; hostAvatar: string
  date: string; time: string; location: string
  maxPeople: number; currentPeople: number; description: string; tags: string[]; image: string
}

export const gatherings: Gathering[] = [
  { id: 'g1', title: '신혼부부 소모임 — 6월 정기모임', host: '성호·유라 가정', hostAvatar: AV(20), date: '6월 22일 (일)', time: '오후 3시', location: '마포구 카페 (신청 후 안내)', maxPeople: 8, currentPeople: 5, description: '결혼 1~3년차 부부 소모임이에요. 편하게 수다 떠는 자리예요 ☕', tags: ['신혼', '부부', '소모임'], image: 'https://picsum.photos/id/441/600/400' },
  { id: 'g2', title: '자녀 교육 스터디 — 7월 모임', host: '우석·지은 가정', hostAvatar: AV(9), date: '7월 6일 (일)', time: '오전 10시', location: '피스센터 소회의실', maxPeople: 6, currentPeople: 3, description: '자녀 교육 관련 책 함께 읽고 나눠요. 이번 달은 "아이의 마음을 읽는 법"입니다.', tags: ['자녀교육', '독서', '스터디'], image: 'https://picsum.photos/id/456/600/400' },
  { id: 'g3', title: '주말 가족 산책 모임', host: '민준·수진 가정', hostAvatar: AV(5), date: '매주 토요일', time: '오전 8시', location: '북한산 입구 (돌레길)', maxPeople: 10, currentPeople: 7, description: '아이들과 함께하는 주말 아침 산책 정기 모임이에요. 30분~1시간 코스.', tags: ['산책', '자연', '아이'], image: 'https://picsum.photos/id/471/600/400' },
]
