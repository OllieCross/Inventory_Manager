'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface Props {
  userId: string
  userName: string
}

export default function DeleteUserButton({ userId, userName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-red-400 hover:text-red-300 transition-colors"
        aria-label={`Delete user ${userName}`}
      >
        Delete
      </button>
      {open && (
        <ConfirmModal
          title="Delete user"
          message={`Are you sure you want to delete "${userName}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setOpen(false)}
          loading={loading}
        />
      )}
    </>
  )
}
