import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string; imageId: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { imageId } = await params
  const image = await prisma.tankImage.findUnique({ where: { id: imageId } })
  if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.tankImage.update({ where: { id: imageId }, data: { deletedAt: new Date() } })

  return NextResponse.json({ ok: true })
}
