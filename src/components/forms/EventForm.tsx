'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'

type MemberType = 'stagehand' | 'case' | 'device' | 'item' | 'consumable' | 'tank' | 'pyro'

type UserOption = { id: string; name: string; email: string }
type CaseOption = { id: string; name: string }
type DeviceOption = { id: string; name: string; status: string; caseId: string | null }
type ItemOption = { id: string; name: string; quantity: number; caseId: string | null }
type ConsumableOption = { id: string; name: string; unit: string }
type TankOption = { id: string; name: string; unit: string; chemicalCompound: string }
type PyroOption = { id: string; name: string; category: string; brand: string | null }

type GroupOption = {
  id: string
  name: string
  cases: { case: CaseOption }[]
  devices: { device: DeviceOption }[]
  items: { item: ItemOption }[]
  consumables: { consumable: ConsumableOption; quantityNeeded: number }[]
}

type EventMember =
  | { type: 'stagehand'; id: string; name: string; email: string }
  | { type: 'case'; id: string; name: string }
  | { type: 'device'; id: string; name: string; status: string }
  | { type: 'item'; id: string; name: string; quantity: number }
  | { type: 'consumable'; id: string; name: string; unit: string; quantityNeeded: number }
  | { type: 'tank'; id: string; name: string; unit: string; chemicalCompound: string }
  | { type: 'pyro'; id: string; name: string; category: string; quantity: number }

type Props = {
  mode: 'create' | 'edit'
  eventId?: string
  initialData?: {
    name: string
    venueName: string
    location: string
    startDate: string
    clientName: string
    clientPhone: string
    clientEmail: string
    comments: string
    status: string
    invoiceStatus: string
    members: EventMember[]
  }
  allUsers: UserOption[]
  allCases: CaseOption[]
  allDevices: DeviceOption[]
  allItems: ItemOption[]
  allConsumables: ConsumableOption[]
  allTanks: TankOption[]
  allPyros: PyroOption[]
  allGroups: GroupOption[]
}

const STATUS_LABELS: Record<string, string> = {
  Working: 'Working', Faulty: 'Faulty', InRepair: 'In Repair',
  Retired: 'Retired', Lost: 'Lost', RentedToFriend: 'Rented',
}

const EVENT_STATUSES = ['Planned', 'Confirmed', 'Completed', 'Cancelled', 'NeedsDetails'] as const
const INVOICE_STATUSES = ['Paid', 'NotPaid', 'DepositPaid', 'DepositNotYetPaid', 'NotPaidInFull'] as const

const EVENT_STATUS_LABELS: Record<string, string> = {
  Planned: 'Planned', Confirmed: 'Confirmed', Completed: 'Completed',
  Cancelled: 'Cancelled', NeedsDetails: 'Needs Details',
}
const INVOICE_STATUS_LABELS: Record<string, string> = {
  Paid: 'Paid', NotPaid: 'Not Paid', DepositPaid: 'Deposit Paid',
  DepositNotYetPaid: 'Deposit Not Yet Paid', NotPaidInFull: 'Not Paid in Full',
}

// Generate time options at 15-minute increments
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4).toString().padStart(2, '0')
  const m = ((i % 4) * 15).toString().padStart(2, '0')
  return `${h}:${m}`
})

function splitDateTime(iso: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '09:00' }
  const d = new Date(iso)
  const date = d.toISOString().slice(0, 10)
  const h = d.getHours().toString().padStart(2, '0')
  const rawMin = d.getMinutes()
  // Round down to nearest 15
  const m = (Math.floor(rawMin / 15) * 15).toString().padStart(2, '0')
  return { date, time: `${h}:${m}` }
}

const COMPOUND_LABELS: Record<string, string> = {
  H2O: 'H\u2082O', O2: 'O\u2082', CO2: 'CO\u2082',
  C4H10C3H8: 'Butane/Propane', N2: 'N\u2082', H2: 'H\u2082', LN2: 'LN\u2082', Other: 'Other',
}

