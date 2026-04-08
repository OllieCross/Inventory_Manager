'use client'

import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  Working: 'Working',
  Faulty: 'Faulty',
  InRepair: 'In Repair',
  Retired: 'Retired',
  Lost: 'Lost',
  RentedToFriend: 'Rented to Friend',
}

const STATUS_COLORS: Record<string, string> = {
  Working: 'text-green-400',
  Faulty: 'text-red-400',
  InRepair: 'text-yellow-400',
  Retired: 'text-muted',
  Lost: 'text-red-600',
  RentedToFriend: 'text-blue-400',
}

type Device = {
  id: string
  name: string
  status: string
  qrCode: string
  case: { id: string; name: string } | null
  _count: { images: number; documents: number; logbook: number }
}

type Props = {
  devices: Device[]
  canEdit: boolean
}

export default function DeviceList({ devices, canEdit }: Props) {
  if (devices.length === 0) {
    return <p className="text-muted text-sm">No devices yet.</p>
  }

  return (
    <div className="space-y-2">
      {devices.map((d) => {
        const borderColor = d.status === 'Faulty' || d.status === 'Lost' ? 'border-l-red-600' : d.status === 'InRepair' ? 'border-l-yellow-500' : d.status === 'Working' ? 'border-l-green-600' : 'border-l-transparent'
        return (
        <div key={d.id} className={`card flex items-center justify-between gap-4 border-l-[3px] ${borderColor}`}>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{d.name}</p>
            <p className="text-xs mt-0.5">
              <span className={STATUS_COLORS[d.status] ?? 'text-muted'}>{STATUS_LABELS[d.status] ?? d.status}</span>
              <span className="text-muted"> &middot; {d._count.images} photos &middot; {d._count.documents} docs &middot; {d._count.logbook} log entries</span>
            </p>
            {d.case && (
              <p className="text-muted text-xs mt-0.5">In: {d.case.name}</p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 w-32 shrink-0">
            <Link href={`/devices/${d.id}`} className="text-muted hover:text-foreground text-xs transition-colors">
              View
            </Link>
            {canEdit && (
              <Link href={`/devices/${d.id}/edit`} className="btn-primary text-xs py-1.5 px-3">
                Edit
              </Link>
            )}
          </div>
        </div>
        )
      })}
    </div>
  )
}
