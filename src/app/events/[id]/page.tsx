import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/Header'

const EVENT_STATUS_LABELS: Record<string, string> = {
  Planned: 'Planned', Confirmed: 'Confirmed', Completed: 'Completed',
  Cancelled: 'Cancelled', NeedsDetails: 'Needs Details',
}
const STATUS_COLORS: Record<string, string> = {
  Planned: 'text-blue-400', Confirmed: 'text-green-400', Completed: 'text-muted',
  Cancelled: 'text-red-400', NeedsDetails: 'text-yellow-400',
}
const INVOICE_LABELS: Record<string, string> = {
  Paid: 'Paid', NotPaid: 'Not Paid', DepositPaid: 'Deposit Paid',
  DepositNotYetPaid: 'Deposit Not Yet Paid', NotPaidInFull: 'Not Paid in Full',
}
const INVOICE_COLORS: Record<string, string> = {
  Paid: 'text-green-400', NotPaid: 'text-amber-500', DepositPaid: 'text-yellow-400',
  DepositNotYetPaid: 'text-yellow-400', NotPaidInFull: 'text-orange-400',
}
const COMPOUND_LABELS: Record<string, string> = {
  H2O: 'H\u2082O', O2: 'O\u2082', CO2: 'CO\u2082',
  C4H10C3H8: 'Butane/Propane', N2: 'N\u2082', H2: 'H\u2082', LN2: 'LN\u2082', Other: 'Other',
}

const DEVICE_STATUS_LABELS: Record<string, string> = {
  Working: 'Working', Faulty: 'Faulty', InRepair: 'In Repair',
  Retired: 'Retired', Lost: 'Lost', RentedToFriend: 'Rented',
}

