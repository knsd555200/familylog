import { NextRequest, NextResponse } from 'next/server'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
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
