import { supabase } from '@/lib/supabase'
import { compressImageFile } from '@/lib/imageCompress'

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function uploadImages(files: File[]): Promise<{ urls: string[]; error?: string }> {
  const token = await getAccessToken()
  if (!token) return { urls: [], error: '로그인이 필요해요' }

  const urls: string[] = []

  for (const file of files) {
    const uploadFile = await compressImageFile(file)
    const formData = new FormData()
    formData.append('file', uploadFile, uploadFile.name)

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
