import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/Header'
import EventForm from '@/components/forms/EventForm'

export default async function NewEventPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) redirect('/events')

  const [allUsers, allCases, allDevices, allItems, allConsumables, allTanks, allGroups] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, email: true } }),
    prisma.case.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.device.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, status: true } }),
    prisma.item.findMany({ where: { caseId: null, deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, quantity: true } }),
    prisma.consumable.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, unit: true } }),
    prisma.tank.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, unit: true, chemicalCompound: true } }),
    prisma.group.findMany({
      orderBy: { name: 'asc' },
      include: {
        cases: { include: { case: { select: { id: true, name: true } } } },
        devices: { include: { device: { select: { id: true, name: true, status: true } } } },
        items: { include: { item: { select: { id: true, name: true, quantity: true } } } },
        consumables: { include: { consumable: { select: { id: true, name: true, unit: true } }, } },
      },
    }),
  ])

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-16">
        <h1 className="text-xl font-bold">New Event</h1>
        <EventForm
          mode="create"
          allUsers={allUsers}
          allCases={allCases}
          allDevices={allDevices}
          allItems={allItems}
          allConsumables={allConsumables}
          allTanks={allTanks}
          allGroups={allGroups}
        />
      </main>
    </>
  )
}
