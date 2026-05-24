import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

async function verifyUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user
}

// 파일을 서버에서 직접 R2에 업로드 (CORS 우회)
export async function POST(request: NextRequest) {
  const user = await verifyUser(request)
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: '파일이 없어요' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: '지원하지 않는 파일 형식이에요 (jpg, png, gif, webp만 가능)' },
      { status: 400 }
    )
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: '파일 크기는 5MB 이하여야 해요' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const key = `posts/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: file.type,
    ContentLength: file.size,
    Body: Buffer.from(arrayBuffer),
  }))

  const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
  return NextResponse.json({ publicUrl })
}

export async function DELETE(request: NextRequest) {
  const user = await verifyUser(request)
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })
  }

  const { url } = await request.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: '삭제할 URL이 필요해요' }, { status: 400 })
  }

  const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!
  if (!url.startsWith(publicBase)) {
    return NextResponse.json({ error: '잘못된 파일 URL이에요' }, { status: 400 })
  }

  const key = url.slice(publicBase.length + 1)

  // 본인이 업로드한 파일(posts/{userId}/...)만 삭제 허용
  if (!key.startsWith(`posts/${user.id}/`)) {
    return NextResponse.json({ error: '삭제 권한이 없어요' }, { status: 403 })
  }

  await r2.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }))

  return NextResponse.json({ success: true })
}
