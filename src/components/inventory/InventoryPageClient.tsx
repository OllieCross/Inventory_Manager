'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import QRGenerator from '@/components/editor/QRGenerator'

const STATUS_LABELS: Record<string, string> = {
  Working: 'Working', Faulty: 'Faulty', InRepair: 'In Repair',
  Retired: 'Retired', Lost: 'Lost', RentedToFriend: 'Rented',
}
const STATUS_COLORS: Record<string, string> = {
  Working: 'text-green-400', Faulty: 'text-red-400', InRepair: 'text-yellow-400',
  Retired: 'text-muted', Lost: 'text-foreground', RentedToFriend: 'text-blue-400',
}

type CaseItem = { name: string }
type Case = {
  id: string; name: string; items: CaseItem[]
  _count: { items: number; devices: number }
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
type Tank = {
  id: string; name: string; chemicalCompound: string; unit: string
  fullCapacity: number; currentCapacity: number; notes: string | null
}
type Pyro = {
  id: string; name: string; brand: string | null; category: string
  stockQuantity: number; warningThreshold: number | null; criticalThreshold: number | null
}

type Props = {
  cases: Case[]
  devices: Device[]
  consumables: Consumable[]
  standaloneItems: StandaloneItem[]
  tanks: Tank[]
  pyros: Pyro[]
  canEdit: boolean
  isAdmin: boolean
}

const COMPOUND_LABELS: Record<string, string> = {
  H2O: 'H\u2082O', O2: 'O\u2082', CO2: 'CO\u2082',
  C4H10C3H8: 'Butane/Propane', N2: 'N\u2082', H2: 'H\u2082', LN2: 'LN\u2082', Other: 'Other',
}

const FAB_ITEMS = [
  { href: '/editor/new', label: '+ Case' },
  { href: '/items/new', label: '+ Item' },
  { href: '/devices/new', label: '+ Device' },
  { href: '/consumables/new', label: '+ Consumable' },
  { href: '/tanks/new', label: '+ Tank' },
  { href: '/pyro/new', label: '+ Pyro' },
]

export default function InventoryPageClient({ cases, devices, consumables, standaloneItems, tanks, pyros, canEdit }: Props) {
  const [query, setQuery] = useState('')
  const [fabOpen, setFabOpen] = useState(false)
  const fabRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setFabOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])
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
    q
      ? devices.filter((d) => d.name.toLowerCase().includes(q))
      : devices.filter((d) => d.case === null),
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
  const filteredTanks = useMemo(() =>
    q ? tanks.filter((t) => t.name.toLowerCase().includes(q)) : tanks,
    [tanks, q]
  )
  const filteredPyros = useMemo(() =>
    q ? pyros.filter((p) => p.name.toLowerCase().includes(q) || (p.brand ?? '').toLowerCase().includes(q)) : pyros,
    [pyros, q]
  )

  const totalResults = filteredCases.length + filteredDevices.length + filteredConsumables.length + filteredItems.length + filteredTanks.length + filteredPyros.length

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">Inventory</h1>
      <div className="flex items-center justify-between">
        <Link
          href="/issues"
          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Issues
        </Link>
        <QRGenerator />
      </div>

      {/* FAB is fixed-position below */}

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
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
          Cases <span className="bg-foreground/10 text-foreground/70 text-xs font-semibold rounded-full px-2 py-0.5 normal-case">{filteredCases.length}</span>
        </h2>
        {filteredCases.length === 0 ? (
          <p className="text-muted text-sm">{q ? 'No cases match.' : 'No cases yet.'}</p>
        ) : (
          <div className="space-y-2">
            {filteredCases.map((c) => (
              <Link key={c.id} href={`/case/${c.id}`} className="card flex items-center justify-between gap-4 hover:bg-foreground/5 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm break-words">{c.name}</p>
                  <p className="text-muted text-xs mt-0.5">
                    {[
                      c._count.items > 0 && `${c._count.items} item${c._count.items !== 1 ? 's' : ''}`,
                      c._count.devices > 0 && `${c._count.devices} device${c._count.devices !== 1 ? 's' : ''}`,
                    ].filter(Boolean).join(' · ') || 'Empty'}
                  </p>
                  {c.matchedItems.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {c.matchedItems.map((n) => (
                        <li key={n} className="text-brand/70 text-xs">{n}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Devices outside Cases */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
          Devices <span className="bg-foreground/10 text-foreground/70 text-xs font-semibold rounded-full px-2 py-0.5 normal-case">{filteredDevices.length}</span>
        </h2>
        {filteredDevices.length === 0 ? (
          <p className="text-muted text-sm">{q ? 'No devices match.' : 'No devices outside cases yet.'}</p>
        ) : (
          <div className="space-y-2">
            {filteredDevices.map((d) => {
              const borderColor = d.status === 'Faulty' ? 'border-l-red-500' : d.status === 'InRepair' ? 'border-l-yellow-500' : d.status === 'Working' ? 'border-l-green-600' : d.status === 'Lost' ? 'border-l-foreground' : d.status === 'Retired' ? 'border-l-gray-500' : d.status === 'RentedToFriend' ? 'border-l-blue-400' : 'border-l-transparent'
              return (
                <Link key={d.id} href={`/devices/${d.id}`} className={`card flex items-center justify-between gap-4 border-l-[3px] ${borderColor} hover:bg-foreground/5 transition-colors`}>
                  <div className="min-w-0">
                    <p className="font-medium text-sm break-words">{d.name}</p>
                    <p className="text-xs mt-0.5">
                      <span className={STATUS_COLORS[d.status] ?? 'text-muted'}>{STATUS_LABELS[d.status] ?? d.status}</span>
                      <span className="text-muted"> &middot; {d._count.images} photos &middot; {d._count.documents} docs &middot; {d._count.logbook} log entries</span>
                    </p>
                    {q && d.case && <p className="text-muted text-xs mt-0.5">In: {d.case.name}</p>}
                  </div>
                  <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Items outside Cases */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
          Items <span className="bg-foreground/10 text-foreground/70 text-xs font-semibold rounded-full px-2 py-0.5 normal-case">{filteredItems.length}</span>
        </h2>
        {filteredItems.length === 0 ? (
          <p className="text-muted text-sm">{q ? 'No items match.' : 'No items outside cases yet.'}</p>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <Link key={item.id} href={`/items/${item.id}/edit`} className="card flex items-center justify-between gap-3 hover:bg-foreground/5 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm break-words">{item.name}</p>
                  <p className="text-xs text-muted">
                    Qty: {item.quantity}{item.comment ? ` - ${item.comment}` : ''}
                  </p>
                </div>
                <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Consumables */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
          Consumables <span className="bg-foreground/10 text-foreground/70 text-xs font-semibold rounded-full px-2 py-0.5 normal-case">{filteredConsumables.length}</span>
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
              let fill = 0
              if (c.stockQuantity <= 0) {
                fill = 0
              } else if (hasWarning && c.warningThreshold! > 0) {
                const wt = c.warningThreshold!
                const ct = hasCritical ? c.criticalThreshold! : 0
                if (c.stockQuantity >= wt * 2) fill = 1
                else if (c.stockQuantity >= wt * 1.5) fill = 0.75
                else if (c.stockQuantity >= wt) fill = 0.5
                else if (hasCritical && c.stockQuantity >= ct) fill = 0.25
                else fill = 0
              } else if (hasCritical && c.criticalThreshold! > 0) {
                fill = c.stockQuantity >= c.criticalThreshold! ? 0.25 : 0
              } else {
                fill = 0.5
              }
              return (
                <Link key={c.id} href={`/consumables/${c.id}/edit`} className="card flex items-center justify-between gap-4 hover:bg-foreground/5 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {isCritical && <span className="text-red-400 text-xs font-bold">!</span>}
                      <p className="font-medium text-sm break-words">{c.name}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${fill * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold shrink-0">{c.stockQuantity} <span className="font-normal text-muted">{c.unit}</span></span>
                    </div>
                  </div>
                  <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Tanks */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
          Tanks <span className="bg-foreground/10 text-foreground/70 text-xs font-semibold rounded-full px-2 py-0.5 normal-case">{filteredTanks.length}</span>
        </h2>
        {filteredTanks.length === 0 ? (
          <p className="text-muted text-sm">{q ? 'No tanks match.' : 'No tanks yet.'}</p>
        ) : (
          <div className="space-y-2">
            {filteredTanks.map((tank) => {
              const fillPct = tank.fullCapacity > 0
                ? Math.min(100, Math.round((tank.currentCapacity / tank.fullCapacity) * 100))
                : 0
              const fillColor = fillPct >= 60 ? 'bg-green-500' : fillPct >= 30 ? 'bg-yellow-400' : 'bg-red-500'
              return (
                <Link key={tank.id} href={`/tanks/${tank.id}`} className="card flex items-center justify-between gap-4 hover:bg-foreground/5 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm break-words">{tank.name}</p>
                      <span className="text-xs text-muted shrink-0">{COMPOUND_LABELS[tank.chemicalCompound] ?? tank.chemicalCompound}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${fillColor}`} style={{ width: `${fillPct}%` }} />
                      </div>
                      <span className="text-sm font-semibold shrink-0">{tank.currentCapacity} <span className="font-normal text-muted">/ {tank.fullCapacity} {tank.unit}</span></span>
                    </div>
                  </div>
                  <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Pyro */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
          Pyro <span className="bg-foreground/10 text-foreground/70 text-xs font-semibold rounded-full px-2 py-0.5 normal-case">{filteredPyros.length}</span>
        </h2>
        {filteredPyros.length === 0 ? (
          <p className="text-muted text-sm">{q ? 'No pyro effects match.' : 'No pyro effects yet.'}</p>
        ) : (
          <div className="space-y-2">
            {filteredPyros.map((p) => {
              const hasCritical = p.criticalThreshold != null
              const hasWarning = p.warningThreshold != null
              const isCritical = hasCritical && p.stockQuantity <= p.criticalThreshold!
              const isWarning = hasWarning && !isCritical && p.stockQuantity <= p.warningThreshold!
              const barColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-400' : (hasWarning || hasCritical) ? 'bg-green-500' : 'bg-foreground/20'
              let fill = 0
              if (p.stockQuantity <= 0) {
                fill = 0
              } else if (hasWarning && p.warningThreshold! > 0) {
                const wt = p.warningThreshold!
                const ct = hasCritical ? p.criticalThreshold! : 0
                if (p.stockQuantity >= wt * 2) fill = 1
                else if (p.stockQuantity >= wt * 1.5) fill = 0.75
                else if (p.stockQuantity >= wt) fill = 0.5
                else if (hasCritical && p.stockQuantity >= ct) fill = 0.25
                else fill = 0
              } else if (hasCritical && p.criticalThreshold! > 0) {
                fill = p.stockQuantity >= p.criticalThreshold! ? 0.25 : 0
              } else {
                fill = 0.5
              }
              return (
                <Link key={p.id} href={`/pyro/${p.id}`} className="card flex items-center justify-between gap-4 hover:bg-foreground/5 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {isCritical && <span className="text-red-400 text-xs font-bold">!</span>}
                      <p className="font-medium text-sm break-words">{p.name}</p>
                      <span className="text-xs text-muted shrink-0">{p.category}{p.brand ? ` - ${p.brand}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${fill * 100}%` }} />
                      </div>
                      <span className="text-sm font-semibold shrink-0">{p.stockQuantity} <span className="font-normal text-muted">units</span></span>
                    </div>
                  </div>
                  <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* FAB speed-dial */}
      {canEdit && (
        <div ref={fabRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          {fabOpen && (
            <div className="flex flex-col items-end gap-1.5 mb-1">
              {FAB_ITEMS.map(({ href, label }, i) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setFabOpen(false)}
                  className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium px-4 py-2 rounded-xl shadow-xl whitespace-nowrap"
                  style={{
                    animation: `fabIn 180ms ease both`,
                    animationDelay: `${i * 30}ms`,
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
          <button
            onClick={() => setFabOpen(v => !v)}
            className="w-14 h-14 rounded-full bg-brand text-white shadow-lg flex items-center justify-center hover:bg-brand/90 active:scale-95 transition-all"
            aria-label={fabOpen ? 'Close menu' : 'Add item'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}>
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      )}
    </main>
  )
}
