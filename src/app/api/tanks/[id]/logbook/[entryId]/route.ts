import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string; entryId: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { entryId } = await params
  const entry = await prisma.tankLogbookEntry.findUnique({ where: { id: entryId } })
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.tankLogbookEntry.delete({ where: { id: entryId } })

  return NextResponse.json({ ok: true })
}
