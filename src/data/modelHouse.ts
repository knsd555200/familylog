import type { Comment, CommunityPost } from '@/types/post'
export type { Comment, CommunityPost }

// 모델하우스(우리 가족 탭, family_id 없을 때 보이는 견본 화면)용 "밀로네" 예시 데이터.
// 실제 렌더는 다음 작업에서 처리하고, 여기선 데이터만 정의한다.

// ── 가족 소개 ──────────────────────────────────────────────────────────────
export const miloneIntro = {
  familyName: '밀로네',
  tagline: '패밀로그의 첫 번째 가정이에요.',
  // 모바일에서 한 줄에 안 들어가 '그리고'에서 줄바꿈 (whitespace-pre-line로 렌더)
  members: '밀로(첫째)·밀리(둘째),\n그리고 엄마·아빠·할머니·할아버지가 함께 살아요.',
  closing: '멀리 있어도, 가족의 오늘은 여기 모여요.',
}

// ── 견본 글 2개 ────────────────────────────────────────────────────────────
// 중요: preview = 접힌 상태로 보이는 본문(더보기 전), content = 펼친 전체 본문.
export const modelHousePosts: CommunityPost[] = [
  // ── 카드 1 — 밀로아빠, 능청 낚시글 ───────────────────────────────────────
  {
    id: 'milone-1', // 고정 식별자
    category: '일상', // 능청 일상글
    title: '밀리 백일상', // 모델하우스 카드는 제목 강조 안 하니 짧게
    // 접힌 상태 — 줄바꿈(\n)으로 4줄 끊기. 이 줄바꿈이 핵심이라 그대로 보존
    preview: '밀리 백일상 차리느라\n새벽 4시까지 풍선 불었는데\n사진엔 풍선 하나 안 나오고\n애 얼굴만 남았네. 그래서 그날 밤',
    // 펼친 전체 — preview 내용 + 이어지는 반전
    content: '밀리 백일상 차리느라\n새벽 4시까지 풍선 불었는데\n사진엔 풍선 하나 안 나오고 애 얼굴만 남았네.\n그래서 그날 밤 전말을 시간순으로\n낱낱이 적으려다 말았다.\n사실 하나도 안 서운하다. 밀리야, 백일 축하해.',
    author: '밀로아빠',
    avatar: '', // 실제 이미지는 다음 작업에서 처리 — 지금은 빈 값
    status: '두 아이 아빠', // 작성자 한줄상태(자유 텍스트)
    time: '어제', // 표시용 텍스트
    likes: 3, // 카드1은 작게
    comments: 5, // commentList 길이와 일치
    visibility: 'public', // 견본이라 전체공개 톤
    createdAt: '2026-06-16T23:30:00+09:00', // time('어제')과 어긋나지 않는 합성 ISO
    mediaUrls: ['/modelhouse/card1.png'], // placeholder 경로 — 실제 파일은 추후 추가
    // 대댓글 중첩 — 두 갈래 스레드
    commentList: [
      // 스레드 1 — 밀로엄마 → (답글) 밀로아빠
      {
        id: 'milone-1-c1', author: '밀로엄마', avatar: '', status: '',
        content: '당신 진짜 안 서운해? 아까 보니 좀 서운한 것 같던데', time: '어제',
        replies: [
          { id: 'milone-1-c2', author: '밀로아빠', avatar: '', status: '', content: '안 서운하다니까', time: '어제' },
        ],
      },
      // 스레드 2 — 밀로할머니 → 밀로할아버지 → 밀로엄마
      {
        id: 'milone-1-c3', author: '밀로할머니', avatar: '', status: '',
        content: '더보기까지 눌렀더니 두 줄이 뭐냐 ㅋㅋ', time: '어제',
        replies: [
          {
            id: 'milone-1-c4', author: '밀로할아버지', avatar: '', status: '',
            content: '나는 안 눌렀다.', time: '어제',
            replies: [
              { id: 'milone-1-c5', author: '밀로엄마', avatar: '', status: '', content: '아버님 댓글 다신 거 보니 누르셨는데요', time: '어제' },
            ],
          },
        ],
      },
    ],
  },

  // ── 카드 2 — 밀로엄마, 정서글 ────────────────────────────────────────────
  {
    id: 'milone-2', // 고정 식별자
    category: '고민', // 육아 고민글
    title: '밀로에게', // 짧게
    // 접힌 상태 — 자연스러운 산문(줄바꿈 없음), 길이로 잘리게
    preview: '밀리 낳고 밀로가 자꾸 "엄마 나 미워해?" 하고 묻는다. 어젯밤엔 밀로 재우다 나도 같이 울어버렸네. 누구한테 말도 못 하고 삼켰는데, 동생 생기고 내가 밀로를 충분히 못 안아준 것 같아서',
    // 펼친 전체
    content: '밀리 낳고 밀로가 자꾸 "엄마 나 미워해?" 하고 묻는다. 어젯밤엔 밀로 재우다 나도 같이 울어버렸네. 누구한테 말도 못 하고 삼켰는데, 동생 생기고 내가 밀로를 충분히 못 안아준 것 같아서. 여기엔 적어둘 수 있어 다행이다. 밀로가 크면, 엄마도 그때 너만큼 힘들었다고, 근데 한 번도 미워한 적 없었다고 보여주고 싶어서.',
    author: '밀로엄마',
    avatar: '', // 실제 이미지는 다음 작업에서 처리 — 지금은 빈 값
    status: '밀로·밀리 엄마', // 작성자 한줄상태(자유 텍스트)
    time: '3일 전', // 표시용 텍스트
    likes: 12, // 카드1보다 조금 더
    comments: 1, // 최상위 댓글 1개(스레드) — commentList 길이와 일치
    visibility: 'public', // 견본이라 전체공개 톤
    createdAt: '2026-06-14T22:10:00+09:00', // 카드1('어제')보다 과거인 합성 ISO
    // 대댓글 중첩 사용 — 할머니→엄마→할머니 스레드
    commentList: [
      {
        id: 'milone-2-c1', author: '밀로할머니', avatar: '', status: '',
        content: '너도 동생 생겼을 때 똑같았어. 나도 그땐 매일 울었다.', time: '3일 전',
        replies: [
          {
            id: 'milone-2-c1-r1', author: '밀로엄마', avatar: '', status: '',
            content: '…어머니도요? 밀로 크면 이것도 같이 보여줘야겠네. 할머니도 똑같았다고.', time: '3일 전',
            replies: [
              {
                id: 'milone-2-c1-r1-r1', author: '밀로할머니', avatar: '', status: '',
                content: '그래. 그 말이 제일 위로가 될 거다.', time: '3일 전',
              },
            ],
          },
        ],
      },
    ],
  },

  // ── 카드 3 — 밀로할아버지, 능청 일상글 (블러 미끼라 짧음) ──────────────────
  {
    id: 'milone-3', // 고정 식별자
    category: '일상', // 능청 일상글
    title: '보조바퀴', // 짧게
    // 블러로 안 읽히는 미끼 — preview·content 동일
    preview: '밀로가 자전거 보조바퀴 뗐다. 넘어질까 봐 뒤에서 잡고 한참 뛰었더니 다음 날 종아리가 안 펴진다. 늙으면 손주가 운동을 시킨다더니.',
    content: '밀로가 자전거 보조바퀴 뗐다. 넘어질까 봐 뒤에서 잡고 한참 뛰었더니 다음 날 종아리가 안 펴진다. 늙으면 손주가 운동을 시킨다더니.',
    author: '밀로할아버지',
    avatar: '', // 실제 이미지는 다음 작업에서 처리 — 지금은 빈 값
    status: '밀로·밀리 할아버지', // 작성자 한줄상태(자유 텍스트)
    time: '5일 전', // 표시용 텍스트
    likes: 8,
    comments: 2, // commentList 길이와 일치
    visibility: 'public', // 견본이라 전체공개 톤
    createdAt: '2026-06-12T20:00:00+09:00', // 카드2('3일 전')보다 과거인 합성 ISO
    commentList: [
      { id: 'milone-3-c1', author: '밀로아빠',   avatar: '', status: '', content: '아버지 무리하지 마세요', time: '5일 전' },
      { id: 'milone-3-c2', author: '밀로할아버지', avatar: '', status: '', content: '괜찮다. 너도 옛날에 내가 잡고 뛰었다.', time: '5일 전' },
    ],
  },
]
