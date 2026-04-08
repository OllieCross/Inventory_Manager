import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getFileUrl } from '@/lib/minio'
import Header from '@/components/layout/Header'
import TankEditorForm from '@/components/forms/TankEditorForm'

export default async function EditTankPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) redirect('/login')

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

  if (!tank) notFound()

  const imageUrls = await Promise.all(
    tank.images.map(async (img) => ({
      ...img,
      url: await getFileUrl(img.fileKey),
    }))
  )

  const documentUrls = await Promise.all(
    tank.documents.map(async (doc) => ({
      ...doc,
      url: await getFileUrl(doc.fileKey),
    }))
  )

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-16">
        <h1 className="text-xl font-bold">Edit Tank</h1>
        <TankEditorForm
          mode="edit"
          tankId={id}
          initialData={{
            name: tank.name,
            qrCode: tank.qrCode ?? '',
            chemicalCompound: tank.chemicalCompound as 'H2O' | 'O2' | 'CO2' | 'C4H10C3H8' | 'N2' | 'H2' | 'LN2' | 'Other',
            unit: tank.unit,
            fullCapacity: String(tank.fullCapacity),
            currentCapacity: String(tank.currentCapacity),
            notes: tank.notes ?? '',
            images: imageUrls,
            documents: documentUrls.map((d) => ({
              ...d,
              type: d.type as 'Manual' | 'Certificate' | 'Other' | 'Bill' | 'Order' | 'Invoice' | 'ServiceReport',
            })),
            logbook: tank.logbook.map((e) => ({
              ...e,
              date: e.date.toISOString(),
            })),
          }}
        />
      </main>
    </>
  )
}
