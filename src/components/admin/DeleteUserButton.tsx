'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  userName: string
}

export default function DeleteUserButton({ userId, userName }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to delete user')
      setConfirming(false)
      return
    }
    router.refresh()
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-muted">Delete {userName}?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
        >
          {loading ? 'Deleting…' : 'Confirm'}
        </button>
        <button
          onClick={() => { setConfirming(false); setError(null) }}
          className="text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-muted hover:text-red-400 transition-colors"
      aria-label={`Delete user ${userName}`}
    >
      Delete
    </button>
  )
}
