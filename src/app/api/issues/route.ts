import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  description: z.string().min(1).max(1000),
  deviceId: z.string().optional().nullable(),
  caseId: z.string().optional().nullable(),
  itemId: z.string().optional().nullable(),
  isOther: z.boolean().optional(),
}).refine(d => d.isOther || d.deviceId || d.caseId || d.itemId, {
  message: 'At least one of deviceId, caseId, or itemId must be provided, or select Other',
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const devices = await prisma.device.findMany({
    where: { status: { in: ['Faulty', 'InRepair'] }, deletedAt: null },
    orderBy: { name: 'asc' },
    include: {
      logbook: {
        orderBy: { date: 'desc' },
        take: 3,
        include: { user: { select: { name: true } } },
      },
    },
  })

  const manualIssues = await prisma.issueEntry.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true } },
      device: { select: { id: true, name: true } },
      case: { select: { id: true, name: true } },
      item: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ devices, manualIssues })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const issue = await prisma.issueEntry.create({
    data: {
      description: parsed.data.description,
      deviceId: parsed.data.deviceId ?? null,
      caseId: parsed.data.caseId ?? null,
      itemId: parsed.data.itemId ?? null,
      userId: session.user.id,
    },
    include: {
      user: { select: { name: true } },
      device: { select: { id: true, name: true } },
      case: { select: { id: true, name: true } },
      item: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(issue, { status: 201 })
}
