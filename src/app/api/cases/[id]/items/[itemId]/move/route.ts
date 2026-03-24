import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string; itemId: string }> }

const schema = z.object({
  targetCaseId: z.string().min(1),
})

// PATCH /api/cases/[id]/items/[itemId]/move - move an item to a different case
export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, itemId } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { targetCaseId } = parsed.data

  const item = await prisma.item.findUnique({ where: { id: itemId } })
  if (!item || item.caseId !== id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.item.update({
    where: { id: itemId },
    data: { caseId: targetCaseId },
  })

  return NextResponse.json(updated)
}
