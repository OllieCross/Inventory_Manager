import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  qrCode: z.string().min(1).max(300).optional(),
  serialNumber: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  status: z.enum(['Working', 'Faulty', 'InRepair', 'Retired', 'Lost', 'RentedToFriend']).optional(),
  caseId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const device = await prisma.device.findUnique({
    where: { id },
    include: {
      case: { select: { id: true, name: true } },
      images: { orderBy: { createdAt: 'asc' } },
      documents: { orderBy: { createdAt: 'asc' } },
      logbook: {
        orderBy: { date: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  })

  if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(device)
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

  const data = parsed.data

  try {
    const device = await prisma.device.update({
      where: { id },
      data: {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : data.purchaseDate,
      },
    })

    await logAudit('DEVICE_UPDATED', session.user.id, device.id, { deviceName: device.name })

    return NextResponse.json(device)
  } catch (err: unknown) {
    if (
      typeof err === 'object' && err !== null &&
      'code' in err && (err as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'QR code already in use by another device' }, { status: 409 })
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
  const device = await prisma.device.delete({ where: { id } })

  await logAudit('DEVICE_DELETED', session.user.id, id, { deviceName: device.name })

  return NextResponse.json({ ok: true })
}
