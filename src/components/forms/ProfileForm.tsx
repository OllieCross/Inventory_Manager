'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function InlineFeedback({ success, error }: { success: string; error: string }) {
  if (success) return <p className="text-xs text-green-400">{success}</p>
  if (error) return <p className="text-xs text-red-400">{error}</p>
  return null
}

export default function ProfileForm({
  initialName,
  hasPassword,
}: {
  initialName: string
  hasPassword: boolean
}) {
  const router = useRouter()

  // Name form state
  const [name, setName] = useState(initialName)
  const [savingName, setSavingName] = useState(false)
  const [nameSuccess, setNameSuccess] = useState('')
  const [nameError, setNameError] = useState('')

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')

  const pwMatch = confirmPassword.length > 0 && newPassword === confirmPassword
  const pwMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setNameError('')
    setNameSuccess('')
    if (name === initialName) { setNameError('No changes to save'); return }
    setSavingName(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) { setNameError(typeof data.error === 'string' ? data.error : 'Failed to save'); return }
      setNameSuccess('Name updated')
      setTimeout(() => setNameSuccess(''), 3000)
      router.refresh()
    } finally {
      setSavingName(false)
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return }
    setSavingPw(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setPwError(typeof data.error === 'string' ? data.error : 'Failed to update password'); return }
      setPwSuccess('Password updated')
      setTimeout(() => setPwSuccess(''), 3000)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Display Name */}
      <form onSubmit={handleSaveName} className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Display Name</h2>
          <InlineFeedback success={nameSuccess} error={nameError} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            className="input-field"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            maxLength={100}
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={savingName}>
          {savingName ? 'Saving...' : 'Update Display Name'}
        </button>
      </form>

      {/* Change Password */}
      {hasPassword && (
        <form onSubmit={handleSavePassword} className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Change Password</h2>
            <InlineFeedback success={pwSuccess} error={pwError} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="input-field pr-10"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
                <EyeIcon open={showCurrent} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className="input-field pr-10"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
                <EyeIcon open={showNew} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className="input-field pr-10"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {pwMatch && <p className="text-xs text-green-400 mt-1">Passwords match</p>}
            {pwMismatch && <p className="text-xs text-red-400 mt-1">Passwords do not match</p>}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={savingPw}>
            {savingPw ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      )}
    </div>
  )
}
