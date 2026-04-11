'use client'

import Link from 'next/link'

type Consumable = {
  id: string; name: string; unit: string; stockQuantity: number
  warningThreshold: number | null; criticalThreshold: number | null; notes: string | null
}
type Tank = {
  id: string; name: string; chemicalCompound: string; unit: string
  fullCapacity: number; currentCapacity: number; notes: string | null
}
type Pyro = {
  id: string; name: string; brand: string | null; category: string
  stockQuantity: number; warningThreshold: number | null; criticalThreshold: number | null
}

type Props = {
  consumables: Consumable[]
  tanks: Tank[]
  pyros: Pyro[]
}

const COMPOUND_LABELS: Record<string, string> = {
  H2O: 'H\u2082O', O2: 'O\u2082', CO2: 'CO\u2082',
  C4H10C3H8: 'Butane/Propane', N2: 'N\u2082', H2: 'H\u2082', LN2: 'LN\u2082', Other: 'Other',
}

export default function ShoppingPageClient({ consumables, tanks, pyros }: Props) {
  const criticalConsumables = consumables.filter(
    (c) => c.criticalThreshold != null && c.stockQuantity <= c.criticalThreshold!
  )
  const warningConsumables = consumables.filter(
    (c) =>
      c.warningThreshold != null &&
      c.stockQuantity <= c.warningThreshold! &&
      (c.criticalThreshold == null || c.stockQuantity > c.criticalThreshold!)
  )

  const lowTanks = tanks.filter((t) =>
    t.fullCapacity > 0 && (t.currentCapacity / t.fullCapacity) < 0.5
  )

  const criticalPyros = pyros.filter(
    (p) => p.criticalThreshold != null && p.stockQuantity <= p.criticalThreshold!
  )
  const warningPyros = pyros.filter(
    (p) =>
      p.warningThreshold != null &&
      p.stockQuantity <= p.warningThreshold! &&
      (p.criticalThreshold == null || p.stockQuantity > p.criticalThreshold!)
  )

  const total = criticalConsumables.length + warningConsumables.length + lowTanks.length + criticalPyros.length + warningPyros.length

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Shopping List</h1>
        <p className="text-muted text-sm mt-1">
          {total === 0
            ? 'Everything is well stocked.'
            : `${total} item${total === 1 ? '' : 's'} need${total === 1 ? 's' : ''} restocking`}
        </p>
      </div>

      {/* Consumables */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
          Consumables{' '}
          <span className="bg-foreground/10 text-foreground/70 text-xs font-semibold rounded-full px-2 py-0.5 normal-case">
            {criticalConsumables.length + warningConsumables.length}
          </span>
        </h2>
        {criticalConsumables.length === 0 && warningConsumables.length === 0 ? (
          <p className="text-muted text-sm">All consumables are well stocked.</p>
        ) : (
          <div className="space-y-2">
            {criticalConsumables.map((c) => (
              <Link
                key={c.id}
                href={`/consumables/${c.id}/edit`}
                className="card flex items-center justify-between gap-4 hover:bg-foreground/5 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-400 text-xs font-bold">!</span>
                    <p className="font-medium text-sm break-words">{c.name}</p>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {c.stockQuantity} {c.unit} - critical at {c.criticalThreshold} {c.unit}
                  </p>
                </div>
                <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
              </Link>
            ))}
            {warningConsumables.map((c) => (
              <Link
                key={c.id}
                href={`/consumables/${c.id}/edit`}
                className="card flex items-center justify-between gap-4 hover:bg-foreground/5 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-400 text-xs font-bold">!</span>
                    <p className="font-medium text-sm break-words">{c.name}</p>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {c.stockQuantity} {c.unit} - warning at {c.warningThreshold} {c.unit}
                  </p>
                </div>
                <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Low Tanks */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
          Tanks{' '}
          <span className="bg-foreground/10 text-foreground/70 text-xs font-semibold rounded-full px-2 py-0.5 normal-case">
            {lowTanks.length}
          </span>
        </h2>
        {lowTanks.length === 0 ? (
          <p className="text-muted text-sm">All tanks are above 50% capacity.</p>
        ) : (
          <div className="space-y-2">
            {lowTanks.map((tank) => {
              const fillPct = Math.round((tank.currentCapacity / tank.fullCapacity) * 100)
              const fillColor = fillPct >= 30 ? 'bg-yellow-400' : 'bg-red-500'
              return (
                <Link
                  key={tank.id}
                  href={`/tanks/${tank.id}`}
                  className="card flex items-center justify-between gap-4 hover:bg-foreground/5 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm break-words">{tank.name}</p>
                      <span className="text-xs text-muted shrink-0">
                        {COMPOUND_LABELS[tank.chemicalCompound] ?? tank.chemicalCompound}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${fillColor}`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold shrink-0">
                        {fillPct}%{' '}
                        <span className="font-normal text-muted">
                          ({tank.currentCapacity} / {tank.fullCapacity} {tank.unit})
                        </span>
                      </span>
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
          Pyro{' '}
          <span className="bg-foreground/10 text-foreground/70 text-xs font-semibold rounded-full px-2 py-0.5 normal-case">
            {criticalPyros.length + warningPyros.length}
          </span>
        </h2>
        {criticalPyros.length === 0 && warningPyros.length === 0 ? (
          <p className="text-muted text-sm">All pyro effects are well stocked.</p>
        ) : (
          <div className="space-y-2">
            {criticalPyros.map((p) => (
              <Link
                key={p.id}
                href={`/pyro/${p.id}`}
                className="card flex items-center justify-between gap-4 hover:bg-foreground/5 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-400 text-xs font-bold">!</span>
                    <p className="font-medium text-sm break-words">{p.name}</p>
                    <span className="text-xs text-muted shrink-0">
                      {p.category}{p.brand ? ` - ${p.brand}` : ''}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {p.stockQuantity} units - critical at {p.criticalThreshold} units
                  </p>
                </div>
                <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
              </Link>
            ))}
            {warningPyros.map((p) => (
              <Link
                key={p.id}
                href={`/pyro/${p.id}`}
                className="card flex items-center justify-between gap-4 hover:bg-foreground/5 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-400 text-xs font-bold">!</span>
                    <p className="font-medium text-sm break-words">{p.name}</p>
                    <span className="text-xs text-muted shrink-0">
                      {p.category}{p.brand ? ` - ${p.brand}` : ''}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {p.stockQuantity} units - warning at {p.warningThreshold} units
                  </p>
                </div>
                <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
