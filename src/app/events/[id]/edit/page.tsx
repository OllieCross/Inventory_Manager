import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/Header'
import EventForm from '@/components/forms/EventForm'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) redirect('/events')

  const { id } = await params

  const [event, allUsers, allCases, allDevices, allItems, allConsumables, allTanks, allPyros, allGroups] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        stagehands: { include: { user: { select: { id: true, name: true, email: true } } } },
        cases: { include: { case: { select: { id: true, name: true } } } },
        devices: { include: { device: { select: { id: true, name: true, status: true } } } },
        items: { include: { item: { select: { id: true, name: true, quantity: true } } } },
        consumables: { include: { consumable: { select: { id: true, name: true, unit: true } } } },
        tanks: { include: { tank: { select: { id: true, name: true, unit: true, chemicalCompound: true } } } },
        pyros: { include: { pyro: { select: { id: true, name: true, category: true } } } },
      },
    }),
    prisma.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, email: true } }),
    prisma.case.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.device.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, status: true } }),
    prisma.item.findMany({ where: { caseId: null, deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, quantity: true } }),
    prisma.consumable.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, unit: true } }),
    prisma.tank.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, unit: true, chemicalCompound: true } }),
    prisma.pyro.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, category: true, brand: true } }),
    prisma.group.findMany({
      orderBy: { name: 'asc' },
      include: {
        cases: { include: { case: { select: { id: true, name: true } } } },
        devices: { include: { device: { select: { id: true, name: true, status: true } } } },
        items: { include: { item: { select: { id: true, name: true, quantity: true } } } },
        consumables: { include: { consumable: { select: { id: true, name: true, unit: true } } } },
      },
    }),
  ])

  if (!event) notFound()

  const members = [
    ...event.stagehands.map((es) => ({
      type: 'stagehand' as const,
      id: es.user.id,
      name: es.user.name,
      email: es.user.email,
    })),
    ...event.cases.map((ec) => ({ type: 'case' as const, id: ec.case.id, name: ec.case.name })),
    ...event.devices.map((ed) => ({ type: 'device' as const, id: ed.device.id, name: ed.device.name, status: ed.device.status })),
    ...event.items.map((ei) => ({ type: 'item' as const, id: ei.item.id, name: ei.item.name, quantity: ei.quantityNeeded })),
    ...event.consumables.map((ec) => ({
      type: 'consumable' as const,
      id: ec.consumable.id,
      name: ec.consumable.name,
      unit: ec.consumable.unit,
      quantityNeeded: ec.quantityNeeded,
    })),
    ...event.tanks.map((et) => ({
      type: 'tank' as const,
      id: et.tank.id,
      name: et.tank.name,
      unit: et.tank.unit,
      chemicalCompound: et.tank.chemicalCompound,
    })),
    ...event.pyros.map((ep) => ({
      type: 'pyro' as const,
      id: ep.pyro.id,
      name: ep.pyro.name,
      category: ep.pyro.category,
      quantity: ep.quantityNeeded,
    })),
  ]

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-16">
        <h1 className="text-xl font-bold">Edit Event</h1>
        <EventForm
          mode="edit"
          eventId={id}
          initialData={{
            name: event.name,
            venueName: event.venueName,
            location: event.location ?? '',
            startDate: event.startDate.toISOString(),
            clientName: event.clientName ?? '',
            clientPhone: event.clientPhone ?? '',
            clientEmail: event.clientEmail ?? '',
            comments: event.comments ?? '',
            status: event.status,
            invoiceStatus: event.invoiceStatus,
            members,
          }}
          allUsers={allUsers}
          allCases={allCases}
          allDevices={allDevices}
          allItems={allItems}
          allConsumables={allConsumables}
          allTanks={allTanks}
          allPyros={allPyros}
          allGroups={allGroups}
        />
      </main>
    </>
  )
}
