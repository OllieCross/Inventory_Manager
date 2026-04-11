import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { prisma } from '@/lib/prisma'
import EventsPageClient from './EventsPageClient'

export default async function EventsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const canEdit = ['EDITOR', 'ADMIN'].includes(session.user.role)

  const events = await prisma.event.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      stagehands: { include: { user: { select: { id: true, name: true } } } },
    },
  })

  // Compute today/tomorrow boundaries (UTC midnight) for the client highlight check
  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const tomorrowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const tomorrowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2))

  const serialized = events.map((e) => ({
    id: e.id,
    name: e.name,
    venueName: e.venueName,
    location: e.location,
    startDate: e.startDate.toISOString(),
    status: e.status,
    invoiceStatus: e.invoiceStatus,
    stagehands: e.stagehands.map((s) => ({ userId: s.user.id, userName: s.user.name })),
  }))

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-16">
        <h1 className="text-xl font-bold">Events</h1>

        {canEdit && (
          <div className="flex items-center justify-between gap-2">
            <Link href="/events/new" className="btn-primary text-sm">+ Event</Link>
            <Link href="/groups" className="btn-ghost text-sm">Groups</Link>
          </div>
        )}

        {events.length === 0 ? (
          <p className="text-muted text-sm">No events yet.</p>
        ) : (
          <EventsPageClient
            events={serialized}
            userId={session.user.id}
            nowISO={now.toISOString()}
            todayISO={todayStart.toISOString()}
            tomorrowISO={tomorrowStart.toISOString()}
            tomorrowEndISO={tomorrowEnd.toISOString()}
            canEdit={canEdit}
          />
        )}
      </main>
    </>
  )
}
