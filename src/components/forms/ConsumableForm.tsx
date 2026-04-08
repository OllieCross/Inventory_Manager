'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'

type Props = {
  mode: 'create' | 'edit'
  consumableId?: string
  initialData?: {
    name: string
    unit: string
    stockQuantity: number
    warningThreshold: number | null
    criticalThreshold: number | null
    notes: string
  }
}

export default function ConsumableForm({ mode, consumableId, initialData }: Props) {
  const router = useRouter()

  const [name, setName] = useState(initialData?.name ?? '')
  const [unit, setUnit] = useState(initialData?.unit ?? '')
  const [stockQuantity, setStockQuantity] = useState(String(initialData?.stockQuantity ?? 0))
  const [warningThreshold, setWarningThreshold] = useState<string>(
    initialData?.warningThreshold != null ? String(initialData.warningThreshold) : ''
  )
  const [criticalThreshold, setCriticalThreshold] = useState<string>(
    initialData?.criticalThreshold != null ? String(initialData.criticalThreshold) : ''
  )
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const parsedStock = parseFloat(stockQuantity)
    if (stockQuantity.trim() === '' || isNaN(parsedStock) || parsedStock < 0) {
      setError('Stock quantity must be a valid number (0 or more)')
      setSaving(false)
      return
    }

    const body = {
        name,
        unit,
        stockQuantity: parsedStock,
        warningThreshold: warningThreshold !== '' ? parseFloat(warningThreshold) : null,
        criticalThreshold: criticalThreshold !== '' ? parseFloat(criticalThreshold) : null,
        notes: notes || undefined,
      }

      const res = mode === 'create'
        ? await fetch('/api/consumables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/consumables/${consumableId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Something went wrong')
      }

      router.push('/editor')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/consumables/${consumableId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      router.push('/editor')
      router.refresh()
    } catch {
      setError('Failed to delete consumable')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <>
    {showDeleteConfirm && (
      <ConfirmModal
        title="Delete Consumable"
        message={`Are you sure you want to delete "${name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleting}
      />
    )}
    <form onSubmit={handleSubmit} className="space-y-6">

      <section className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Name *</label>
          <input
            type="text"
            required
            className="input-field"
            placeholder="e.g. Titanium Dust, Confetti Bag, CO2 Canister"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Unit *</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. kg, bag, cartridge, litre"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Stock Quantity</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input-field"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Warning threshold</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input-field"
              placeholder="Optional"
              value={warningThreshold}
              onChange={(e) => setWarningThreshold(e.target.value)}
            />
            <p className="text-xs text-muted mt-1">Stock at or below this turns yellow</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Critical threshold</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input-field"
              placeholder="Optional"
              value={criticalThreshold}
              onChange={(e) => setCriticalThreshold(e.target.value)}
            />
            <p className="text-xs text-muted mt-1">Stock at or below this turns red</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Notes</label>
          <textarea
            className="input-field resize-none"
            rows={2}
            placeholder="Hazard info, storage requirements, supplier notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </section>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 flex-wrap">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : mode === 'create' ? 'Create Consumable' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">Cancel</button>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="ml-auto bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </form>
    </>
  )
}
