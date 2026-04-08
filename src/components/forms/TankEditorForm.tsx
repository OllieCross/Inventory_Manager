'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { formatBytes } from '@/lib/utils'
import ConfirmModal from '@/components/ui/ConfirmModal'

const QRScanner = dynamic(() => import('@/components/scanner/QRScanner'), { ssr: false })

// ---------- Types ----------

type ChemicalCompound = 'H2O' | 'O2' | 'CO2' | 'C4H10C3H8' | 'N2' | 'H2' | 'LN2' | 'Other'
type DocType = 'Manual' | 'Certificate' | 'Other' | 'Bill' | 'Order' | 'Invoice' | 'ServiceReport'

type ImageRow = {
  id?: string
  fileKey?: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  uploading?: boolean
  error?: string
}

type DocumentRow = {
  id?: string
  fileKey?: string
  fileName: string
  fileSize: number
  mimeType: string
  title: string
  type: DocType
  url?: string
  uploading?: boolean
  error?: string
}

type LogbookRow = {
  id: string
  date: string
  comment: string
  user: { name: string }
}

type PendingImage = { file: File; previewUrl: string }
type PendingDocument = { file: File; title: string; type: DocType }

type Props = {
  mode: 'create' | 'edit'
  tankId?: string
  initialData?: {
    name: string
    qrCode: string
    chemicalCompound: ChemicalCompound
    unit: string
    fullCapacity: string
    currentCapacity: string
    notes: string
    images: ImageRow[]
    documents: DocumentRow[]
    logbook: LogbookRow[]
  }
}

const COMPOUND_LABELS: Record<ChemicalCompound, string> = {
  H2O: 'H\u2082O (Water)',
  O2: 'O\u2082 (Oxygen)',
  CO2: 'CO\u2082 (Carbon Dioxide)',
  C4H10C3H8: 'C\u2084H\u2081\u2080/C\u2083H\u2088 (Butane/Propane)',
  N2: 'N\u2082 (Nitrogen)',
  H2: 'H\u2082 (Hydrogen)',
  LN2: 'LN\u2082 (Liquid Nitrogen)',
  Other: 'Other',
}

// ---------- Upload helpers ----------

async function uploadImageFile(
  file: File,
  tankId: string,
  onProgress: (state: 'uploading' | 'done' | 'error', result?: ImageRow) => void
): Promise<void> {
  onProgress('uploading')
  try {
    let processed: File = file

    if (
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif')
    ) {
      const heic2any = (await import('heic2any')).default
      const blob = (await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })) as Blob
      processed = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
    }

    const imageCompression = (await import('browser-image-compression')).default
    processed = await imageCompression(processed, { maxWidthOrHeight: 1920, useWebWorker: true, initialQuality: 0.8 })

    const urlRes = await fetch('/api/minio/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tankId, type: 'image', fileName: processed.name, mimeType: processed.type }),
    })
    if (!urlRes.ok) throw new Error('Failed to get upload URL')
    const { url, fileKey } = await urlRes.json()

    const uploadRes = await fetch(url, { method: 'PUT', headers: { 'Content-Type': processed.type }, body: processed })
    if (!uploadRes.ok) throw new Error('Upload failed')

    const recordRes = await fetch(`/api/tanks/${tankId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileKey, fileName: processed.name, fileSize: processed.size, mimeType: processed.type }),
    })
    if (!recordRes.ok) throw new Error('Failed to save image record')
    const saved = await recordRes.json()
    onProgress('done', { ...saved, url: URL.createObjectURL(processed) })
  } catch (err) {
    onProgress('error', { fileName: file.name, fileSize: file.size, mimeType: file.type, url: '', error: err instanceof Error ? err.message : 'Upload failed' })
  }
}

async function uploadDocumentFile(
  file: File,
  title: string,
  type: DocType,
  tankId: string,
  onProgress: (state: 'uploading' | 'done' | 'error', result?: DocumentRow) => void
): Promise<void> {
  onProgress('uploading')
  try {
    const urlRes = await fetch('/api/minio/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tankId, type: 'document', fileName: file.name, mimeType: file.type }),
    })
    if (!urlRes.ok) throw new Error('Failed to get upload URL')
    const { url, fileKey } = await urlRes.json()

    const uploadRes = await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
    if (!uploadRes.ok) throw new Error('Upload failed')

    const recordRes = await fetch(`/api/tanks/${tankId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type, fileKey, fileName: file.name, fileSize: file.size, mimeType: file.type }),
    })
    if (!recordRes.ok) throw new Error('Failed to save document record')
    const saved = await recordRes.json()
    onProgress('done', saved)
  } catch (err) {
    onProgress('error', { fileName: file.name, fileSize: file.size, mimeType: file.type, title, type, error: err instanceof Error ? err.message : 'Upload failed' })
  }
}

