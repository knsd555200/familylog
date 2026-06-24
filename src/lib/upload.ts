import { supabase } from '@/lib/supabase'
import { compressImageFile } from '@/lib/imageCompress'

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    return typeof data.error === 'string' ? data.error : fallback
  } catch {
    return fallback
  }
}

export async function uploadImages(files: File[]): Promise<{ urls: string[]; error?: string }> {
  const token = await getAccessToken()
  if (!token) return { urls: [], error: '로그인이 필요해요' }

  const urls: string[] = []

  for (const file of files) {
    const uploadFile = await compressImageFile(file)

    const presignRes = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        filename: uploadFile.name,
        contentType: uploadFile.type,
        fileSize: uploadFile.size,
      }),
    })

    if (!presignRes.ok) {
      const error = await readErrorMessage(presignRes, '이미지 업로드 준비에 실패했어요. 다시 시도해주세요.')
      return { urls, error }
    }

    const { uploadUrl, publicUrl } = await presignRes.json()
    if (typeof uploadUrl !== 'string' || typeof publicUrl !== 'string') {
      return { urls, error: '이미지 업로드 주소를 받지 못했어요. 다시 시도해주세요.' }
    }

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': uploadFile.type },
      body: uploadFile,
    })

    if (!uploadRes.ok) {
      return { urls, error: 'R2 이미지 업로드에 실패했어요. CORS 설정과 네트워크 상태를 확인해주세요.' }
    }

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
