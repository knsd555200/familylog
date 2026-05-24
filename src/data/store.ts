export interface Product {
  id: string; category: 'book' | 'program' | 'photobook' | 'goods'
  name: string; price: number; description: string; image: string; detail: string; isCoupang?: boolean
}

const P = (id: number) => `https://picsum.photos/id/${id}/300/400`

export const products: Product[] = [
  { id: 'p1', category: 'book', name: '위하는 삶', price: 18000, description: '나보다 상대를 먼저 생각하는 삶의 방식.', detail: '수백 쌍의 행복한 부부들이 공통으로 갖고 있는 이 한 가지 태도를 담았습니다. 읽고 나면 오늘 저녁 배우자에게 먼저 다가가게 됩니다.', image: P(24) },
  { id: 'p2', category: 'book', name: '부부 대화법', price: 15000, description: '제대로 말하지 못해서 생기는 갈등을 해결하는 법.', detail: '말이 많아서가 아니라 제대로 말하지 못해서 생기는 부부 갈등. 언어를 다시 설계하는 12가지 방법을 담았습니다.', image: P(56) },
  { id: 'p3', category: 'book', name: '자녀와 함께하는 시간', price: 16000, description: '바쁜 부모를 위한 질 높은 시간 만들기.', detail: '아이와 함께 있는 시간이 아닌, 아이와 함께하는 시간을 만드는 법. 실천 사례 중심으로 구성했습니다.', image: P(91) },
  { id: 'p4', category: 'book', name: '가정이 먼저다', price: 14000, description: '커리어와 가정 사이에서 흔들리는 당신에게.', detail: '10년 후 어떤 선택이 더 의미 있을지를 묻습니다. 성공과 가정 모두를 원하는 현대인을 위한 이야기입니다.', image: P(123) },
  { id: 'p5', category: 'program', name: '부부 소통 온라인 클래스 4주', price: 89000, description: '매주 2회, 총 8강 온라인 클래스.', detail: '부부가 함께 수강하는 4주 과정. 매주 2회 라이브 강의 + 실습 워크시트 + 코칭 세션 포함. 수강 후 85%가 "대화가 늘었다"고 응답.', image: P(145) },
  { id: 'p6', category: 'program', name: '자녀 교육 워크북 세트', price: 45000, description: '연령별 맞춤 워크북 3권 세트.', detail: '5~7세 / 8~10세 / 11~13세 연령별 맞춤 워크북. 아이와 함께 채워가는 활동 중심 구성입니다.', image: P(178) },
  { id: 'p7', category: 'program', name: '가정 비전 가이드 키트', price: 32000, description: '우리 가족만의 가훈과 비전 세우기.', detail: '카드 30장 + 가이드북 + 액자 포함. 온 가족이 함께 앉아 우리만의 가훈을 만드는 특별한 저녁 시간을 선사합니다.', image: P(201) },
  { id: 'p8', category: 'goods', name: '패밀로그 가정 달력 2026', price: 12000, description: '가족 모두가 볼 수 있는 대형 벽걸이 달력.', detail: '주간 가족 회의 공간 포함. A2 사이즈 대형 달력으로 온 가족의 일정을 한눈에. 친환경 재생 용지 사용.', image: P(234) },
  { id: 'p9', category: 'goods', name: '가족 식탁 대화 카드 52장', price: 18000, description: '저녁 식탁에서 한 장씩 나누는 질문 카드.', detail: '1년 52주, 매주 하나씩. 아이부터 어른까지 자연스럽게 대화를 나누게 돕는 따뜻한 질문들로 구성되어 있습니다.', image: P(267), isCoupang: true },
  { id: 'p10', category: 'goods', name: '부부 다이어리 세트', price: 24000, description: '각자 + 함께 쓰는 커플 다이어리 세트.', detail: '각자의 다이어리 + 함께 쓰는 커플 다이어리 3권 세트. 매일 한 줄씩 서로에게 남기는 메시지가 1년 후 소중한 기록이 됩니다.', image: P(289), isCoupang: true },
  { id: 'p11', category: 'goods', name: '가족 루틴 보드', price: 35000, description: '냉장고에 붙이는 자석식 루틴 보드.', detail: '아이들 루틴 관리와 가족 일정 공유에 최적화. 자석으로 자유롭게 배치 가능. 주간 루틴 + 습관 트래커 + 메모 공간 포함.', image: P(312) },
]

export const photoProducts = [
  { id: 'ph1', name: '포토북', price: 29900, description: '20~60장, 양장본', image: 'https://picsum.photos/id/42/300/300' },
  { id: 'ph2', name: '캔버스', price: 39900, description: '30×40cm, 나무 액자', image: 'https://picsum.photos/id/63/300/300' },
  { id: 'ph3', name: '가족 달력', price: 19900, description: '12개월, A4 사이즈', image: 'https://picsum.photos/id/84/300/300' },
  { id: 'ph4', name: '머그컵', price: 14900, description: '350ml, 전자레인지 가능', image: 'https://picsum.photos/id/105/300/300' },
]

export const photoSamples = [
  'https://picsum.photos/id/400/200/200',
  'https://picsum.photos/id/412/200/200',
  'https://picsum.photos/id/424/200/200',
  'https://picsum.photos/id/436/200/200',
  'https://picsum.photos/id/448/200/200',
  'https://picsum.photos/id/460/200/200',
  'https://picsum.photos/id/472/200/200',
  'https://picsum.photos/id/484/200/200',
  'https://picsum.photos/id/496/200/200',
]
