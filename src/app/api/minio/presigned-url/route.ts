import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { s3Public, BUCKET, ensureBucket } from '@/lib/minio'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rateLimit'

const schema = z.union([
  z.object({
    caseId: z.string().min(1),
    deviceId: z.undefined().optional(),
    tankId: z.undefined().optional(),
    type: z.enum(['image', 'document']),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
  }),
  z.object({
    deviceId: z.string().min(1),
    caseId: z.undefined().optional(),
    tankId: z.undefined().optional(),
    type: z.enum(['image', 'document']),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
  }),
  z.object({
    tankId: z.string().min(1),
    caseId: z.undefined().optional(),
    deviceId: z.undefined().optional(),
    type: z.enum(['image', 'document']),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
  }),
])

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const ALLOWED_DOC_TYPES = ['application/pdf']

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
}

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

  const { type, mimeType } = parsed.data
  const ownerId = parsed.data.deviceId ?? parsed.data.tankId ?? parsed.data.caseId!
  const ownerPrefix = parsed.data.deviceId ? 'devices' : parsed.data.tankId ? 'tanks' : 'cases'

  const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_DOC_TYPES
  if (!allowedTypes.includes(mimeType)) {
    return NextResponse.json({ error: `Invalid file type: ${mimeType}` }, { status: 415 })
  }

  await ensureBucket()

  const ext = MIME_TO_EXT[mimeType] ?? ''
  const fileKey = `${type}s/${ownerPrefix}/${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    ContentType: mimeType,
  })

  const url = await getSignedUrl(s3Public, command, { expiresIn: 300 })

  return NextResponse.json({ url, fileKey })
}
