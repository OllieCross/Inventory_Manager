'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'

type Props = {
  mode: 'create' | 'edit'
  itemId?: string
  initialData?: {
    name: string
    quantity: number
    comment: string
  }
}

export default function StandaloneItemForm({ mode, itemId, initialData }: Props) {
  const router = useRouter()

  const [name, setName] = useState(initialData?.name ?? '')
  const [quantity, setQuantity] = useState(String(initialData?.quantity ?? 1))
  const [comment, setComment] = useState(initialData?.comment ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const parsedQty = parseInt(quantity)
    if (isNaN(parsedQty) || parsedQty < 1) {
      setError('Quantity must be at least 1')
      setSaving(false)
      return
    }

    const payload = {
      name,
      quantity: parsedQty,
      comment: comment || undefined,
    }

    try {
      const res = mode === 'create'
        ? await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/items/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save item')
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
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      router.push('/editor')
      router.refresh()
    } catch {
      setError('Failed to delete item')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <>
    {showDeleteConfirm && (
      <ConfirmModal
        title="Delete Item"
        message={`Are you sure you want to delete "${name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleting}
      />
    )}
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1.5">Item Name *</label>
        <input
          type="text"
          required
          className="input-field"
          placeholder="e.g. Safety goggles"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Quantity</label>
        <input
          type="number"
          min={1}
          step={1}
          className="input-field"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Notes</label>
        <textarea
          rows={3}
          className="input-field resize-none"
          placeholder="Optional notes..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 flex-wrap">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : mode === 'create' ? 'Create Item' : 'Save Changes'}
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
