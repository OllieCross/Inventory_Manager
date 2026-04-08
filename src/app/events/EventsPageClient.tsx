'use client'

import { useState } from 'react'
import Link from 'next/link'

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

type EventRow = {
  id: string
  name: string
  venueName: string
  location: string | null
  startDate: string
  status: string
  invoiceStatus: string
  stagehands: { userId: string; userName: string }[]
}

type Props = {
  events: EventRow[]
  canEdit: boolean
  userId: string
  todayISO: string
  tomorrowISO: string
}

function formatStartDateTime(iso: string) {
  const d = new Date(iso)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${day}/${month}/${year} at ${time}`
}

type FilterOption = 'all' | 'upcoming' | 'completed'

export default function EventsPageClient({ events, canEdit, userId, todayISO, tomorrowISO }: Props) {
  const todayStart = new Date(todayISO).getTime()
  const tomorrowEnd = new Date(tomorrowISO).getTime()
  const [filter, setFilter] = useState<FilterOption>('all')

  function isHighlighted(event: EventRow) {
    const start = new Date(event.startDate).getTime()
    const isUserCrew = event.stagehands.some((s) => s.userId === userId)
    const isTodayOrTomorrow = start >= todayStart && start < tomorrowEnd
    return isUserCrew && isTodayOrTomorrow
  }

  const filtered = events.filter((e) => {
    if (filter === 'upcoming') return e.status === 'Planned' || e.status === 'Confirmed'
    if (filter === 'completed') return e.status === 'Completed' || e.status === 'Cancelled'
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const aH = isHighlighted(a) ? 0 : 1
    const bH = isHighlighted(b) ? 0 : 1
    return aH - bH
  })

  const FILTERS: { key: FilterOption; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
  ]

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-1.5">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === key ? 'bg-brand text-white' : 'text-muted hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
      {sorted.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 gap-3 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/50">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <div>
            <p className="text-sm font-medium">{filter === 'all' ? 'No events yet' : `No ${filter} events`}</p>
            <p className="text-xs text-muted mt-0.5">{filter === 'all' ? 'Create your first event with the + button.' : 'Try switching to a different filter.'}</p>
          </div>
        </div>
      ) : sorted.map((event) => {
        const highlighted = isHighlighted(event)
        return (
          <div
            key={event.id}
            className={`card relative space-y-2 ${highlighted ? 'ring-2 ring-green-500' : ''}`}
            style={highlighted ? {
              boxShadow: '0 0 14px 3px rgba(22,163,74,0.25)',
              transform: 'translateY(-1px)',
            } : undefined}
          >
            {/* Full-card tap target */}
            <Link href={`/events/${event.id}`} className="absolute inset-0 rounded-xl" aria-label={`View ${event.name}`} />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{event.name}</p>
                <p className="text-sm text-muted truncate">{event.venueName}{event.location ? ` - ${event.location}` : ''}</p>
              </div>
              {canEdit && (
                <Link href={`/events/${event.id}/edit`} className="relative z-10 btn-ghost text-sm px-3 py-1.5">Edit</Link>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs flex-wrap">
              <span className="text-muted">{formatStartDateTime(event.startDate)}</span>
              <span className={STATUS_COLORS[event.status] ?? 'text-muted'}>
                {EVENT_STATUS_LABELS[event.status] ?? event.status}
              </span>
              <span className={INVOICE_COLORS[event.invoiceStatus] ?? 'text-muted'}>
                {INVOICE_LABELS[event.invoiceStatus] ?? event.invoiceStatus}
              </span>
            </div>

            {event.stagehands.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {event.stagehands.map((s) => (
                  <span
                    key={s.userId}
                    className="text-xs bg-foreground/10 text-foreground/80 px-2 py-0.5 rounded-full"
                  >
                    {s.userName}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
      </div>
    </div>
  )
}
