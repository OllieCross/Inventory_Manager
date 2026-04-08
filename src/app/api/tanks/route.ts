import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { checkRateLimit } from '@/lib/rateLimit'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  qrCode: z.string().optional(),
  chemicalCompound: z.enum(['H2O', 'O2', 'CO2', 'C4H10C3H8', 'N2', 'H2', 'LN2', 'Other']).default('Other'),
  unit: z.string().min(1).max(20),
  fullCapacity: z.number().positive(),
  currentCapacity: z.number().min(0),
  notes: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tanks = await prisma.tank.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { images: true, documents: true, logbook: true } },
    },
  })

  return NextResponse.json(tanks)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { allowed } = await checkRateLimit(`create:${session.user.id}`, 30, 60)
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { name, qrCode, chemicalCompound, unit, fullCapacity, currentCapacity, notes } = parsed.data

  if (qrCode) {
    const existing = await prisma.tank.findUnique({ where: { qrCode } })
    if (existing) {
      return NextResponse.json({ error: 'QR code already assigned to another tank' }, { status: 409 })
    }
  }

  const tank = await prisma.tank.create({
    data: {
      name,
      qrCode: qrCode || null,
      chemicalCompound,
      unit,
      fullCapacity,
      currentCapacity,
      notes: notes || null,
      createdById: session.user.id,
    },
  })

  await logAudit('TANK_CREATED', session.user.id, tank.id, { tankName: tank.name })

  return NextResponse.json(tank, { status: 201 })
}
