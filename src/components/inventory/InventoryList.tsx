'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import DeleteCaseButton from '@/components/editor/DeleteCaseButton'

type Item = { name: string }

type Case = {
  id: string
  name: string
  items: Item[]
  _count: { items: number; images: number; documents: number }
  createdBy: { name: string }
}

type Props = {
  cases: Case[]
  canEdit: boolean
}

export default function InventoryList({ cases, canEdit }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cases.map((c) => ({ ...c, matchedItems: [] as string[] }))

    return cases
      .map((c) => {
        const nameMatch = c.name.toLowerCase().includes(q)
        const matchedItems = c.items
          .filter((item) => item.name.toLowerCase().includes(q))
          .map((item) => item.name)
        if (nameMatch || matchedItems.length > 0) {
          return { ...c, matchedItems }
        }
        return null
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
  }, [cases, query])

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search by case or item name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input-field w-full"
      />

      {query && (
        <p className="text-muted text-xs">
          {filtered.length === 0
            ? 'No cases match your search.'
            : `${filtered.length} case${filtered.length === 1 ? '' : 's'} found`}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.name}</p>
                <p className="text-muted text-xs mt-0.5">
                  {[
                    c._count.items > 0 && `${c._count.items} items`,
                    c._count.images > 0 && `${c._count.images} photos`,
                    c._count.documents > 0 && `${c._count.documents} docs`,
                    `by ${c.createdBy.name}`,
                  ].filter(Boolean).join(' · ')}
                </p>
                {c.matchedItems.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {c.matchedItems.map((name) => (
                      <li key={name} className="text-brand/70 text-xs">{name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 w-32 shrink-0">
                <Link
                  href={`/case/${c.id}`}
                  className="text-muted hover:text-foreground text-xs transition-colors"
                >
                  View
                </Link>
                {canEdit && (
                  <Link
                    href={`/editor/${c.id}`}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Edit
                  </Link>
                )}
                {canEdit && <DeleteCaseButton caseId={c.id} caseName={c.name} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
