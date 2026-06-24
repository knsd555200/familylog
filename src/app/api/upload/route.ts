import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createRemoteJWKSet, jwtVerify } from 'jose'

// Supabase 비대칭 JWT(ES256) 검증용 공개키 셋 — 모듈 1회 생성 후 캐시됨
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
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
  // Authorization 헤더에서 Bearer 토큰 추출
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    // JWKS 공개키로 토큰 서명·만료를 직접 검증 (ES256 비대칭키 대응)
    const { payload } = await jwtVerify(token, JWKS)
    if (!payload.sub) return null
    // 기존 핸들러가 user.id를 쓰므로 동일한 형태로 반환
    return { id: payload.sub }
  } catch {
    // 검증 실패(서명 불일치·만료·형식 오류 등)는 미인증으로 처리
    return null
  }
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

  // [임시 디버그] R2 자격증명·요청 메타 점검용 — Invalid header 원인 추적 후 제거 예정
  console.log('[upload debug]', JSON.stringify({
    userId: user.id,
    key,
    fileType: file.type,
    fileName: file.name,
    accountId: process.env.R2_ACCOUNT_ID,
    bucket: process.env.R2_BUCKET_NAME,
    accessKeyLen: process.env.R2_ACCESS_KEY_ID?.length,
    secretKeyLen: process.env.R2_SECRET_ACCESS_KEY?.length,
  }))

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
