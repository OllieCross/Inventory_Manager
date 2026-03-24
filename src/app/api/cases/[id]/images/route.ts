import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const schema = z.object({
  fileKey: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
})

// POST /api/cases/[id]/images - record an image after it has been uploaded to MinIO
export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const image = await prisma.image.create({
    data: { caseId: id, ...parsed.data },
  })

  await prisma.case.update({
    where: { id },
    data: { updatedById: session.user.id },
  })

  return NextResponse.json(image, { status: 201 })
}
