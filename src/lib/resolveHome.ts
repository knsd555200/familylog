type HomeUser = {
  family_id?: string | null
} | null | undefined

// 첫 화면은 가정이 있으면 우리 가족 탭, 없으면 전체 피드로 보낸다.
export function resolveHomePath(user: HomeUser): string {
  return user?.family_id ? '/community?tab=family' : '/community'
}