function formatDateTime(d: Date) {
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${day}/${month}/${year} at ${time}`
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex gap-3">
      <span className="text-muted text-sm w-28 shrink-0">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      stagehands: { include: { user: { select: { id: true, name: true } } } },
      cases: { include: { case: { select: { id: true, name: true, qrdata: true } } } },
      devices: { include: { device: { select: { id: true, name: true, status: true, case: { select: { id: true, name: true } } } } } },
      items: { include: { item: { select: { id: true, name: true, comment: true, case: { select: { id: true, name: true } } } } } },
      consumables: { include: { consumable: { select: { id: true, name: true, unit: true } } } },
      tanks: { include: { tank: { select: { id: true, name: true, unit: true, chemicalCompound: true } } } },
      pyros: { include: { pyro: { select: { id: true, name: true, category: true } } } },
    },
  })

  if (!event) notFound()

  const canEdit = ['EDITOR', 'ADMIN'].includes(session.user.role)

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-16">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{event.name}</h1>
            <p className="text-muted text-sm mt-0.5">{event.venueName}{event.location ? ` - ${event.location}` : ''}</p>
          </div>
          {canEdit && (
            <Link href={`/events/${id}/edit`} className="btn-ghost p-2 rounded-lg shrink-0" aria-label="Edit event">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </Link>
          )}
        </div>

        {/* Info card */}
        <div className="card space-y-2">
          <InfoRow label="Start" value={formatDateTime(event.startDate)} />
          <InfoRow label="Status" value={
            <span className={STATUS_COLORS[event.status] ?? ''}>{EVENT_STATUS_LABELS[event.status] ?? event.status}</span>
          } />
          <InfoRow label="Invoice" value={
            <span className={INVOICE_COLORS[event.invoiceStatus] ?? ''}>{INVOICE_LABELS[event.invoiceStatus] ?? event.invoiceStatus}</span>
          } />
          {event.clientName && <InfoRow label="Client" value={event.clientName} />}
          {event.clientPhone && (
            <InfoRow label="Phone" value={
              <a href={`tel:${event.clientPhone}`} className="text-brand hover:underline">{event.clientPhone}</a>
            } />
          )}
          {event.clientEmail && (
            <InfoRow label="Email" value={
              <a href={`mailto:${event.clientEmail}`} className="text-brand hover:underline">{event.clientEmail}</a>
            } />
          )}
          {event.comments && <InfoRow label="Notes" value={event.comments} />}
        </div>

        {/* Crew */}
        {event.stagehands.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Crew ({event.stagehands.length})</h2>
            <div className="flex flex-wrap gap-2">
              {event.stagehands.map(({ user }) => (
                <span key={user.id} className="bg-foreground/10 text-foreground/80 text-sm font-medium px-3 py-1.5 rounded-full">
                  {user.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Cases */}
        {event.cases.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Cases ({event.cases.length})</h2>
            <div className="space-y-1">
              {event.cases.map(({ case: c }) => (
                <Link key={c.id} href={`/case/${c.id}`} className="card flex items-center justify-between gap-3 py-2 px-3 hover:bg-foreground/5 transition-colors">
                  <p className="text-sm truncate">{c.name}</p>
                  <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Devices */}
        {event.devices.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Devices ({event.devices.length})</h2>
            <div className="space-y-1">
              {event.devices.map(({ device }) => (
                <Link key={device.id} href={`/devices/${device.id}`} className="card flex items-center justify-between gap-3 py-2 px-3 hover:bg-foreground/5 transition-colors">
                  <div>
                    <p className="text-sm">{device.name}</p>
                    <p className="text-xs text-muted">
                      {DEVICE_STATUS_LABELS[device.status] ?? device.status}
                      {device.case && <span> &middot; {device.case.name}</span>}
                    </p>
                  </div>
                  <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Items */}
        {event.items.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Items ({event.items.length})</h2>
            <div className="space-y-1">
              {event.items.map(({ item, quantityNeeded }) => (
                <div key={item.id} className="card py-2 px-3">
                  <p className="text-sm">{item.name} <span className="text-muted">x{quantityNeeded}</span></p>
                  {(item.comment || item.case) && (
                    <p className="text-xs text-muted">
                      {item.case && <span>{item.case.name}</span>}
                      {item.case && item.comment && <span> &middot; </span>}
                      {item.comment && <span>{item.comment}</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Consumables */}
        {event.consumables.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Consumables ({event.consumables.length})</h2>
            <div className="space-y-1">
              {event.consumables.map(({ consumable, quantityNeeded, quantityUsed }) => (
                <div key={consumable.id} className="card py-2 px-3 space-y-0.5">
                  <p className="text-sm font-medium">{consumable.name}</p>
                  <div className="flex gap-4 text-xs text-muted">
                    <span>Needed: {quantityNeeded} {consumable.unit}</span>
                    {quantityUsed != null && <span>Used: {quantityUsed} {consumable.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pyro */}
        {event.pyros.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Pyro ({event.pyros.length})</h2>
            <div className="space-y-1">
              {event.pyros.map(({ pyro, quantityNeeded }) => (
                <Link key={pyro.id} href={`/pyro/${pyro.id}`} className="card flex items-center justify-between gap-3 py-2 px-3 hover:bg-foreground/5 transition-colors">
                  <div>
                    <p className="text-sm">{pyro.name} <span className="text-muted">x{quantityNeeded}</span></p>
                    <p className="text-xs text-muted">{pyro.category}</p>
                  </div>
                  <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Tanks */}
        {event.tanks.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Tanks ({event.tanks.length})</h2>
            <div className="space-y-1">
              {event.tanks.map(({ tank }) => (
                <Link key={tank.id} href={`/tanks/${tank.id}`} className="card flex items-center justify-between gap-3 py-2 px-3 hover:bg-foreground/5 transition-colors">
                  <div>
                    <p className="text-sm">{tank.name}</p>
                    <p className="text-xs text-muted">{COMPOUND_LABELS[tank.chemicalCompound] ?? tank.chemicalCompound} &middot; {tank.unit}</p>
                  </div>
                  <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
                </Link>
              ))}
            </div>
          </section>
        )}

      </main>
    </>
  )
}
