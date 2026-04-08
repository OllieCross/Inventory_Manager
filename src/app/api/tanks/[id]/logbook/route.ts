import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const schema = z.object({
  date: z.string().min(1),
  comment: z.string().min(1),
})

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const entry = await prisma.tankLogbookEntry.create({
    data: {
      tankId: id,
      date: new Date(parsed.data.date),
      comment: parsed.data.comment,
      userId: session.user.id,
    },
    include: { user: { select: { name: true } } },
  })

  await logAudit('TANK_LOGBOOK_ENTRY_ADDED', session.user.id, id, { comment: parsed.data.comment })

  return NextResponse.json(entry, { status: 201 })
}
