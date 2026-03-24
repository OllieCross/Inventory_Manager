import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/cases/lookup?qrdata=... - resolve a raw QR payload to a case id
export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const qrdata = searchParams.get('qrdata')
  if (!qrdata) return NextResponse.json({ error: 'Missing qrdata' }, { status: 400 })

  const caseData = await prisma.case.findUnique({
    where: { qrdata },
    select: { id: true, name: true },
  })

  if (!caseData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(caseData)
}
