import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/minio'

type RouteParams = { params: Promise<{ id: string; docId: string }> }

// DELETE /api/cases/[id]/documents/[docId]
export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, docId } = await params

  const document = await prisma.document.findUnique({ where: { id: docId } })
  if (!document || document.caseId !== id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await deleteFile(document.fileKey)
  await prisma.document.delete({ where: { id: docId } })

  return new NextResponse(null, { status: 204 })
}
