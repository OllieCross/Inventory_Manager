import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const issue = await prisma.issueEntry.findUnique({ where: { id } })
  if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.issueEntry.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
