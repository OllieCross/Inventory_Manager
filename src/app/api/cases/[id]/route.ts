import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  qrdata: z.string().min(1).max(300).optional(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        quantity: z.number().int().min(1).default(1),
        comment: z.string().optional(),
        sortOrder: z.number().int().default(0),
      })
    )
    .optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/cases/[id] - fetch one case with all relations
export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const caseData = await prisma.case.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      images: { orderBy: { createdAt: 'asc' } },
      documents: { orderBy: { createdAt: 'asc' } },
      createdBy: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, name: true } },
    },
  })

  if (!caseData) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(caseData)
}

// PUT /api/cases/[id] - update case name, description, and items (EDITOR or ADMIN)
export async function PUT(req: Request, { params }: RouteParams) {
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

  const { name, description, qrdata, items } = parsed.data

  const updated = await prisma.$transaction(async (tx) => {
    if (items !== undefined) {
      // Delete removed items, upsert the rest
      const incomingIds = items.filter((i) => i.id).map((i) => i.id as string)
      await tx.item.deleteMany({
        where: { caseId: id, id: { notIn: incomingIds } },
      })
      for (const item of items) {
        if (item.id) {
          await tx.item.update({
            where: { id: item.id },
            data: {
              name: item.name,
              quantity: item.quantity,
              comment: item.comment,
              sortOrder: item.sortOrder,
            },
          })
        } else {
          await tx.item.create({
            data: { caseId: id, name: item.name, quantity: item.quantity, comment: item.comment, sortOrder: item.sortOrder },
          })
        }
      }
    }

    return tx.case.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(qrdata && { qrdata }),
        updatedById: session.user.id,
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        images: true,
        documents: true,
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    })
  })

  await logAudit('CASE_UPDATED', session.user.id, id, { caseName: updated.name })

  return NextResponse.json(updated)
}

// DELETE /api/cases/[id] - delete case and all its files (ADMIN only)
export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const caseData = await prisma.case.findUnique({ where: { id }, select: { name: true } })
  await prisma.case.delete({ where: { id } })
  await logAudit('CASE_DELETED', session.user.id, id, { caseName: caseData?.name })
  return new NextResponse(null, { status: 204 })
}
