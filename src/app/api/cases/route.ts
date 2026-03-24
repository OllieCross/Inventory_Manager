import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  qrdata: z.string().min(1),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().min(1).default(1),
        comment: z.string().optional(),
        sortOrder: z.number().int().default(0),
      })
    )
    .default([]),
})

// GET /api/cases - list all cases (any authenticated user)
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cases = await prisma.case.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { items: true, images: true, documents: true } },
    },
  })

  return NextResponse.json(cases)
}

// POST /api/cases - create a new case (EDITOR or ADMIN only)
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { name, description, qrdata, items } = parsed.data

  const existing = await prisma.case.findUnique({ where: { qrdata } })
  if (existing) {
    return NextResponse.json({ error: 'QR data already assigned to another case' }, { status: 409 })
  }

  const created = await prisma.case.create({
    data: {
      name,
      description,
      qrdata,
      createdById: session.user.id,
      items: { create: items },
    },
    include: {
      items: true,
      createdBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(created, { status: 201 })
}
