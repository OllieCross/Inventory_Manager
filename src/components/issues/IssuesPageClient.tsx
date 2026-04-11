'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'

type FaultyDevice = {
  id: string; name: string; status: string; statusLabel: string
  logbook: { id: string; comment: string; date: string; userName: string }[]
}
type ManualIssue = {
  id: string; description: string; createdAt: string; userName: string
  device: { id: string; name: string } | null
  case: { id: string; name: string } | null
  item: { id: string; name: string } | null
  tank: { id: string; name: string } | null
}
type EntityOption = { id: string; name: string }
type ItemOption = { id: string; name: string; caseId: string | null }

type Props = {
  faultyDevices: FaultyDevice[]
  manualIssues: ManualIssue[]
  allCases: EntityOption[]
  allItems: ItemOption[]
  allTanks: EntityOption[]
}

type EntityType = 'item' | 'item_in_case' | 'case' | 'tank' | 'other'

export default function IssuesPageClient({ faultyDevices, manualIssues: initialIssues, allCases, allItems, allTanks }: Props) {
  const router = useRouter()
  const [issues, setIssues] = useState<ManualIssue[]>(initialIssues)
  const [showForm, setShowForm] = useState(false)
  const [entityType, setEntityType] = useState<EntityType>('item')
  const [entityId, setEntityId] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const standaloneItems = allItems.filter(i => i.caseId === null)
  const caseItems = allItems.filter(i => i.caseId === selectedCaseId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (entityType !== 'other' && !entityId) { setError('Please select an entity'); return }
    if (entityType === 'item_in_case' && !selectedCaseId) { setError('Please select a case'); return }
    setError('')
    setSubmitting(true)
    try {
      const body: Record<string, string | boolean> = { description }
      if (entityType === 'case') body.caseId = entityId
      else if (entityType === 'item' || entityType === 'item_in_case') body.itemId = entityId
      else if (entityType === 'tank') body.tankId = entityId
      else body.isOther = true

      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(typeof data.error === 'string' ? data.error : 'Failed to report issue')
        return
      }
      const created = await res.json()
      const cd = new Date(created.createdAt)
      const createdAtFmt = `${cd.getDate().toString().padStart(2,'0')}/${(cd.getMonth()+1).toString().padStart(2,'0')}/${cd.getFullYear()}`
      setIssues((prev) => [{ id: created.id, description: created.description, createdAt: createdAtFmt, userName: created.user?.name ?? 'Deleted user', device: created.device, case: created.case, item: created.item, tank: created.tank ?? null }, ...prev])
      setShowForm(false)
      setDescription('')
      setEntityId('')
      setSelectedCaseId('')
      setEntityType('item')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/issues/${deleteTarget}`, { method: 'DELETE' })
      if (!res.ok) { setError('Failed to delete issue'); return }
      setIssues((prev) => prev.filter((i) => i.id !== deleteTarget))
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Issues</h1>
        <button
          className={showForm ? 'btn-ghost text-sm' : 'btn-primary text-sm'}
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? 'Cancel' : '+ Report Issue'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Report an Issue</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              className="input-field"
              value={entityType}
              onChange={e => { setEntityType(e.target.value as EntityType); setEntityId(''); setSelectedCaseId('') }}
            >
              <option value="item">Item</option>
              <option value="item_in_case">Item in a case</option>
              <option value="case">Case</option>
              <option value="tank">Tank</option>
              <option value="other">Other</option>
            </select>
          </div>

          {entityType === 'item' && (
            <div>
              <label className="block text-sm font-medium mb-1">Item</label>
              <select className="input-field" value={entityId} onChange={e => setEntityId(e.target.value)} required>
                <option value="">Select...</option>
                {standaloneItems.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          {entityType === 'item_in_case' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Case</label>
                <select className="input-field" value={selectedCaseId} onChange={e => { setSelectedCaseId(e.target.value); setEntityId('') }} required>
                  <option value="">Select case...</option>
                  {allCases.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {selectedCaseId && (
                <div>
                  <label className="block text-sm font-medium mb-1">Item</label>
                  <select className="input-field" value={entityId} onChange={e => setEntityId(e.target.value)} required>
                    <option value="">Select item...</option>
                    {caseItems.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {entityType === 'case' && (
            <div>
              <label className="block text-sm font-medium mb-1">Case</label>
              <select className="input-field" value={entityId} onChange={e => setEntityId(e.target.value)} required>
                <option value="">Select...</option>
                {allCases.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          {entityType === 'tank' && (
            <div>
              <label className="block text-sm font-medium mb-1">Tank</label>
              <select className="input-field" value={entityId} onChange={e => setEntityId(e.target.value)} required>
                <option value="">Select...</option>
                {allTanks.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the issue..."
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Issue'}
          </button>
        </form>
      )}

      {/* Faulty/In Repair Devices */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Devices ({faultyDevices.length})
        </h2>
        {faultyDevices.length === 0 ? (
          <p className="text-muted text-sm">No faulty or in-repair devices.</p>
        ) : (
          <div className="space-y-3">
            {faultyDevices.map(d => (
              <div key={d.id} className="card space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{d.name}</p>
                    <p className={`text-xs font-medium ${d.status === 'Faulty' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {d.statusLabel}
                    </p>
                  </div>
                  <Link href={`/devices/${d.id}`} className="text-xs text-brand hover:underline shrink-0">View</Link>
                </div>
                {d.logbook.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-foreground/10">
                    {d.logbook.map(e => (
                      <div key={e.id} className="text-xs text-muted">
                        <span className="text-foreground/70">{e.comment}</span>
                        <span> &middot; {e.date} &middot; {e.userName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Manual Issues */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Issues ({issues.length})
        </h2>
        {issues.length === 0 ? (
          <p className="text-muted text-sm card py-4 text-center">No manual issues reported. Use + Report Issue to log a problem.</p>
        ) : (
          <div className="space-y-2">
            {issues.map(i => {
              const entity = i.device ?? i.case ?? i.item ?? i.tank
              return (
                <div key={i.id} className="card space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm">{i.description}</p>
                    <button
                      onClick={() => setDeleteTarget(i.id)}
                      className="text-red-400 text-xs shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-xs text-muted">
                    {entity?.name && <span>{entity.name} &middot; </span>}
                    {i.createdAt} &middot; {i.userName}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {deleteTarget && (
        <ConfirmModal
          title="Delete Issue"
          message="Delete this reported issue? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </main>
  )
}
