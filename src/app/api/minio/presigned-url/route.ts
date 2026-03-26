import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { s3, BUCKET, ensureBucket } from '@/lib/minio'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rateLimit'

const schema = z.object({
  caseId: z.string().min(1),
  type: z.enum(['image', 'document']),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
})

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const ALLOWED_DOC_TYPES = ['application/pdf']
const MAX_IMAGE_BYTES = 20 * 1024 * 1024 // 20 MB
const MAX_DOC_BYTES = 50 * 1024 * 1024 // 50 MB

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { allowed } = await checkRateLimit(`upload:${session.user.id}`, 20, 60)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many upload requests. Please wait before uploading more files.' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { caseId, type, fileName, mimeType } = parsed.data

  const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_DOC_TYPES
  if (!allowedTypes.includes(mimeType)) {
    return NextResponse.json({ error: `Invalid file type: ${mimeType}` }, { status: 415 })
  }

  await ensureBucket()

  const ext = fileName.split('.').pop() ?? ''
  const fileKey = `${type}s/${caseId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const maxBytes = type === 'image' ? MAX_IMAGE_BYTES : MAX_DOC_BYTES

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    ContentType: mimeType,
    ContentLength: maxBytes,
  })

  const url = await getSignedUrl(s3, command, { expiresIn: 300 })

  return NextResponse.json({ url, fileKey })
}
