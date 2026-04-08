'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'

type RecycledItem = {
  id: string
  label: string
  parentName?: string
  deletedAt: string
  deletedAtRaw: string
}

type Props = {
  cases: RecycledItem[]
  devices: RecycledItem[]
  items: RecycledItem[]
  consumables: RecycledItem[]
  images: RecycledItem[]
  documents: RecycledItem[]
  deviceImages: RecycledItem[]
  deviceDocuments: RecycledItem[]
}

const EXPIRY_DAYS = 7

function daysLeft(deletedAtRaw: string): number {
  const deletedAt = new Date(deletedAtRaw)
  const expiresAt = new Date(deletedAt.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
}

function Section({
  title,
  items,
  entityType,
  onRestore,
}: {
  title: string
  items: RecycledItem[]
  entityType: string
  onRestore: (entityType: string, id: string) => Promise<void>
}) {
  if (items.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">{title} ({items.length})</h2>
      <div className="card divide-y divide-foreground/10 p-0 overflow-hidden">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.label}</p>
              <p className="text-xs text-muted">
                {item.parentName && <span>{item.parentName} &middot; </span>}
                Deleted {item.deletedAt} &middot; {daysLeft(item.deletedAtRaw)}d until permanent
              </p>
            </div>
            <RestoreButton entityType={entityType} id={item.id} onRestore={onRestore} />
          </div>
        ))}
      </div>
    </section>
  )
}

function RestoreButton({
  entityType,
  id,
  onRestore,
}: {
  entityType: string
  id: string
  onRestore: (entityType: string, id: string) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  return (
    <button
      className="text-xs text-brand hover:underline shrink-0 disabled:opacity-50"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        await onRestore(entityType, id)
        setLoading(false)
      }}
    >
      {loading ? 'Restoring...' : 'Restore'}
    </button>
  )
}

export default function RecycleBinClient(props: Props) {
  const router = useRouter()
  const [purging, setPurging] = useState(false)
  const [confirmPurge, setConfirmPurge] = useState(false)
  const [error, setError] = useState('')

  async function handleRestore(entityType: string, id: string) {
    setError('')
    const res = await fetch(`/api/admin/recycle-bin/${entityType}/${id}/restore`, { method: 'POST' })
    if (!res.ok) {
      setError('Failed to restore item')
      return
    }
    router.refresh()
  }

  async function handlePurge() {
    setConfirmPurge(false)
    setPurging(true)
    setError('')
    const res = await fetch('/api/admin/recycle-bin', { method: 'POST' })
    if (!res.ok) setError('Failed to purge expired items')
    setPurging(false)
    router.refresh()
  }

  const totalItems = props.cases.length + props.devices.length + props.items.length +
    props.consumables.length + props.images.length + props.documents.length +
    props.deviceImages.length + props.deviceDocuments.length

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-16">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Recycle Bin</h1>
          <p className="text-sm text-muted mt-0.5">Items are permanently deleted after {EXPIRY_DAYS} days.</p>
        </div>
        <button
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          onClick={() => setConfirmPurge(true)}
          disabled={purging}
        >
          {purging ? 'Emptying...' : 'Empty Recycle Bin'}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {confirmPurge && (
        <ConfirmModal
          title="Purge expired items"
          message={`This will permanently delete all expired items. This cannot be undone.`}
          confirmLabel="Purge"
          onConfirm={handlePurge}
          onCancel={() => setConfirmPurge(false)}
        />
      )}

      {totalItems === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 gap-3 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/50">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          <div>
            <p className="text-sm font-medium">Nothing here</p>
            <p className="text-xs text-muted mt-0.5">Deleted items will appear for 30 days before expiring.</p>
          </div>
        </div>
      ) : (
        <>
          <Section title="Cases" items={props.cases} entityType="case" onRestore={handleRestore} />
          <Section title="Devices" items={props.devices} entityType="device" onRestore={handleRestore} />
          <Section title="Items" items={props.items} entityType="item" onRestore={handleRestore} />
          <Section title="Consumables" items={props.consumables} entityType="consumable" onRestore={handleRestore} />
          <Section title="Case Photos" items={props.images} entityType="image" onRestore={handleRestore} />
          <Section title="Case Documents" items={props.documents} entityType="document" onRestore={handleRestore} />
          <Section title="Device Photos" items={props.deviceImages} entityType="deviceImage" onRestore={handleRestore} />
          <Section title="Device Documents" items={props.deviceDocuments} entityType="deviceDocument" onRestore={handleRestore} />
        </>
      )}
    </main>
  )
}