export default function EventForm({
  mode, eventId, initialData, allUsers, allCases, allDevices, allItems, allConsumables, allTanks, allPyros, allGroups,
}: Props) {
  const router = useRouter()

  const splitStart = splitDateTime(initialData?.startDate ?? '')

  const [name, setName] = useState(initialData?.name ?? '')
  const [venueName, setVenueName] = useState(initialData?.venueName ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [startDateVal, setStartDateVal] = useState(splitStart.date)
  const [startTimeVal, setStartTimeVal] = useState(splitStart.time)
  const [clientName, setClientName] = useState(initialData?.clientName ?? '')
  const [clientPhone, setClientPhone] = useState(initialData?.clientPhone ?? '')
  const [clientEmail, setClientEmail] = useState(initialData?.clientEmail ?? '')
  const [comments, setComments] = useState(initialData?.comments ?? '')
  const [status, setStatus] = useState(initialData?.status ?? 'Planned')
  const [invoiceStatus, setInvoiceStatus] = useState(initialData?.invoiceStatus ?? 'NotPaid')
  const [members, setMembers] = useState<EventMember[]>(initialData?.members ?? [])

  // Crew picker
  const [crewId, setCrewId] = useState('')

  // Inventory picker
  const [invType, setInvType] = useState<'case' | 'device' | 'item' | 'consumable' | 'tank' | 'pyro'>('case')
  const [invId, setInvId] = useState('')
  const [invQtyRaw, setInvQtyRaw] = useState('1')
  const [invQtyError, setInvQtyError] = useState('')
  const [invSearch, setInvSearch] = useState('')
  const [invCaseFilter, setInvCaseFilter] = useState<string>('__none__')

  // Group picker
  const [groupId, setGroupId] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!eventId) return
    setDeleting(true)
    await fetch(`/api/events/${eventId}`, { method: 'DELETE' })
    router.push('/events')
    router.refresh()
  }

  // ---------- Helpers ----------

  function isMember(type: MemberType, id: string) {
    return members.some((m) => m.type === type && m.id === id)
  }

  async function patchMember(action: 'add' | 'remove', type: MemberType, memberId: string, quantityNeeded?: number) {
    if (!eventId) return
    await fetch(`/api/events/${eventId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, type, memberId, quantityNeeded }),
    })
  }

  function addCrew() {
    if (!crewId || isMember('stagehand', crewId)) return
    const opt = allUsers.find((u) => u.id === crewId)
    if (!opt) return
    const member: EventMember = { type: 'stagehand', id: opt.id, name: opt.name, email: opt.email }
    setMembers((prev) => [...prev, member])
    if (mode === 'edit') patchMember('add', 'stagehand', crewId)
    setCrewId('')
  }

  function parseInvQty(): number | null {
    if (invType !== 'consumable' && invType !== 'item' && invType !== 'pyro') return null
    const normalized = invQtyRaw.replace(',', '.')
    const num = Number(normalized)
    if (!Number.isFinite(num) || num < 0) return null
    if (invType === 'item' || invType === 'pyro') {
      if (!Number.isInteger(num)) return null
      return num
    }
    // consumable: up to 2 decimal places
    if (!/^\d+([.,]\d{1,2})?$/.test(invQtyRaw.trim())) return null
    return num
  }

  function addInventory() {
    if (!invId) return
    if (isMember(invType, invId)) return

    let qty: number | null = null
    if (invType === 'item' || invType === 'consumable' || invType === 'pyro') {
      qty = parseInvQty()
      if (qty === null) {
        const hint = invType === 'consumable'
          ? 'Enter a valid non-negative number (up to 2 decimal places).'
          : 'Enter a valid non-negative whole number.'
        setInvQtyError(hint)
        return
      }
      setInvQtyError('')
    }

    let member: EventMember
    if (invType === 'case') {
      const opt = allCases.find((c) => c.id === invId)
      if (!opt) return
      member = { type: 'case', id: opt.id, name: opt.name }
    } else if (invType === 'device') {
      const opt = allDevices.find((d) => d.id === invId)
      if (!opt) return
      member = { type: 'device', id: opt.id, name: opt.name, status: opt.status }
    } else if (invType === 'item') {
      const opt = allItems.find((i) => i.id === invId)
      if (!opt) return
      if (qty! > opt.quantity) {
        setInvQtyError(`Only ${opt.quantity} available.`)
        return
      }
      member = { type: 'item', id: opt.id, name: opt.name, quantity: qty! }
    } else if (invType === 'consumable') {
      const opt = allConsumables.find((c) => c.id === invId)
      if (!opt) return
      member = { type: 'consumable', id: opt.id, name: opt.name, unit: opt.unit, quantityNeeded: qty! }
    } else if (invType === 'tank') {
      const opt = allTanks.find((t) => t.id === invId)
      if (!opt) return
      member = { type: 'tank', id: opt.id, name: opt.name, unit: opt.unit, chemicalCompound: opt.chemicalCompound }
    } else {
      const opt = allPyros.find((p) => p.id === invId)
      if (!opt) return
      member = { type: 'pyro', id: opt.id, name: opt.name, category: opt.category, quantity: qty! }
    }

    setMembers((prev) => [...prev, member])
    if (mode === 'edit') patchMember('add', invType, invId, invType === 'consumable' || invType === 'item' || invType === 'pyro' ? qty! : undefined)
    setInvId('')
    setInvQtyRaw('1')
    setInvQtyError('')
    setInvSearch('')
  }

  function removeMember(type: MemberType, id: string) {
    setMembers((prev) => prev.filter((m) => !(m.type === type && m.id === id)))
    if (mode === 'edit') patchMember('remove', type, id)
  }

  function expandGroupLocally(gId: string) {
    const group = allGroups.find((g) => g.id === gId)
    if (!group) return
    const toAdd: EventMember[] = [
      ...group.cases.filter((x) => !isMember('case', x.case.id)).map((x) => ({ type: 'case' as const, id: x.case.id, name: x.case.name })),
      ...group.devices.filter((x) => !isMember('device', x.device.id)).map((x) => ({ type: 'device' as const, id: x.device.id, name: x.device.name, status: x.device.status })),
      ...group.items.filter((x) => !isMember('item', x.item.id)).map((x) => ({ type: 'item' as const, id: x.item.id, name: x.item.name, quantity: x.item.quantity })),
      ...group.consumables.filter((x) => !isMember('consumable', x.consumable.id)).map((x) => ({ type: 'consumable' as const, id: x.consumable.id, name: x.consumable.name, unit: x.consumable.unit, quantityNeeded: x.quantityNeeded })),
    ]
    setMembers((prev) => [...prev, ...toAdd])
  }

  async function handleAddGroup() {
    if (!groupId) return
    if (mode === 'create') {
      expandGroupLocally(groupId)
      setGroupId('')
      return
    }
    if (!eventId) return
    setAddingGroup(true)
    try {
      const res = await fetch(`/api/events/${eventId}/add-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      })
      if (!res.ok) throw new Error('Failed to add group')
      router.refresh()
      window.location.reload()
    } catch {
      setError('Failed to add group')
    } finally {
      setAddingGroup(false)
      setGroupId('')
    }
  }

  // ---------- Filtered inventory options ----------

  const invOptions = useMemo(() => {
    const sq = invSearch.trim().toLowerCase()
    let opts: { id: string; name: string; status?: string; unit?: string; maxQty?: number }[] = []
    if (invType === 'case') opts = allCases.filter((c) => !isMember('case', c.id))
    else if (invType === 'device') opts = allDevices.filter((d) => !isMember('device', d.id) && (invCaseFilter === '__none__' ? d.caseId === null : d.caseId === invCaseFilter))
    else if (invType === 'item') opts = allItems.filter((i) => !isMember('item', i.id) && (invCaseFilter === '__none__' ? i.caseId === null : i.caseId === invCaseFilter)).map((i) => ({ ...i, maxQty: i.quantity }))
    else if (invType === 'consumable') opts = allConsumables.filter((c) => !isMember('consumable', c.id))
    else if (invType === 'tank') opts = allTanks.filter((t) => !isMember('tank', t.id)).map((t) => ({ ...t, unit: `${COMPOUND_LABELS[t.chemicalCompound] ?? t.chemicalCompound} - ${t.unit}` }))
    else opts = allPyros.filter((p) => !isMember('pyro', p.id)).map((p) => ({ id: p.id, name: p.name, unit: p.category + (p.brand ? ` - ${p.brand}` : '') }))
    if (sq) opts = opts.filter((o) => o.name.toLowerCase().includes(sq))
    return opts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invType, invSearch, invCaseFilter, members, allCases, allDevices, allItems, allConsumables, allTanks, allPyros])

  const availableCrew = useMemo(
    () => allUsers.filter((u) => !isMember('stagehand', u.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, allUsers]
  )

  // ---------- Submit ----------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!startDateVal || !startTimeVal) { setError('Start date and time are required'); return }
    setSaving(true)
    setError('')

    const startDate = new Date(`${startDateVal}T${startTimeVal}:00`).toISOString()

    const payload = {
      name, venueName,
      location: location || undefined,
      startDate,
      clientName: clientName || undefined,
      clientPhone: clientPhone || undefined,
      clientEmail: clientEmail || undefined,
      comments: comments || undefined,
      status,
      invoiceStatus,
    }

    try {
      let id = eventId

      if (mode === 'create') {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to create event')
        }
        const created = await res.json()
        id = created.id

        await Promise.all(
          members.map((m) =>
            fetch(`/api/events/${id}/members`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'add',
                type: m.type,
                memberId: m.id,
                quantityNeeded: m.type === 'consumable' ? m.quantityNeeded : m.type === 'item' ? m.quantity : m.type === 'pyro' ? m.quantity : undefined,
              }),
            })
          )
        )
      } else {
        const res = await fetch(`/api/events/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to update event')
        }
      }

      router.push(`/events/${id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  const stagehands = members.filter((m): m is Extract<EventMember, { type: 'stagehand' }> => m.type === 'stagehand')
  const caseMembers = members.filter((m): m is Extract<EventMember, { type: 'case' }> => m.type === 'case')
  const deviceMembers = members.filter((m): m is Extract<EventMember, { type: 'device' }> => m.type === 'device')
  const itemMembers = members.filter((m): m is Extract<EventMember, { type: 'item' }> => m.type === 'item')
  const consumableMembers = members.filter((m): m is Extract<EventMember, { type: 'consumable' }> => m.type === 'consumable')
  const tankMembers = members.filter((m): m is Extract<EventMember, { type: 'tank' }> => m.type === 'tank')
  const pyroMembers = members.filter((m): m is Extract<EventMember, { type: 'pyro' }> => m.type === 'pyro')

  // ---------- Render ----------

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Details */}
      <section className="card space-y-4 pb-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Details</h2>
        <div>
          <label className="block text-sm font-medium mb-1.5">Event Name *</label>
          <input type="text" required className="input-field" placeholder="e.g. New Year Gala 2027"
            value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Venue Name *</label>
          <input type="text" required className="input-field" placeholder="e.g. Opera House Main Stage"
            value={venueName} onChange={(e) => setVenueName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Location</label>
          <input type="text" className="input-field" placeholder="e.g. Vienna, Austria"
            value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label className="block text-sm font-medium mb-1.5">Start Date *</label>
            <input type="date" required className="input-field h-[42px] appearance-none" value={startDateVal} onChange={(e) => setStartDateVal(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="block text-sm font-medium mb-1.5">Start Time *</label>
            <select className="input-field h-[42px]" value={startTimeVal} onChange={(e) => setStartTimeVal(e.target.value)}>
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Client */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Client Details (optional)</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Client Name</label>
            <input type="text" className="input-field" placeholder="e.g. Acme Corp"
              value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <input type="tel" className="input-field" placeholder="+43 123 456 789"
              value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input type="email" className="input-field" placeholder="client@example.com"
              value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Status */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Event Status</label>
            <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
              {EVENT_STATUSES.map((s) => (
                <option key={s} value={s}>{EVENT_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Invoice Status</label>
            <select className="input-field" value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value)}>
              {INVOICE_STATUSES.map((s) => (
                <option key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Comments / Notes</label>
          <textarea rows={3} className="input-field resize-none" placeholder="Internal notes..."
            value={comments} onChange={(e) => setComments(e.target.value)} />
        </div>
      </section>

      {/* Crew */}
      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Crew</h2>
        <div className="flex gap-2">
          <select className="input-field flex-1" value={crewId} onChange={(e) => setCrewId(e.target.value)}>
            <option value="">-- Select crew member --</option>
            {availableCrew.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <button type="button" onClick={addCrew} disabled={!crewId} className="btn-primary text-sm shrink-0">
            Add
          </button>
        </div>
        {stagehands.length > 0 && (
          <div className="space-y-1">
            {stagehands.map((m) => (
              <MemberRow key={m.id} label={m.name} onRemove={() => removeMember('stagehand', m.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Add Group Template */}
      {allGroups.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Add Group Template</h2>
          <div className="flex gap-2">
            <select className="input-field flex-1" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">-- Select group --</option>
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddGroup}
              disabled={!groupId || addingGroup}
              className="btn-primary text-sm shrink-0"
            >
              {addingGroup ? 'Adding...' : 'Add Group'}
            </button>
          </div>
          <p className="text-sm text-foreground/70">Expands the group&apos;s cases, devices, items, and consumables into the inventory below.</p>
        </section>
      )}

      {/* Inventory */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Inventory</h2>

        {/* Type tabs — scrollable segmented control */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">
          {(['case', 'device', 'item', 'consumable', 'tank', 'pyro'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setInvType(t); setInvId(''); setInvSearch(''); setInvQtyRaw('1'); setInvQtyError(''); setInvCaseFilter('__none__') }}
              className={`shrink-0 text-xs px-3.5 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap active:scale-95 ${
                invType === t
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-foreground/5 text-muted hover:text-foreground hover:bg-foreground/10'
              }`}
            >
              {t === 'consumable' ? 'Consumable' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Picker — remounts on tab change to trigger fade-in animation */}
        <div key={invType} className="inv-picker-enter space-y-2.5">

          {/* Search with icon */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="search"
              placeholder={`Search ${invType}s...`}
              className="input-field pl-9"
              value={invSearch}
              onChange={(e) => { setInvSearch(e.target.value); setInvId('') }}
            />
          </div>

          {/* Case filter (device / item only) */}
          {(invType === 'device' || invType === 'item') && (
            <select
              className="input-field"
              value={invCaseFilter}
              onChange={(e) => { setInvCaseFilter(e.target.value); setInvId('') }}
            >
              <option value="__none__">No case (standalone)</option>
              {allCases.filter((c) => !isMember('case', c.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Item select */}
          <select className="input-field" value={invId} onChange={(e) => setInvId(e.target.value)}>
            <option value="">-- Select {invType} --</option>
            {(invOptions as Array<{ id: string; name: string; status?: string; unit?: string; maxQty?: number }>).map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
                {opt.status ? ` (${STATUS_LABELS[opt.status] ?? opt.status})` : ''}
                {opt.unit ? ` · ${opt.unit}` : ''}
                {opt.maxQty != null ? ` (${opt.maxQty}pcs)` : ''}
              </option>
            ))}
          </select>

          {/* Qty + Add */}
          {(invType === 'consumable' || invType === 'item' || invType === 'pyro') ? (
            <div className="space-y-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode={invType === 'consumable' ? 'decimal' : 'numeric'}
                  className={`input-field w-20 shrink-0 text-center ${invQtyError ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                  placeholder="Qty"
                  value={invQtyRaw}
                  onChange={(e) => { setInvQtyRaw(e.target.value); setInvQtyError('') }}
                />
                <button
                  type="button"
                  onClick={addInventory}
                  disabled={!invId}
                  className="btn-primary text-sm h-[42px] flex-1 transition-all duration-200"
                >
                  Add
                </button>
              </div>
              {invQtyError && <p className="text-red-400 text-xs">{invQtyError}</p>}
            </div>
          ) : (
            <button
              type="button"
              onClick={addInventory}
              disabled={!invId}
              className="btn-primary text-sm h-[42px] w-full transition-all duration-200"
            >
              Add
            </button>
          )}
        </div>

        {/* Added inventory list */}
        {(caseMembers.length + deviceMembers.length + itemMembers.length + consumableMembers.length + tankMembers.length + pyroMembers.length) > 0 && (
          <div className="space-y-3 pt-3 border-t border-foreground/10">
            {caseMembers.length > 0 && (
              <InventoryGroup label="Cases">
                {caseMembers.map((m) => (
                  <MemberRow key={m.id} label={m.name} onRemove={() => removeMember('case', m.id)} />
                ))}
              </InventoryGroup>
            )}
            {deviceMembers.length > 0 && (
              <InventoryGroup label="Devices">
                {deviceMembers.map((m) => (
                  <MemberRow key={m.id} label={m.name} sublabel={STATUS_LABELS[m.status] ?? m.status} onRemove={() => removeMember('device', m.id)} />
                ))}
              </InventoryGroup>
            )}
            {itemMembers.length > 0 && (
              <InventoryGroup label="Items">
                {itemMembers.map((m) => (
                  <MemberRow key={m.id} label={m.name} sublabel={`×${m.quantity}`} onRemove={() => removeMember('item', m.id)} />
                ))}
              </InventoryGroup>
            )}
            {consumableMembers.length > 0 && (
              <InventoryGroup label="Consumables">
                {consumableMembers.map((m) => (
                  <MemberRow key={m.id} label={m.name} sublabel={`${m.quantityNeeded} ${m.unit}`} onRemove={() => removeMember('consumable', m.id)} />
                ))}
              </InventoryGroup>
            )}
            {tankMembers.length > 0 && (
              <InventoryGroup label="Tanks">
                {tankMembers.map((m) => (
                  <MemberRow key={m.id} label={m.name} sublabel={`${COMPOUND_LABELS[m.chemicalCompound] ?? m.chemicalCompound} · ${m.unit}`} onRemove={() => removeMember('tank', m.id)} />
                ))}
              </InventoryGroup>
            )}
            {pyroMembers.length > 0 && (
              <InventoryGroup label="Pyro">
                {pyroMembers.map((m) => (
                  <MemberRow key={m.id} label={m.name} sublabel={`${m.category} · ×${m.quantity}`} onRemove={() => removeMember('pyro', m.id)} />
                ))}
              </InventoryGroup>
            )}
          </div>
        )}
      </section>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 flex-wrap">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : mode === 'create' ? 'Create Event' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">Cancel</button>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="ml-auto bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Delete Event
          </button>
        )}
      </div>

      {showDelete && (
        <ConfirmModal
          title="Delete event"
          message={`Are you sure you want to delete "${initialData?.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          loading={deleting}
        />
      )}
    </form>
  )
}

function InventoryGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted/70 px-1">{label}</p>
      {children}
    </div>
  )
}

function MemberRow({ label, sublabel, onRemove }: { label: string; sublabel?: string; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-foreground/[0.04] hover:bg-foreground/[0.07] border border-foreground/[0.07] rounded-lg px-3 py-2 transition-colors duration-150">
      <div className="min-w-0 flex items-center gap-2">
        <span className="text-sm truncate">{label}</span>
        {sublabel && <span className="text-xs text-muted shrink-0">{sublabel}</span>}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-muted/50 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}
