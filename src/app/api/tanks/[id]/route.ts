import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  qrCode: z.string().optional().nullable(),
  chemicalCompound: z.enum(['H2O', 'O2', 'CO2', 'C4H10C3H8', 'N2', 'H2', 'LN2', 'Other']).optional(),
  unit: z.string().min(1).max(20).optional(),
  fullCapacity: z.number().positive().optional(),
  currentCapacity: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const tank = await prisma.tank.findUnique({
    where: { id },
    include: {
      images: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      documents: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      logbook: {
        orderBy: { date: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  })

  if (!tank) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(tank)
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const tank = await prisma.tank.update({
      where: { id },
      data: { ...parsed.data, updatedById: session.user.id },
    })

    await logAudit('TANK_UPDATED', session.user.id, tank.id, { tankName: tank.name })

    return NextResponse.json(tank)
  } catch (err: unknown) {
    if (
      typeof err === 'object' && err !== null &&
      'code' in err && (err as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'QR code already in use by another tank' }, { status: 409 })
    }
    throw err
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const tank = await prisma.tank.findUnique({ where: { id }, select: { name: true } })
  await prisma.tank.update({ where: { id }, data: { deletedAt: new Date() } })

  await logAudit('TANK_DELETED', session.user.id, id, { tankName: tank?.name })

  return NextResponse.json({ ok: true })
}
