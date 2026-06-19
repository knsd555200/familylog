// 모델하우스 CTA로 신규 가입한 사람은 온보딩(닉네임) 후 곧바로 가정 생성으로 이어야 한다.
// 가입 → /signup 온보딩 → /community 로 페이지가 바뀌는 사이 의도가 유실되므로 localStorage에 잠깐 보관한다.

const KEY = 'familog_pending_family_create'

/** 온보딩 후 가정 생성을 예약한다. */
export function setPendingFamilyCreate() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // localStorage 접근 불가(시크릿/권한) 시 조용히 무시
  }
}

/** 예약 여부만 읽는다(삭제하지 않음). */
export function peekPendingFamilyCreate(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** 예약을 꺼내고 즉시 삭제한다(한 번만 사용). */
export function consumePendingFamilyCreate(): boolean {
  try {
    const has = localStorage.getItem(KEY) === '1'
    if (has) localStorage.removeItem(KEY)
    return has
  } catch {
    return false
  }
}
