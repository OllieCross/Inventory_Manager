import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/Header'
import InventoryPageClient from '@/components/inventory/InventoryPageClient'

export default async function InventoryPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [cases, devices, consumables, standaloneItems, tanks] = await Promise.all([
    prisma.case.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: {
        items: { select: { name: true } },
        _count: { select: { items: true, devices: true } },
      },
    }),
    prisma.device.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: {
        case: { select: { id: true, name: true } },
        _count: { select: { images: true, documents: true, logbook: true } },
      },
    }),
    prisma.consumable.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
    prisma.item.findMany({ where: { caseId: null, deletedAt: null }, orderBy: { name: 'asc' } }),
    prisma.tank.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
  ])

  const role = session.user.role
  const canEdit = ['EDITOR', 'ADMIN'].includes(role)

  return (
    <>
      <Header />
      <InventoryPageClient
        cases={cases}
        devices={devices}
        consumables={consumables}
        standaloneItems={standaloneItems}
        tanks={tanks}
        canEdit={canEdit}
        isAdmin={role === 'ADMIN'}
      />
    </>
  )
}
