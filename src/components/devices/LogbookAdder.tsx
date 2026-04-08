'use client'

import { useState } from 'react'

type LogbookEntry = {
  id: string
  date: string | Date
  comment: string
  user: { name: string }
}

type Props = {
  deviceId: string
  initialEntries: LogbookEntry[]
}

export default function LogbookAdder({ deviceId, initialEntries }: Props) {
  const [entries, setEntries] = useState<LogbookEntry[]>(initialEntries)
  const [showForm, setShowForm] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!comment.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/devices/${deviceId}/logbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, comment }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const entry = await res.json()
      setEntries((prev) => [entry, ...prev])
      setShowForm(false)
      setComment('')
      setDate(new Date().toISOString().slice(0, 10))
    } catch {
      setError('Failed to add entry')
    }
    setSaving(false)
  }

  return (
    <div className="mt-3 space-y-3">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="btn-secondary w-full text-sm text-center block"
        >
          + Add logbook entry
        </button>
      ) : (
        <div className="card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Date</label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Comment</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Prism replaced"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving || !comment.trim()}
              className="btn-primary text-sm py-1.5 px-3"
            >
              {saving ? 'Saving...' : 'Add Entry'}
            </button>
            <button
              onClick={() => { setShowForm(false); setComment(''); setError('') }}
              className="btn-ghost text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div className="card divide-y divide-foreground/10 mt-3">
          {entries.map((entry) => (
            <div key={entry.id} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm">{entry.comment}</p>
              <p className="text-muted text-xs mt-0.5">
                {(() => { const d = new Date(entry.date); return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}` })()} &middot; {entry.user.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
