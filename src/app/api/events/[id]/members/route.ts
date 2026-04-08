import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  action: z.enum(['add', 'remove']),
  type: z.enum(['stagehand', 'case', 'device', 'item', 'consumable', 'tank']),
  memberId: z.string().min(1),
  quantityNeeded: z.number().positive().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: eventId } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { action, type, memberId, quantityNeeded } = parsed.data

  if (action === 'add') {
    if (type === 'stagehand') {
      await prisma.eventStagehand.upsert({
        where: { eventId_userId: { eventId, userId: memberId } },
        create: { eventId, userId: memberId },
        update: {},
      })
    } else if (type === 'case') {
      await prisma.eventCase.upsert({
        where: { eventId_caseId: { eventId, caseId: memberId } },
        create: { eventId, caseId: memberId },
        update: {},
      })
    } else if (type === 'device') {
      await prisma.eventDevice.upsert({
        where: { eventId_deviceId: { eventId, deviceId: memberId } },
        create: { eventId, deviceId: memberId },
        update: {},
      })
    } else if (type === 'item') {
      await prisma.eventItem.upsert({
        where: { eventId_itemId: { eventId, itemId: memberId } },
        create: { eventId, itemId: memberId },
        update: {},
      })
    } else if (type === 'consumable') {
      await prisma.eventConsumable.upsert({
        where: { eventId_consumableId: { eventId, consumableId: memberId } },
        create: { eventId, consumableId: memberId, quantityNeeded: quantityNeeded ?? 1 },
        update: { quantityNeeded: quantityNeeded ?? 1 },
      })
    } else if (type === 'tank') {
      await prisma.eventTank.upsert({
        where: { eventId_tankId: { eventId, tankId: memberId } },
        create: { eventId, tankId: memberId, quantityNeeded: quantityNeeded },
        update: { quantityNeeded: quantityNeeded },
      })
    }
  } else {
    if (type === 'stagehand') {
      await prisma.eventStagehand.deleteMany({ where: { eventId, userId: memberId } })
    } else if (type === 'case') {
      await prisma.eventCase.deleteMany({ where: { eventId, caseId: memberId } })
    } else if (type === 'device') {
      await prisma.eventDevice.deleteMany({ where: { eventId, deviceId: memberId } })
    } else if (type === 'item') {
      await prisma.eventItem.deleteMany({ where: { eventId, itemId: memberId } })
    } else if (type === 'consumable') {
      await prisma.eventConsumable.deleteMany({ where: { eventId, consumableId: memberId } })
    } else if (type === 'tank') {
      await prisma.eventTank.deleteMany({ where: { eventId, tankId: memberId } })
    }
  }

  return NextResponse.json({ ok: true })
}
