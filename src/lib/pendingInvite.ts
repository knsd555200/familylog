// 가입/로그인 흐름 동안 초대 코드를 임시 보관한다.
// 초대 링크 → 회원가입 → 이메일 인증 → 온보딩으로 이어지는 사이에 URL 쿼리는
// 유실되므로, localStorage에 코드를 들고 있다가 인증이 끝나는 지점에서 꺼내 쓴다.

const KEY = 'familog_pending_invite'

/** 합류 대기 중인 초대 코드를 저장한다. */
export function setPendingInvite(code: string) {
  try {
    localStorage.setItem(KEY, code)
  } catch {
    // localStorage 접근 불가(시크릿/권한) 시 조용히 무시
  }
}

/** 저장된 초대 코드를 삭제하지 않고 읽기만 한다. 없으면 null. */
export function peekPendingInvite(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** 저장된 초대 코드를 꺼내고 즉시 삭제한다(한 번만 사용). 없으면 null. */
export function consumePendingInvite(): string | null {
  try {
    const code = localStorage.getItem(KEY)
    if (code) localStorage.removeItem(KEY)
    return code
  } catch {
    return null
  }
}
