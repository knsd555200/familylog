// src/data/mypage.ts
// Mock 데이터 — 실제 서비스 시 Supabase 쿼리로 교체
// DB 연결 시 참고 테이블: users, merits, event_joins, families, invite_code_uses, point_orders

// ─── 티어 정의 (users.tier) ───────────────────────────────────────────────
export const TIERS = [
    { id: 'seed',    label: '씨앗',   minPoints: 0,    color: '#888780' },
    { id: 'sprout',  label: '새싹',   minPoints: 500,  color: '#639922' },
    { id: 'bloom',   label: '꽃',     minPoints: 1500, color: '#378ADD' },
    { id: 'fruit',   label: '열매',   minPoints: 3000, color: '#BA7517' },
    { id: 'beacon',  label: '등대',   minPoints: 6000, color: '#534AB7' },
  ] as const
  
  export type TierId = typeof TIERS[number]['id']
  
  // ─── 포인트 적립 타입 (merits.merit_type) ────────────────────────────────
  export const MERIT_TYPE_LABELS: Record<string, string> = {
    post_created:    '게시글 작성',
    comment_created: '댓글 작성',
    like_received:   '공감 받음',
    event_joined:    '행사 참여',
    volunteer_hours: '봉사 활동',
    donation:        '후원',
    admin_grant:     '관리자 지급',
    admin_deduct:    '관리자 차감',
  }
  
  // ─── 카테고리 (merits.category) ──────────────────────────────────────────
  export const MERIT_CATEGORY_LABELS: Record<string, string> = {
    activity:  '온라인 활동',
    volunteer: '봉사',
    donation:  '후원',
    event:     '행사',
  }
  
  // ─── Mock 유저 발자취 (users 테이블 기반) ─────────────────────────────────
  export const mockUserFootprint = {
    // users 테이블 컬럼
    merit_total:     1250,  // 누적 포인트 전체
    merit_activity:  420,   // 온라인 활동 (글/댓글)
    merit_volunteer: 380,   // 봉사
    merit_donation:  200,   // 후원
    merit_events:    250,   // 행사 참여
    tier:            'sprout' as TierId,
  
    // 계산 가능한 값 (DB 연결 시 쿼리로 대체)
    days_together:   347,   // users.created_at 기준 경과일
    posts_count:     23,    // merits where merit_type = 'post_created'
    comments_count:  47,    // merits where merit_type = 'comment_created'
  
    // event_joins 테이블에서 COUNT
    events_joined:   8,
  
    // merits where merit_type = 'volunteer_hours', SUM(raw_value)
    volunteer_hours: 14,
  
    // merits where merit_type = 'donation', SUM(raw_value)
    donation_total:  45000,
  
    // invite_code_uses 테이블에서 COUNT (나중에 DB 컬럼 추가 고려)
    invited_families: 3,
  
    // point_orders where item_type = 'photo_product' (나중에 추가)
    photo_products:  1,
  
    // groups 테이블 — 소모임 관련 (나중에 DB 컬럼 추가 고려)
    group_lead_hours:    6,   // 내가 만든 그룹의 운영 시간
    group_join_hours:    12,  // 참여한 그룹의 활동 시간
  
    // 포인트 사용 내역 (point_orders 테이블)
    points_spent:    500,
    points_remaining: 750,  // merit_total - points_spent
  }
  
  // ─── Mock 포인트 적립 내역 (merits 테이블 기반) ───────────────────────────
  export const mockMeritHistory = [
    {
      id: 'm1',
      merit_type: 'event_joined',
      category: 'event',
      points: 50,
      raw_value: null,
      note: '패밀리 자연 캠프 참여',
      created_at: '2025-05-18T10:00:00Z',
    },
    {
      id: 'm2',
      merit_type: 'volunteer_hours',
      category: 'volunteer',
      points: 80,
      raw_value: 3,  // 3시간
      note: '한강 환경 정화 봉사 3시간',
      created_at: '2025-05-10T09:00:00Z',
    },
    {
      id: 'm3',
      merit_type: 'post_created',
      category: 'activity',
      points: 100,
      raw_value: null,
      note: '첫 게시글 작성',
      created_at: '2025-05-05T14:30:00Z',
    },
    {
      id: 'm4',
      merit_type: 'donation',
      category: 'donation',
      points: 200,
      raw_value: 30000,  // 3만원
      note: '부부 워크숍 후원',
      created_at: '2025-04-28T11:00:00Z',
    },
    {
      id: 'm5',
      merit_type: 'comment_created',
      category: 'activity',
      points: 30,
      raw_value: null,
      note: '커뮤니티 댓글 작성',
      created_at: '2025-04-20T16:00:00Z',
    },
    {
      id: 'm6',
      merit_type: 'event_joined',
      category: 'event',
      points: 50,
      raw_value: null,
      note: '자녀 교육 강연 참여',
      created_at: '2025-04-15T14:00:00Z',
    },
    {
      id: 'm7',
      merit_type: 'volunteer_hours',
      category: 'volunteer',
      points: 80,
      raw_value: 4,  // 4시간
      note: '소외계층 지원 바자회 4시간',
      created_at: '2025-04-05T10:00:00Z',
    },
    {
      id: 'm8',
      merit_type: 'admin_grant',
      category: 'activity',
      points: 50,
      raw_value: null,
      note: '프로필 완성 보너스',
      created_at: '2025-03-01T09:00:00Z',
    },
  ]
  
  // ─── Mock 공개 프로필 (멤버 공개 / 매칭 공개 분기) ───────────────────────
  export type ProfileVisibility = 'private' | 'members' | 'matching'
  
  export const mockPublicProfile = {
    // 멤버 공개 시 보이는 것
    members: {
      nickname: '민준·수진 가정',
      family_type: 'parenting',
      tier: 'sprout' as TierId,
      merit_total: 1250,
      merit_activity: 420,
      merit_volunteer: 380,
      merit_events: 250,
      events_joined: 8,
      volunteer_hours: 14,
      posts_count: 23,
      days_together: 347,
    },
    // 매칭 공개 시 추가로 보이는 것
    matching: {
      // members 내용 포함 +
      volunteer_hours: 14,
      donation_total: 45000,
      group_lead_hours: 6,
      group_join_hours: 12,
      invited_families: 3,
      merit_history_summary: {
        activity: 420,
        volunteer: 380,
        donation: 200,
        event: 250,
      },
    },
  }
  
  // ─── Mock 가족 발자취 (families 테이블 기반) ──────────────────────────────
  // families 테이블에도 merit 컬럼이 있음 (개인 + 가족 단위 발자취 분리)
  export const mockFamilyFootprint = {
    name: '민준·수진 가정',
    family_type: 'parenting',
    is_model_family: false,
    merit_total: 2100,
    merit_activity: 680,
    merit_volunteer: 620,
    merit_donation: 350,
    merit_events: 450,
  }