import { supabase } from '@/lib/supabase'

async function getAccessToken(): Promise<string | null> {
  // 1) 저장된 세션에서 액세스 토큰을 먼저 읽는다(정상 경로).
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) return session.access_token

  // 2) 세션이 비어 있으면(토큰 만료·세션 복원 지연 등) 토큰 갱신을 한 번 시도한다.
  //    로그인 상태인데도 getSession()이 일시적으로 null을 주는 경우를 구제한다.
  const { data: { session: refreshed } } = await supabase.auth.refreshSession()
  return refreshed?.access_token ?? null
}

export async function uploadImages(files: File[]): Promise<{ urls: string[]; error?: string }> {
  const token = await getAccessToken()
  if (!token) return { urls: [], error: '로그인이 필요해요' }

  const urls: string[] = []

  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    })

    if (!res.ok) {
      const { error } = await res.json()
      return { urls, error: error ?? '이미지 업로드에 실패했어요. 다시 시도해주세요.' }
    }

    const { publicUrl } = await res.json()
    urls.push(publicUrl)
  }

  return { urls }
}

export async function deleteImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return
  const token = await getAccessToken()
  if (!token) return

  await Promise.all(
    urls.map(url =>
      fetch('/api/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
      })
    )
  )
}
