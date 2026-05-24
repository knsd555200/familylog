# 패밀로그 (Familog) — 시연용 데모

> 우리 가정의 이야기를 남기는 곳 · One Family under God, one family at a time.

가정들이 일상을 기록하고 성장 궤적을 쌓는 커뮤니티 웹 플랫폼의 **시연용 데모**입니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 에 접속하세요.

## 기술 스택

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (커스텀 디자인 토큰)
- **Lucide React** (아이콘)
- **picsum.photos** (placeholder 이미지)

## 디자인 시스템

| Token | Hex |
|-------|-----|
| 배경 | `#FAFAF8` |
| 본문 텍스트 | `#1a1a18` |
| 보조 텍스트 | `#5F5E5A` |
| 포인트 (올리브그린) | `#639922` |
| 보조 포인트 (블루) | `#378ADD` |
| 라인 | `#D3D1C7` |
| 카드 배경 | `#F1EFE8` |

## 시연 흐름 (8단계)

1. **스플래시** — 첫 접속 시 2초간 로고/슬로건 노출 (세션당 1회)
2. **피드 (비로그인)** — 풀스크린 스와이프, 멤버 전용 콘텐츠는 블러 처리
3. **로그인** — 어떤 정보든 입력하면 진입 (이메일/카카오)
4. **온보딩** — 환영 메시지 + 첫 미션 안내 (좋아요/댓글/모임/게시)
5. **피드 (로그인)** — 블러 해제 + 채팅 플로팅 버튼 + 우상단 환영 토스트
6. **커뮤니티** — 카테고리 탭, 인기 글, 게시판 (4번째마다 광고), 글쓰기
7. **행사 & 모임** — 공식 행사 + 회원 주도 모임 초대
8. **스토어** — 도서/교육/포토몰(AI 자동 선별 시연)/생필품
9. **마이** — 발자취 + 포인트 내역 + 설정

## 디렉터리 구조

```
src/
├── app/                  # 페이지 (App Router)
│   ├── feed/             # 메인 피드 (풀스크린 스크롤 스냅)
│   ├── community/        # 커뮤니티 목록, 상세, 글쓰기
│   ├── home/             # 홈 대시보드
│   ├── events/           # 행사 목록, 상세
│   ├── store/            # 스토어 (도서/교육/포토몰/생필품)
│   ├── my/               # 마이 (발자취/포인트/설정)
│   ├── chat/             # 채팅 (목록/상세)
│   ├── notifications/    # 알림
│   ├── login/, signup/   # 인증
│   └── layout.tsx, page.tsx, globals.css
├── components/
│   ├── layout/           # AppShell, BottomNav, Sidebar, Header
│   ├── feed/             # FeedCard, CommentDrawer, SplashScreen
│   └── ui/               # OnboardingModal 등
├── context/              # AuthContext (localStorage 기반 mock)
└── data/                 # mock 데이터 (feed, community, events, store, notifications)
```

## 시연 시 유의 사항

- 로그인은 **mock**입니다. 어떤 이메일/비밀번호로도 진입 가능합니다.
- 게시글 작성, 좋아요, 댓글, 행사 신청 모두 **UI만** 동작합니다. 실제 저장은 되지 않습니다.
- 이미지는 `picsum.photos`에서 무작위로 가져옵니다.
- 스플래시는 세션당 한 번만 보입니다. 다시 보려면 새 탭(시크릿 창)으로 여세요.

---

*이 데모는 패밀로그 컨셉의 사용자 경험을 시연하기 위해 제작되었습니다.*