// ---------- Component ----------

export default function TankEditorForm({ mode, tankId, initialData }: Props) {
  const router = useRouter()

  const [activeTankId, setActiveTankId] = useState(tankId)

  const [name, setName] = useState(initialData?.name ?? '')
  const [qrCode, setQrCode] = useState(initialData?.qrCode ?? '')
  const [chemicalCompound, setChemicalCompound] = useState<ChemicalCompound>(initialData?.chemicalCompound ?? 'Other')
  const [unit, setUnit] = useState(initialData?.unit ?? 'kg')
  const [fullCapacity, setFullCapacity] = useState(initialData?.fullCapacity ?? '')
  const [currentCapacity, setCurrentCapacity] = useState(initialData?.currentCapacity ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')

  const [images, setImages] = useState<ImageRow[]>(initialData?.images ?? [])
  const [documents, setDocuments] = useState<DocumentRow[]>(initialData?.documents ?? [])
  const [logbook, setLogbook] = useState<LogbookRow[]>(initialData?.logbook ?? [])

  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([])

  const [docDraft, setDocDraft] = useState<{ file: File; title: string; type: DocType } | null>(null)
  const [logDraft, setLogDraft] = useState<{ date: string; comment: string } | null>(null)
  const [logSaving, setLogSaving] = useState(false)

  const [showScanner, setShowScanner] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  type ConfirmTarget =
    | { kind: 'image'; id: string; name: string }
    | { kind: 'document'; id: string; name: string }
    | { kind: 'logbook'; id: string }
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [showDeleteTank, setShowDeleteTank] = useState(false)
  const [deletingTank, setDeletingTank] = useState(false)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  // ---------- Image handling ----------

  function addPendingImage(file: File) {
    setPendingImages((prev) => [...prev, { file, previewUrl: URL.createObjectURL(file) }])
  }

  function removePendingImage(index: number) {
    setPendingImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function processAndUploadImage(file: File, id?: string) {
    const tId = id ?? activeTankId!
    const placeholder: ImageRow = { fileName: file.name, fileSize: file.size, mimeType: file.type, url: '', uploading: true }
    setImages((prev) => [...prev, placeholder])
    await uploadImageFile(file, tId, (state, result) => {
      setImages((prev) =>
        prev.map((img) =>
          img.fileName === file.name && img.uploading
            ? state === 'done' ? result! : { ...img, uploading: false, error: result?.error }
            : img
        )
      )
    })
  }

  async function deleteImage(imageId: string) {
    await fetch(`/api/tanks/${activeTankId}/images/${imageId}`, { method: 'DELETE' })
    setImages((prev) => prev.filter((img) => img.id !== imageId))
  }

  // ---------- Document handling ----------

  function openDocDraft(file: File) {
    setDocDraft({ file, title: file.name.replace(/\.pdf$/i, ''), type: 'Manual' })
  }

  function commitDocDraft() {
    if (!docDraft) return
    if (mode === 'create') {
      setPendingDocuments((prev) => [...prev, { file: docDraft.file, title: docDraft.title, type: docDraft.type }])
    } else {
      uploadDocument(docDraft.file, docDraft.title, docDraft.type)
    }
    setDocDraft(null)
  }

  function removePendingDocument(index: number) {
    setPendingDocuments((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadDocument(file: File, title: string, type: DocType, id?: string) {
    const tId = id ?? activeTankId!
    const placeholder: DocumentRow = { fileName: file.name, fileSize: file.size, mimeType: file.type, title, type, uploading: true }
    setDocuments((prev) => [...prev, placeholder])
    await uploadDocumentFile(file, title, type, tId, (state, result) => {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.fileName === file.name && doc.uploading
            ? state === 'done' ? { ...result!, uploading: false } : { ...doc, uploading: false, error: result?.error }
            : doc
        )
      )
    })
  }

  async function deleteDocument(docId: string) {
    await fetch(`/api/tanks/${activeTankId}/documents/${docId}`, { method: 'DELETE' })
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId))
  }

  // ---------- Logbook ----------

  async function submitLogEntry() {
    if (!logDraft || !activeTankId) return
    setLogSaving(true)
    const res = await fetch(`/api/tanks/${activeTankId}/logbook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logDraft),
    })
    if (res.ok) {
      const entry = await res.json()
      setLogbook((prev) => [entry, ...prev])
      setLogDraft(null)
    }
    setLogSaving(false)
  }

  async function deleteLogEntry(entryId: string) {
    await fetch(`/api/tanks/${activeTankId}/logbook/${entryId}`, { method: 'DELETE' })
    setLogbook((prev) => prev.filter((e) => e.id !== entryId))
  }

  // ---------- Confirm delete ----------

  async function handleConfirmDelete() {
    if (!confirmTarget) return
    setConfirmLoading(true)
    if (confirmTarget.kind === 'image') {
      await deleteImage(confirmTarget.id)
    } else if (confirmTarget.kind === 'document') {
      await deleteDocument(confirmTarget.id)
    } else if (confirmTarget.kind === 'logbook') {
      await deleteLogEntry(confirmTarget.id)
    }
    setConfirmLoading(false)
    setConfirmTarget(null)
  }

  async function handleDeleteTank() {
    setDeletingTank(true)
    try {
      const res = await fetch(`/api/tanks/${activeTankId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      router.push('/editor')
      router.refresh()
    } catch {
      setError('Failed to delete tank')
      setDeletingTank(false)
      setShowDeleteTank(false)
    }
  }

  // ---------- Submit ----------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const parsedFull = parseFloat(fullCapacity)
    const parsedCurrent = parseFloat(currentCapacity)
    if (isNaN(parsedFull) || parsedFull <= 0) { setError('Full capacity must be a positive number'); setSaving(false); return }
    if (isNaN(parsedCurrent) || parsedCurrent < 0) { setError('Current capacity cannot be negative'); setSaving(false); return }

    try {
      if (mode === 'create') {
        const res = await fetch('/api/tanks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            qrCode: qrCode || undefined,
            chemicalCompound,
            unit,
            fullCapacity: parsedFull,
            currentCapacity: parsedCurrent,
            notes: notes || undefined,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to create tank')
        }
        const created = await res.json()
        setActiveTankId(created.id)

        await Promise.all([
          ...pendingImages.map((p) => processAndUploadImage(p.file, created.id)),
          ...pendingDocuments.map((p) => uploadDocument(p.file, p.title, p.type, created.id)),
        ])

        router.push(`/tanks/${created.id}`)
      } else {
        const res = await fetch(`/api/tanks/${activeTankId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            qrCode: qrCode || null,
            chemicalCompound,
            unit,
            fullCapacity: parsedFull,
            currentCapacity: parsedCurrent,
            notes: notes || null,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to update tank')
        }
        router.refresh()
        router.push(`/tanks/${activeTankId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  // ---------- Render ----------

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Basic info */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Details</h2>

        <div>
          <label className="block text-sm font-medium mb-1.5">Tank Name *</label>
          <input type="text" required className="input-field" placeholder="e.g. CO2 Tank #3" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">QR Code</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input-field"
              placeholder="Scan or type the code from the sticker"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
            />
            <button type="button" onClick={() => setShowScanner((v) => !v)} className="btn-ghost shrink-0 text-sm">
              {showScanner ? 'Hide' : 'Scan'}
            </button>
          </div>
          {showScanner && (
            <div className="mt-2 rounded-xl overflow-hidden border border-foreground/10">
              <QRScanner onScan={(result) => { setQrCode(result); setShowScanner(false) }} />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Chemical Compound</label>
          <select className="input-field" value={chemicalCompound} onChange={(e) => setChemicalCompound(e.target.value as ChemicalCompound)}>
            {(Object.keys(COMPOUND_LABELS) as ChemicalCompound[]).map((c) => (
              <option key={c} value={c}>{COMPOUND_LABELS[c]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Unit *</label>
          <input type="text" required className="input-field" placeholder="e.g. kg, L, bar" value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Capacity *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              className="input-field"
              placeholder="e.g. 50"
              value={fullCapacity}
              onChange={(e) => setFullCapacity(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Current Capacity *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              className="input-field"
              placeholder="e.g. 32"
              value={currentCapacity}
              onChange={(e) => setCurrentCapacity(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Notes</label>
          <textarea className="input-field resize-none" rows={2} placeholder="Optional notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </section>

      {/* Photos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Photos</h2>
        <input ref={imageInputRef} type="file" accept="image/*,.heic,.heif" multiple className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (mode === 'create') files.forEach(addPendingImage)
            else files.forEach((f) => processAndUploadImage(f))
            e.target.value = ''
          }}
        />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            if (mode === 'create') addPendingImage(file)
            else processAndUploadImage(file)
            e.target.value = ''
          }}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => imageInputRef.current?.click()} className="btn-ghost text-sm">Upload Photo</button>
          <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn-ghost text-sm">Take Photo</button>
        </div>

        {pendingImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {pendingImages.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-foreground/10 bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt={p.file.name} className="w-full h-full object-cover opacity-60" />
                <button type="button" onClick={() => removePendingImage(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-500/80 transition-colors" aria-label="Remove">&times;</button>
              </div>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div key={img.id ?? i} className="relative aspect-square rounded-lg overflow-hidden border border-foreground/10 bg-surface">
                {img.uploading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : img.error ? (
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <p className="text-red-400 text-xs text-center">{img.error}</p>
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.fileName} className="w-full h-full object-cover" />
                    {img.id && (
                      <button type="button" onClick={() => setConfirmTarget({ kind: 'image', id: img.id!, name: img.fileName })} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-500/80 transition-colors" aria-label="Delete">&times;</button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Documents */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Documents</h2>
        <input ref={docInputRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            openDocDraft(file)
            e.target.value = ''
          }}
        />
        <button type="button" onClick={() => docInputRef.current?.click()} className="btn-ghost text-sm">Upload PDF</button>

        {docDraft && (
          <div className="card space-y-3">
            <p className="text-xs text-muted font-medium uppercase tracking-wider">New document: {docDraft.file.name}</p>
            <div>
              <label className="block text-xs font-medium mb-1">Title</label>
              <input type="text" className="input-field" value={docDraft.title} onChange={(e) => setDocDraft((d) => d ? { ...d, title: e.target.value } : d)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Type</label>
              <select className="input-field" value={docDraft.type} onChange={(e) => setDocDraft((d) => d ? { ...d, type: e.target.value as DocType } : d)}>
                <option value="Manual">Manual</option>
                <option value="Certificate">Certificate</option>
                <option value="Other">Other</option>
                <option value="Bill">Bill</option>
                <option value="Order">Order</option>
                <option value="Invoice">Invoice</option>
                <option value="ServiceReport">Service Report</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={commitDocDraft} className="btn-primary text-sm py-1.5 px-3">Add</button>
              <button type="button" onClick={() => setDocDraft(null)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        )}

        {pendingDocuments.length > 0 && (
          <div className="space-y-2">
            {pendingDocuments.map((p, i) => (
              <div key={i} className="card flex items-center justify-between gap-3 opacity-60">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-muted text-xs">{p.type} &middot; {p.file.name} &middot; {formatBytes(p.file.size)}</p>
                </div>
                <button type="button" onClick={() => removePendingDocument(i)} className="text-red-400/60 hover:text-red-400 text-xs transition-colors shrink-0">Remove</button>
              </div>
            ))}
          </div>
        )}

        {documents.length > 0 && (
          <div className="space-y-2">
            {documents.map((doc, i) => (
              <div key={doc.id ?? i} className="card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-muted text-xs">{doc.type} &middot; {doc.fileName} &middot; {formatBytes(doc.fileSize)}</p>
                  {doc.error && <p className="text-red-400 text-xs">{doc.error}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.uploading && <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />}
                  {doc.id && (
                    <button type="button" onClick={() => setConfirmTarget({ kind: 'document', id: doc.id!, name: doc.title })} className="text-red-400/60 hover:text-red-400 text-xs transition-colors">Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Logbook - edit mode only */}
      {mode === 'edit' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Logbook</h2>
            {!logDraft && (
              <button
                type="button"
                onClick={() => setLogDraft({ date: new Date().toISOString().slice(0, 10), comment: '' })}
                className="text-brand text-sm hover:underline"
              >
                + Add Entry
              </button>
            )}
          </div>

          {logDraft && (
            <div className="card space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Date</label>
                  <input type="date" className="input-field" value={logDraft.date} onChange={(e) => setLogDraft((d) => d ? { ...d, date: e.target.value } : d)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Comment</label>
                  <input type="text" className="input-field" placeholder="e.g. Refilled to 50kg" value={logDraft.comment} onChange={(e) => setLogDraft((d) => d ? { ...d, comment: e.target.value } : d)} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={submitLogEntry} disabled={logSaving || !logDraft.comment.trim()} className="btn-primary text-sm py-1.5 px-3">
                  {logSaving ? 'Saving...' : 'Add Entry'}
                </button>
                <button type="button" onClick={() => setLogDraft(null)} className="btn-ghost text-sm">Cancel</button>
              </div>
            </div>
          )}

          {logbook.length === 0 && !logDraft && (
            <p className="text-muted text-sm">No logbook entries yet.</p>
          )}

          {logbook.length > 0 && (
            <div className="card divide-y divide-foreground/10">
              {logbook.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm">{entry.comment}</p>
                    <p className="text-muted text-xs mt-0.5">
                      {(() => { const d = new Date(entry.date); return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}` })()} &middot; {entry.user.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmTarget({ kind: 'logbook', id: entry.id })}
                    className="text-red-400/60 hover:text-red-400 text-xs transition-colors shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Error + submit */}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 flex-wrap">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : mode === 'create' ? 'Create Tank' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">Cancel</button>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={() => setShowDeleteTank(true)}
            className="ml-auto bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Delete Tank
          </button>
        )}
      </div>

      {showDeleteTank && (
        <ConfirmModal
          title="Delete Tank"
          message={`Are you sure you want to delete "${name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteTank}
          onCancel={() => setShowDeleteTank(false)}
          loading={deletingTank}
        />
      )}

      {confirmTarget && (
        <ConfirmModal
          title={
            confirmTarget.kind === 'image' ? 'Delete photo' :
            confirmTarget.kind === 'document' ? 'Delete document' : 'Delete logbook entry'
          }
          message={
            confirmTarget.kind === 'logbook'
              ? 'Delete this logbook entry? This cannot be undone.'
              : `Delete "${(confirmTarget as { name: string }).name}"? This cannot be undone.`
          }
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmTarget(null)}
          loading={confirmLoading}
        />
      )}
    </form>
  )
}
