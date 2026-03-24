'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = { caseId: string; caseName: string }

export default function DeleteCaseButton({ caseId, caseName }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/cases/${caseId}`, { method: 'DELETE' })
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted hidden sm:block">Delete &quot;{caseName}&quot;?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Deleting...' : 'Yes'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
    >
      Delete
    </button>
  )
}
