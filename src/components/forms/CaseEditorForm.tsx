'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { formatBytes } from '@/lib/utils'

const QRScanner = dynamic(() => import('@/components/scanner/QRScanner'), { ssr: false })

// ---------- Types ----------

type ItemRow = {
  id?: string
  name: string
  quantity: number
  comment: string
  sortOrder: number
}

type ImageRow = {
  id?: string
  fileKey?: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string // object URL (new) or presigned URL (existing)
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
  type: 'MANUAL' | 'CERTIFICATE' | 'OTHER'
  url?: string
  uploading?: boolean
  error?: string
}

type Props = {
  mode: 'create' | 'edit'
  caseId?: string
  initialData?: {
    name: string
    description: string
    qrdata: string
    items: ItemRow[]
    images: ImageRow[]
    documents: DocumentRow[]
  }
  allCases?: { id: string; name: string }[]
}

// ---------- Component ----------

export default function CaseEditorForm({ mode, caseId, initialData, allCases = [] }: Props) {
  const router = useRouter()

  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [qrdata, setQrdata] = useState(initialData?.qrdata ?? '')
  const [items, setItems] = useState<ItemRow[]>(initialData?.items ?? [])
  const [images, setImages] = useState<ImageRow[]>(initialData?.images ?? [])
  const [documents, setDocuments] = useState<DocumentRow[]>(initialData?.documents ?? [])
  const [showScanner, setShowScanner] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const imageInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  // ---------- Items ----------

  function addItem() {
    setItems((prev) => [
      ...prev,
      { name: '', quantity: 1, comment: '', sortOrder: prev.length },
    ])
  }

  function updateItem(index: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, sortOrder: i })))
  }

  function moveItem(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= items.length) return
    setItems((prev) => {
      const arr = [...prev]
      ;[arr[index], arr[next]] = [arr[next], arr[index]]
      return arr.map((item, i) => ({ ...item, sortOrder: i }))
    })
  }

  async function moveItemToCase(itemId: string, targetCaseId: string) {
    if (!caseId || !targetCaseId) return
    await fetch(`/api/cases/${caseId}/items/${itemId}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCaseId }),
    })
    setItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  // ---------- Image upload ----------

  async function processAndUploadImage(file: File) {
    const tempId = Math.random().toString(36).slice(2)
    setImages((prev) => [
      ...prev,
      { fileName: file.name, fileSize: file.size, mimeType: file.type, url: '', uploading: true },
    ])

    try {
      let processed: File = file

      // HEIC conversion
      if (
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        file.name.toLowerCase().endsWith('.heic') ||
        file.name.toLowerCase().endsWith('.heif')
      ) {
        const heic2any = (await import('heic2any')).default
        const blob = (await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })) as Blob
        processed = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
          type: 'image/jpeg',
        })
      }

      // Compress
      const imageCompression = (await import('browser-image-compression')).default
      processed = await imageCompression(processed, {
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.8,
      })

      // Get presigned URL
      const urlRes = await fetch('/api/minio/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          type: 'image',
          fileName: processed.name,
          mimeType: processed.type,
        }),
      })
      if (!urlRes.ok) throw new Error('Failed to get upload URL')
      const { url, fileKey } = await urlRes.json()

      // Upload to MinIO
      const uploadRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': processed.type },
        body: processed,
      })
      if (!uploadRes.ok) throw new Error('Upload failed')

      // Record in DB
      const recordRes = await fetch(`/api/cases/${caseId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileKey,
          fileName: processed.name,
          fileSize: processed.size,
          mimeType: processed.type,
        }),
      })
      if (!recordRes.ok) throw new Error('Failed to save image record')
      const saved = await recordRes.json()

      setImages((prev) =>
        prev.map((img) =>
          img.fileName === file.name && img.uploading
            ? { ...saved, url: URL.createObjectURL(processed), uploading: false }
            : img
        )
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setImages((prev) =>
        prev.map((img) =>
          img.fileName === file.name && img.uploading
            ? { ...img, uploading: false, error: msg }
            : img
        )
      )
    }

    void tempId
  }

  async function deleteImage(imageId: string) {
    if (!caseId) return
    await fetch(`/api/cases/${caseId}/images/${imageId}`, { method: 'DELETE' })
    setImages((prev) => prev.filter((img) => img.id !== imageId))
  }

  // ---------- Document upload ----------

  async function uploadDocument(file: File, title: string, type: DocumentRow['type']) {
    setDocuments((prev) => [
      ...prev,
      { fileName: file.name, fileSize: file.size, mimeType: file.type, title, type, uploading: true },
    ])

    try {
      const urlRes = await fetch('/api/minio/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          type: 'document',
          fileName: file.name,
          mimeType: file.type,
        }),
      })
      if (!urlRes.ok) throw new Error('Failed to get upload URL')
      const { url, fileKey } = await urlRes.json()

      const uploadRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) throw new Error('Upload failed')

      const recordRes = await fetch(`/api/cases/${caseId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          fileKey,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      })
      if (!recordRes.ok) throw new Error('Failed to save document record')
      const saved = await recordRes.json()

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.fileName === file.name && doc.uploading
            ? { ...saved, uploading: false }
            : doc
        )
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.fileName === file.name && doc.uploading
            ? { ...doc, uploading: false, error: msg }
            : doc
        )
      )
    }
  }

  async function deleteDocument(docId: string) {
    if (!caseId) return
    await fetch(`/api/cases/${caseId}/documents/${docId}`, { method: 'DELETE' })
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId))
  }

  function handleDocumentFilePick(file: File) {
    const title = prompt('Document title:', file.name.replace(/\.pdf$/i, '')) ?? file.name
    const type = (prompt('Type (MANUAL / CERTIFICATE / OTHER):', 'MANUAL') ?? 'MANUAL') as DocumentRow['type']
    uploadDocument(file, title, type)
  }

  // ---------- Submit ----------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (mode === 'create') {
        const res = await fetch('/api/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            qrdata,
            items: items.map(({ id: _id, ...rest }) => rest),
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to create case')
        }
        const created = await res.json()
        router.push(`/editor/${created.id}`)
      } else {
        const res = await fetch(`/api/cases/${caseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, items }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to update case')
        }
        router.push(`/case/${caseId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
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
          <label className="block text-sm font-medium mb-1.5">Case Name *</label>
          <input
            type="text"
            required
            className="input-field"
            placeholder="e.g. Main PA Rack"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            className="input-field resize-none"
            rows={2}
            placeholder="Optional notes about this case"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </section>

      {/* QR Data (create mode only) */}
      {mode === 'create' && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">QR Code</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5">QR Data *</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                className="input-field"
                placeholder="Scan or type the code from the sticker"
                value={qrdata}
                onChange={(e) => setQrdata(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowScanner((v) => !v)}
                className="btn-ghost shrink-0 text-sm"
              >
                {showScanner ? 'Hide' : 'Scan'}
              </button>
            </div>
          </div>
          {showScanner && (
            <div className="rounded-xl overflow-hidden border border-white/10">
              <QRScanner
                onScan={(result) => {
                  setQrdata(result)
                  setShowScanner(false)
                }}
              />
            </div>
          )}
          <p className="text-muted text-xs">
            This is the raw payload from the physical sticker - not a URL. Legacy Google Keep URLs are also supported.
          </p>
        </section>
      )}

      {/* Gear list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Gear List</h2>
          <button type="button" onClick={addItem} className="text-brand text-sm hover:underline">
            + Add Item
          </button>
        </div>

        {items.length === 0 && (
          <p className="text-muted text-sm">No items yet.</p>
        )}

        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="card flex gap-2 items-start">
              <div className="flex flex-col gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => moveItem(i, -1)}
                  disabled={i === 0}
                  className="text-muted hover:text-foreground disabled:opacity-20 text-xs leading-none"
                  aria-label="Move up"
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(i, 1)}
                  disabled={i === items.length - 1}
                  className="text-muted hover:text-foreground disabled:opacity-20 text-xs leading-none"
                  aria-label="Move down"
                >
                  &darr;
                </button>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                <input
                  type="text"
                  required
                  className="input-field col-span-2"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateItem(i, 'name', e.target.value)}
                />
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Comment (optional)"
                  value={item.comment}
                  onChange={(e) => updateItem(i, 'comment', e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1 pt-1">
                {mode === 'edit' && item.id && allCases.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) moveItemToCase(item.id!, e.target.value)
                    }}
                    className="text-xs bg-surface border border-white/10 rounded text-muted"
                    defaultValue=""
                    title="Move to another case"
                  >
                    <option value="">Move...</option>
                    {allCases.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
                  aria-label="Remove item"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Photos - edit mode only (need a caseId to upload) */}
      {mode === 'edit' && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Photos</h2>

          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="hidden"
            onChange={(e) => {
              Array.from(e.target.files ?? []).forEach(processAndUploadImage)
              e.target.value = ''
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) processAndUploadImage(e.target.files[0])
              e.target.value = ''
            }}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="btn-ghost text-sm"
            >
              Upload Photo
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="btn-ghost text-sm"
            >
              Take Photo
            </button>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <div key={img.id ?? i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-surface">
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
                        <button
                          type="button"
                          onClick={() => deleteImage(img.id!)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-500/80 transition-colors"
                          aria-label="Delete photo"
                        >
                          &times;
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Documents - edit mode only */}
      {mode === 'edit' && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Documents</h2>

          <input
            ref={docInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleDocumentFilePick(e.target.files[0])
              e.target.value = ''
            }}
          />

          <button
            type="button"
            onClick={() => docInputRef.current?.click()}
            className="btn-ghost text-sm"
          >
            Upload PDF
          </button>

          {documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((doc, i) => (
                <div key={doc.id ?? i} className="card flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-muted text-xs">
                      {doc.type} &middot; {doc.fileName} &middot; {formatBytes(doc.fileSize)}
                    </p>
                    {doc.error && <p className="text-red-400 text-xs">{doc.error}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.uploading && (
                      <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    )}
                    {doc.id && (
                      <button
                        type="button"
                        onClick={() => deleteDocument(doc.id!)}
                        className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Error + submit */}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : mode === 'create' ? 'Create Case' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>

    </form>
  )
}
