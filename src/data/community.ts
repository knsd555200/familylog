import type { Comment, CommunityPost } from '@/types/post'
export type { Comment, CommunityPost }

export const communityPosts: CommunityPost[] = [
  {
    id: 'c1',
    category: '부부 관계',
    title: '배우자가 퇴근하고 지쳐서 오면 어떻게 하세요?',
    preview: '저는 항상 반갑게 맞이하려고 하는데 가끔 이게 역효과가 나더라고요. 오히려 혼자 있는 시간이 필요한 분도 있는 것 같고...',
    content: `저는 항상 반갑게 맞이하려고 하는데 가끔 이게 역효과가 나더라고요. 오히려 혼자 있는 시간이 필요한 분도 있는 것 같고, 그 균형을 어떻게 맞추세요?

남편이 퇴근하고 오면 저는 하루 동안 있었던 일 얘기하고 싶은데, 남편은 잠깐 디컴프레스(?) 하는 시간이 필요하더라고요. 처음엔 서운했는데 이게 남녀 차이인지, 개인 차이인지 궁금해요.

혹시 비슷한 경험 있으신 분들 어떻게 해결하셨나요?`,
    author: '성호·유라 가정',
    avatar: 'https://i.pravatar.cc/100?img=20',
    status: '신혼 3년차',
    time: '2시간 전',
    likes: 42,
    comments: 18,
    thumbnail: 'https://picsum.photos/id/500/200/200',
    visibility: 'member',
    commentList: [
      { id: 'cc1', author: '민준·수진 가정', avatar: 'https://i.pravatar.cc/60?img=5', status: '신혼 7년차', content: '저는 남편이 들어오면 15분은 그냥 두는 편이에요. 옷 갈아입고 잠깐 앉아있다 보면 먼저 말 걸어요 😊', time: '1시간 전',
        replies: [{ id: 'cc1r1', author: '성호·유라 가정', avatar: 'https://i.pravatar.cc/60?img=20', status: '신혼 3년차', content: '오 15분 규칙 좋은 것 같아요! 한번 해볼게요', time: '50분 전' }]
      },
      { id: 'cc2', author: '우석·지은 가정', avatar: 'https://i.pravatar.cc/60?img=9', status: '결혼 12년차', content: '12년 지나도 이게 쉽지 않아요 ㅋㅋ 우리도 아직 연습 중이에요. 중요한 건 서로 다르다는 걸 인정하는 것 같더라고요.', time: '45분 전' },
      { id: 'cc3', author: '지민님', avatar: 'https://i.pravatar.cc/60?img=25', status: '미혼', content: '저도 나중에 참고해야겠어요. 좋은 글 감사해요!', time: '30분 전' },
    ],
  },
  {
    id: 'c2',
    category: '자녀 양육',
    title: '7살 아이 유튜브 시간 제한, 어떻게 하세요?',
    preview: '하루 30분이라고 정해놨는데 매일 전쟁이에요. 타이머 울리면 울고불고... 좋은 방법 있으신 분 계세요?',
    content: `하루 30분이라고 정해놨는데 매일 전쟁이에요. 타이머 울리면 울고불고... 좋은 방법 있으신 분 계세요?

이미 스마트폰 없이는 못 사는 세대인데, 억지로 막는 게 맞는 건지도 모르겠고. 그렇다고 제한 없이 주기엔 너무 많이 보는 것 같고.

규칙을 정하고 잘 지키는 집 계시면 어떻게 하셨는지 너무 궁금해요.`,
    author: '재현·서연 가정',
    avatar: 'https://i.pravatar.cc/100?img=13',
    status: '결혼 5년차',
    time: '4시간 전',
    likes: 67,
    comments: 24,
    thumbnail: 'https://picsum.photos/id/514/200/200',
    visibility: 'member',
    commentList: [
      { id: 'cc4', author: '우석·지은 가정', avatar: 'https://i.pravatar.cc/60?img=9', status: '결혼 12년차', content: '저희는 "TV 시간표"를 아이랑 같이 만들었어요. 본인이 정한 규칙이라 조금 더 잘 지키더라고요. 완벽하진 않지만요 😅', time: '3시간 전' },
      { id: 'cc5', author: '민준·수진 가정', avatar: 'https://i.pravatar.cc/60?img=5', status: '신혼 7년차', content: '"다 보면 뭐 할 거야?"라고 미리 계획 세우게 했더니 스스로 끄더라고요. 대안 활동이 있어야 하는 것 같아요.', time: '2시간 전',
        replies: [{ id: 'cc5r1', author: '재현·서연 가정', avatar: 'https://i.pravatar.cc/60?img=13', status: '결혼 5년차', content: '오 이거 진짜 좋은 방법이다! 내일 해볼게요', time: '1시간 전' }]
      },
    ],
  },
  {
    id: 'c3',
    category: '일상',
    title: '가족 식사 시간, 얼마나 지키세요?',
    preview: '같이 먹는 게 중요하다는 건 아는데 현실적으로 쉽지 않더라고요. 어떻게들 하시는지 궁금해요.',
    content: `같이 먹는 게 중요하다는 건 아는데 현실적으로 쉽지 않더라고요. 남편 퇴근이 늦고, 아이 학원 스케줄 맞추다 보면...

그래도 저녁 식사만큼은 같이 하려고 노력하는데, 일주일에 3~4번 정도가 최선이더라고요.

다들 어떻게들 하세요?`,
    author: '민준·수진 가정',
    avatar: 'https://i.pravatar.cc/100?img=5',
    status: '신혼 7년차',
    time: '6시간 전',
    likes: 89,
    comments: 31,
    visibility: 'public',
    commentList: [
      { id: 'cc6', author: '우석·지은 가정', avatar: 'https://i.pravatar.cc/60?img=9', status: '결혼 12년차', content: '저희는 "최소 주 5회"를 목표로 하는데 달성률이 70% 정도예요. 100% 완벽함보다 꾸준히 노력하는 자체가 의미 있는 것 같더라고요.', time: '5시간 전' },
    ],
  },
  {
    id: 'c4',
    category: '고민',
    title: '시어머니와 대화법, 도움 요청해요',
    preview: '결혼 5년차인데 아직도 시어머니께 드리는 말 한마디 한마디가 조심스러워요. 잘 지내시는 분들 비결이 있으신가요?',
    content: `결혼 5년차인데 아직도 시어머니께 드리는 말 한마디 한마디가 조심스러워요.

뭔가 잘못 전달될까봐 항상 조심하다 보니 오히려 멀어지는 느낌도 들고. 자연스럽게 편하게 지내고 싶은데 그게 쉽지 않더라고요.

잘 지내시는 분들 비결이 있으신가요? 아니면 원래 다 이런 건가요 😅`,
    author: '재현·서연 가정',
    avatar: 'https://i.pravatar.cc/100?img=13',
    status: '결혼 5년차',
    time: '어제',
    likes: 124,
    comments: 45,
    visibility: 'member',
    commentList: [
      { id: 'cc7', author: '민준·수진 가정', avatar: 'https://i.pravatar.cc/60?img=5', status: '신혼 7년차', content: '저도 처음엔 그랬는데... 어머니가 좋아하시는 것 하나 알아두고 그거 자연스럽게 여쭤보는 게 도움됐어요.', time: '20시간 전' },
      { id: 'cc8', author: '우석·지은 가정', avatar: 'https://i.pravatar.cc/60?img=9', status: '결혼 12년차', content: '12년차 말씀드리면... 완전히 편해지는 날은 안 와요 ㅋㅋ 다만 불편함이 줄어들 뿐이에요. 시간이 약인 것도 있어요.', time: '18시간 전' },
    ],
  },
  {
    id: 'c5',
    category: '부부 관계',
    title: '남편한테 "사랑해" 먼저 말하기가 어색한 분 계세요?',
    preview: '결혼하고 나서 오히려 더 어색해진 것 같아요. 연애할 때는 자연스러웠는데...',
    content: `결혼하고 나서 오히려 더 어색해진 것 같아요. 연애할 때는 자연스러웠는데... 같이 살다 보니 파트너 같은 느낌이 강해지고 로맨틱한 표현이 어색해졌어요.

남편도 마찬가지인 것 같고. 둘 다 어색해하다가 안 하게 되는 패턴인 것 같아서 걱정돼요.

의도적으로 연습한다는 게 이상한 건지...`,
    author: '성호·유라 가정',
    avatar: 'https://i.pravatar.cc/100?img=20',
    status: '신혼 3년차',
    time: '이틀 전',
    likes: 203,
    comments: 67,
    visibility: 'member',
    commentList: [],
  },
  {
    id: 'c6',
    category: '자녀 양육',
    title: '독서 습관 어떻게 만들어주셨어요?',
    preview: '책 좋아하는 아이로 키우고 싶은데 막상 앉혀놓으면 5분도 안 되어 도망가요 😂',
    content: `책 좋아하는 아이로 키우고 싶은데 막상 앉혀놓으면 5분도 안 되어 도망가요 😂

책방도 가보고, 도서관도 가봤는데 흥미를 못 붙이더라고요. 부모가 책 읽는 모습 보여줘야 한다고 해서 열심히 읽고 있긴 한데... 효과가 있는 건지 모르겠어요.

책 좋아하는 아이로 키우신 분들 비결 좀 알려주세요!`,
    author: '우석·지은 가정',
    avatar: 'https://i.pravatar.cc/100?img=9',
    status: '결혼 12년차',
    time: '3일 전',
    likes: 156,
    comments: 52,
    thumbnail: 'https://picsum.photos/id/542/200/200',
    visibility: 'public',
    commentList: [],
  },
  {
    id: 'c7',
    category: '일상',
    title: '가족 여행 계획 세울 때 아이 의견 얼마나 반영하세요?',
    preview: '8살, 6살인데 갈 곳부터 먹을 것까지 다 의견이 달라서... 협상이 보통 일이 아니에요 😅',
    content: `8살, 6살인데 갈 곳부터 먹을 것까지 다 의견이 달라서... 협상이 보통 일이 아니에요 😅

그래도 아이들 의견 반영하는 게 맞는 것 같아서 억지로 끌고 가진 않는데, 정작 결정이 너무 안 나요.

어느 정도 선에서 어른이 결정해줘야 할까요?`,
    author: '재현·서연 가정',
    avatar: 'https://i.pravatar.cc/100?img=13',
    status: '결혼 5년차',
    time: '4일 전',
    likes: 98,
    comments: 34,
    visibility: 'public',
    commentList: [],
  },
  {
    id: 'c8',
    category: '고민',
    title: '맞벌이 집 집안일 분담, 현실적인 방법 있을까요?',
    preview: '둘 다 일하는데 집안일 분담이 쉽지 않아요. 공평하게 나누면 좋겠는데 실제로는 제가 더 많이 하는 것 같고...',
    content: `둘 다 일하는데 집안일 분담이 쉽지 않아요. 공평하게 나누면 좋겠는데 실제로는 제가 더 많이 하는 것 같고...

그렇다고 남편이 일부러 안 하는 건 아닌데, 자기가 해야 한다는 인식이 덜한 것 같아요. 

싸우지 않고 자연스럽게 분담되는 방법이 있을까요?`,
    author: '성호·유라 가정',
    avatar: 'https://i.pravatar.cc/100?img=20',
    status: '신혼 3년차',
    time: '5일 전',
    likes: 287,
    comments: 89,
    thumbnail: 'https://picsum.photos/id/528/200/200',
    visibility: 'member',
    commentList: [],
  },
  {
    id: 'c9',
    category: '부부 관계',
    title: '부부 데이트 얼마나 자주 하세요?',
    preview: '아이 생기고 나서 둘만의 시간이 너무 줄었어요. 일부러 만들어야 하는데 쉽지가 않더라고요.',
    content: `아이 생기고 나서 둘만의 시간이 너무 줄었어요. 일부러 만들어야 하는데 쉽지가 않더라고요.

아이 맡길 곳도 마땅치 않고, 맡기더라도 아이 걱정에 제대로 즐기지 못하는 것 같기도 하고.

둘만의 시간 어떻게 확보하세요?`,
    author: '민준·수진 가정',
    avatar: 'https://i.pravatar.cc/100?img=5',
    status: '신혼 7년차',
    time: '일주일 전',
    likes: 342,
    comments: 76,
    visibility: 'member',
    commentList: [],
  },
  {
    id: 'c10',
    category: '일상',
    title: '아침형 가족으로 바꾸신 분 계세요?',
    preview: '주말마다 늦잠 자는 게 습관이 됐는데, 아침 일찍 일어나 가족 활동 하는 게 부러워서요.',
    content: `주말마다 늦잠 자는 게 습관이 됐는데, 아침 일찍 일어나 가족 활동 하는 게 부러워서요.

아이들은 원래 일찍 일어나는데 어른들이 못 일어나는 게 문제예요. 주말 아침 루틴 만들고 싶은데, 어떻게 시작했는지 조언 부탁드려요!`,
    author: '우석·지은 가정',
    avatar: 'https://i.pravatar.cc/100?img=9',
    status: '결혼 12년차',
    time: '일주일 전',
    likes: 178,
    comments: 41,
    thumbnail: 'https://picsum.photos/id/556/200/200',
    visibility: 'public',
    commentList: [],
  },
  {
    id: 'c11',
    category: '자녀 양육',
    title: '형제 싸움, 어떻게 중재하세요?',
    preview: '위로 8살, 아래로 5살인데 하루에도 몇 번씩 싸워요. 매번 중재하다 보면 저도 지치고...',
    content: `위로 8살, 아래로 5살인데 하루에도 몇 번씩 싸워요. 매번 중재하다 보면 저도 지치고...

스스로 해결하게 놔두면 되는 건지, 아니면 중간에 들어가야 하는 건지. 어디까지가 자연스러운 형제 싸움이고 어디서부터 개입해야 하는 건지 기준이 잘 안 서요.`,
    author: '재현·서연 가정',
    avatar: 'https://i.pravatar.cc/100?img=13',
    status: '결혼 5년차',
    time: '2주 전',
    likes: 234,
    comments: 58,
    visibility: 'member',
    commentList: [],
  },
  {
    id: 'c12',
    category: '고민',
    title: '가정 우선 vs 커리어, 어떻게 균형 잡으세요?',
    preview: '승진 기회가 왔는데 야근이 많아질 것 같아요. 가정이 먼저다 vs 지금 아니면 기회 없다... 계속 갈등이에요.',
    content: `승진 기회가 왔는데 야근이 많아질 것 같아요. 가정이 먼저다 vs 지금 아니면 기회 없다... 계속 갈등이에요.

아이들이 어릴 때가 가장 중요한 시기라는 것도 알고, 한편으로는 경제적으로 안정되어야 가정도 안정된다는 것도 알고.

이런 갈림길에서 어떻게 결정하셨어요?`,
    author: '민준·수진 가정',
    avatar: 'https://i.pravatar.cc/100?img=5',
    status: '신혼 7년차',
    time: '2주 전',
    likes: 412,
    comments: 103,
    visibility: 'member',
    commentList: [],
  },
]
