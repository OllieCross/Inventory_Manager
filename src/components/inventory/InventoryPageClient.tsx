'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import QRGenerator from '@/components/editor/QRGenerator'

const STATUS_LABELS: Record<string, string> = {
  Working: 'Working', Faulty: 'Faulty', InRepair: 'In Repair',
  Retired: 'Retired', Lost: 'Lost', RentedToFriend: 'Rented to Friend',
}
const STATUS_COLORS: Record<string, string> = {
  Working: 'text-green-400', Faulty: 'text-red-400', InRepair: 'text-yellow-400',
  Retired: 'text-muted', Lost: 'text-red-600', RentedToFriend: 'text-blue-400',
}

type CaseItem = { name: string }
type Case = {
  id: string; name: string; items: CaseItem[]
  _count: { items: number; images: number; documents: number }
  createdBy: { name: string }
}
type Device = {
  id: string; name: string; status: string; qrCode: string
  case: { id: string; name: string } | null
  _count: { images: number; documents: number; logbook: number }
}
type Consumable = {
  id: string; name: string; unit: string; stockQuantity: number
  warningThreshold: number | null; criticalThreshold: number | null; notes: string | null
}
type StandaloneItem = { id: string; name: string; quantity: number; comment: string | null }

type Props = {
  cases: Case[]
  devices: Device[]
  consumables: Consumable[]
  standaloneItems: StandaloneItem[]
  canEdit: boolean
  isAdmin: boolean
}

export default function InventoryPageClient({ cases, devices, consumables, standaloneItems, canEdit }: Props) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const filteredCases = useMemo(() => {
    if (!q) return cases.map((c) => ({ ...c, matchedItems: [] as string[] }))
    return cases
      .map((c) => {
        const nameMatch = c.name.toLowerCase().includes(q)
        const matchedItems = c.items.filter((i) => i.name.toLowerCase().includes(q)).map((i) => i.name)
        if (nameMatch || matchedItems.length > 0) return { ...c, matchedItems }
        return null
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
  }, [cases, q])

  const filteredDevices = useMemo(() =>
    q ? devices.filter((d) => d.name.toLowerCase().includes(q)) : devices,
    [devices, q]
  )
  const filteredConsumables = useMemo(() =>
    q ? consumables.filter((c) => c.name.toLowerCase().includes(q)) : consumables,
    [consumables, q]
  )
  const filteredItems = useMemo(() =>
    q ? standaloneItems.filter((i) => i.name.toLowerCase().includes(q)) : standaloneItems,
    [standaloneItems, q]
  )

  const totalResults = filteredCases.length + filteredDevices.length + filteredConsumables.length + filteredItems.length

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Inventory</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/issues"
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium px-3 py-1.5 rounded-lg text-sm transition-colors"
          >
            Issues
          </Link>
          <QRGenerator />
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/editor/new" className="btn-primary text-sm">+ Case</Link>
          <Link href="/items/new" className="btn-primary text-sm">+ Item</Link>
          <Link href="/devices/new" className="btn-primary text-sm">+ Device</Link>
          <Link href="/consumables/new" className="btn-primary text-sm">+ Consumable</Link>
        </div>
      )}

      <input
        type="search"
        placeholder="Search all inventory..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input-field w-full"
      />
      {q && (
        <p className="text-muted text-xs -mt-3">
          {totalResults === 0 ? 'No results.' : `${totalResults} result${totalResults === 1 ? '' : 's'} found`}
        </p>
      )}

      {/* Cases */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Cases <span className="normal-case font-normal">({filteredCases.length})</span>
        </h2>
        {filteredCases.length === 0 ? (
          <p className="text-muted text-sm">{q ? 'No cases match.' : 'No cases yet.'}</p>
        ) : (
          <div className="space-y-2">
            {filteredCases.map((c) => (
              <div key={c.id} className="card flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <p className="text-muted text-xs mt-0.5">
                    {c._count.items} items &middot; {c._count.images} photos &middot; {c._count.documents} docs
                    &middot; by {c.createdBy.name}
                  </p>
                  {c.matchedItems.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {c.matchedItems.map((n) => (
                        <li key={n} className="text-brand/70 text-xs">{n}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="shrink-0">
                  <Link href={`/case/${c.id}`} className="btn-primary text-xs py-1.5 px-3">View</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Devices outside Cases */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Devices <span className="normal-case font-normal">({filteredDevices.length})</span>
        </h2>
        {filteredDevices.length === 0 ? (
          <p className="text-muted text-sm">{q ? 'No devices match.' : 'No devices outside cases yet.'}</p>
        ) : (
          <div className="space-y-2">
            {filteredDevices.map((d) => (
              <div key={d.id} className="card flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{d.name}</p>
                  <p className="text-xs mt-0.5">
                    <span className={STATUS_COLORS[d.status] ?? 'text-muted'}>{STATUS_LABELS[d.status] ?? d.status}</span>
                    <span className="text-muted"> &middot; {d._count.images} photos &middot; {d._count.documents} docs &middot; {d._count.logbook} log entries</span>
                  </p>
                  {d.case && <p className="text-muted text-xs mt-0.5">In: {d.case.name}</p>}
                </div>
                <div className="shrink-0">
                  <Link href={`/devices/${d.id}`} className="btn-primary text-xs py-1.5 px-3">View</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Consumables */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Consumables <span className="normal-case font-normal">({filteredConsumables.length})</span>
        </h2>
        {filteredConsumables.length === 0 ? (
          <p className="text-muted text-sm">{q ? 'No consumables match.' : 'No consumables yet.'}</p>
        ) : (
          <div className="space-y-2">
            {filteredConsumables.map((c) => {
              const hasCritical = c.criticalThreshold != null
              const hasWarning = c.warningThreshold != null
              const isCritical = hasCritical && c.stockQuantity <= c.criticalThreshold!
              const isWarning = hasWarning && !isCritical && c.stockQuantity <= c.warningThreshold!
              const barColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-400' : (hasWarning || hasCritical) ? 'bg-green-500' : 'bg-foreground/20'
              // Fill is capped at a sensible max: warning threshold * 4, or stock * 2, min 1
              const cap = Math.max(
                c.warningThreshold != null ? c.warningThreshold * 4 : 0,
                c.criticalThreshold != null ? c.criticalThreshold * 8 : 0,
                c.stockQuantity * 1.5,
                1
              )
              const fill = Math.min(c.stockQuantity / cap, 1)
              return (
                <div key={c.id} className="card flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {isCritical && <span className="text-red-400 text-xs font-bold">!</span>}
                      <p className="font-medium text-sm truncate">{c.name}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${fill * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted shrink-0">{c.stockQuantity} {c.unit}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Link href={`/consumables/${c.id}/edit`} className="btn-primary text-xs py-1.5 px-3">View</Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Items outside Cases */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Items <span className="normal-case font-normal">({filteredItems.length})</span>
        </h2>
        {filteredItems.length === 0 ? (
          <p className="text-muted text-sm">{q ? 'No items match.' : 'No items outside cases yet.'}</p>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <div key={item.id} className="card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted">
                    Qty: {item.quantity}{item.comment ? ` - ${item.comment}` : ''}
                  </p>
                </div>
                <div className="shrink-0">
                  <Link href={`/items/${item.id}/edit`} className="btn-primary text-xs py-1.5 px-3">View</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
