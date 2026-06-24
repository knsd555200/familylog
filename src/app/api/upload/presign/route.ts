import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createRemoteJWKSet, jwtVerify } from 'jose'

export const runtime = 'nodejs'

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

const MAX_SIZE_BYTES = 20 * 1024 * 1024
const PRESIGNED_URL_EXPIRES_IN_SECONDS = 60

type PresignRequestBody = {
  filename?: unknown
  contentType?: unknown
  fileSize?: unknown
}

async function verifyUser(request: NextRequest) {
  // Authorization 헤더에서 Supabase Bearer 토큰을 꺼낸다.
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  try {
    // Supabase JWKS로 JWT 서명과 만료를 검증하고 사용자 id만 업로드 prefix에 사용한다.
    const { payload } = await jwtVerify(token, JWKS)
    if (!payload.sub) return null

    return { id: payload.sub }
  } catch {
    // 토큰 검증 실패는 상세 원인을 숨기고 미인증으로 처리한다.
    return null
  }
}

function getExtension(filename: string): string {
  // 기존 /api/upload와 동일하게 파일명 마지막 확장자를 쓰고, 없으면 jpg를 기본값으로 둔다.
  return filename.split('.').pop()?.toLowerCase() || 'jpg'
}

function isValidBody(body: PresignRequestBody): body is {
  filename: string
  contentType: string
  fileSize: number
} {
  return (
    typeof body.filename === 'string' &&
    body.filename.trim().length > 0 &&
    typeof body.contentType === 'string' &&
    body.contentType.startsWith('image/') &&
    typeof body.fileSize === 'number' &&
    Number.isFinite(body.fileSize) &&
    body.fileSize > 0 &&
    body.fileSize <= MAX_SIZE_BYTES
  )
}

export async function POST(request: NextRequest) {
  const user = await verifyUser(request)
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })
  }

  let body: PresignRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않아요' }, { status: 400 })
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      { error: '이미지 파일만 업로드할 수 있고, 파일 크기는 20MB 이하여야 해요' },
      { status: 400 }
    )
  }

  // 기존 업로드 key 패턴을 유지해 파일 소유자 단위 prefix를 보존한다.
  const ext = getExtension(body.filename)
  const key = `posts/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  // 브라우저가 이 URL로 직접 PUT할 때 Content-Type이 서명 조건과 일치해야 한다.
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: body.contentType,
  })

  const uploadUrl = await getSignedUrl(r2, command, {
    expiresIn: PRESIGNED_URL_EXPIRES_IN_SECONDS,
  })
  const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`

  return NextResponse.json({ uploadUrl, publicUrl, key })
}
