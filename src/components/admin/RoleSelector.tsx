'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Role = 'VIEWER' | 'EDITOR' | 'ADMIN'

interface RoleSelectorProps {
  userId: string
  currentRole: Role
  isSelf: boolean
}

const ROLE_OPTIONS: Role[] = ['VIEWER', 'EDITOR', 'ADMIN']

const ROLE_COLORS: Record<Role, string> = {
  VIEWER: 'text-gray-400',
  EDITOR: 'text-blue-400',
  ADMIN: 'text-yellow-400',
}

export default function RoleSelector({ userId, currentRole, isSelf }: RoleSelectorProps) {
  const router = useRouter()
  const [role, setRole] = useState<Role>(currentRole)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleChange(newRole: Role) {
    if (newRole === role) return
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to update role')
      return
    }

    setRole(newRole)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  if (isSelf) {
    return <span className={`text-sm font-medium ${ROLE_COLORS[role]}`}>{role} (you)</span>
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value as Role)}
        className="bg-surface border border-foreground/10 text-foreground text-sm rounded px-2 py-1 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-brand"
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {saving && <span className="text-xs text-gray-500">Saving...</span>}
      {saved && <span className="text-xs text-green-400">Saved</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
