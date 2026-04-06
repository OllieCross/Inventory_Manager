'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { formatBytes } from '@/lib/utils'
import ConfirmModal from '@/components/ui/ConfirmModal'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  type: 'Manual' | 'Certificate' | 'Other' | 'Bill' | 'Order' | 'Invoice' | 'ServiceReport'
  url?: string
  uploading?: boolean
  error?: string
}

// Pending files buffered during create mode (uploaded after case is saved)
type PendingImage = { file: File; previewUrl: string }
type PendingDocument = { file: File; title: string; type: DocumentRow['type'] }

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

// ---------- Helpers ----------

async function uploadImageFile(
  file: File,
  caseId: string,
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
      body: JSON.stringify({ caseId, type: 'image', fileName: processed.name, mimeType: processed.type }),
    })
    if (!urlRes.ok) throw new Error('Failed to get upload URL')
    const { url, fileKey } = await urlRes.json()

    const uploadRes = await fetch(url, { method: 'PUT', headers: { 'Content-Type': processed.type }, body: processed })
    if (!uploadRes.ok) throw new Error('Upload failed')

    const recordRes = await fetch(`/api/cases/${caseId}/images`, {
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
  type: DocumentRow['type'],
  caseId: string,
  onProgress: (state: 'uploading' | 'done' | 'error', result?: DocumentRow) => void
): Promise<void> {
  onProgress('uploading')
  try {
    const urlRes = await fetch('/api/minio/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, type: 'document', fileName: file.name, mimeType: file.type }),
    })
    if (!urlRes.ok) throw new Error('Failed to get upload URL')
    const { url, fileKey } = await urlRes.json()

    const uploadRes = await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
    if (!uploadRes.ok) throw new Error('Upload failed')

    const recordRes = await fetch(`/api/cases/${caseId}/documents`, {
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

export default function CaseEditorForm({ mode, caseId, initialData, allCases = [] }: Props) {
  const router = useRouter()

  const [activeCaseId, setActiveCaseId] = useState(caseId)

  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [qrdata, setQrdata] = useState(initialData?.qrdata ?? '')
  const [items, setItems] = useState<ItemRow[]>(initialData?.items ?? [])
  const [images, setImages] = useState<ImageRow[]>(initialData?.images ?? [])
  const [documents, setDocuments] = useState<DocumentRow[]>(initialData?.documents ?? [])

  // Files buffered in create mode, uploaded after case is saved
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([])

  // Draft document being configured before it is committed
  const [docDraft, setDocDraft] = useState<{ file: File; title: string; type: DocumentRow['type'] } | null>(null)

  const [showScanner, setShowScanner] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Confirm modal state
  type ConfirmTarget =
    | { kind: 'item'; index: number }
    | { kind: 'image'; id: string; name: string }
    | { kind: 'document'; id: string; name: string }
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  // ---------- Items ----------

  function addItem() {
    setItems((prev) => [...prev, { name: '', quantity: 1, comment: '', sortOrder: prev.length }])
  }

  function updateItem(index: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, sortOrder: i })))
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const oldIndex = prev.findIndex((item, i) => (item.id ?? String(i)) === active.id)
      const newIndex = prev.findIndex((item, i) => (item.id ?? String(i)) === over.id)
      return arrayMove(prev, oldIndex, newIndex).map((item, i) => ({ ...item, sortOrder: i }))
    })
  }

  async function moveItemToCase(itemId: string, targetCaseId: string) {
    if (!activeCaseId || !targetCaseId) return
    await fetch(`/api/cases/${activeCaseId}/items/${itemId}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCaseId }),
    })
    setItems((prev) => prev.filter((item) => item.id !== itemId))
  }

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

  async function processAndUploadImage(file: File) {
    const placeholder: ImageRow = { fileName: file.name, fileSize: file.size, mimeType: file.type, url: '', uploading: true }
    setImages((prev) => [...prev, placeholder])
    await uploadImageFile(file, activeCaseId!, (state, result) => {
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
    if (!activeCaseId) return
    await fetch(`/api/cases/${activeCaseId}/images/${imageId}`, { method: 'DELETE' })
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

  async function uploadDocument(file: File, title: string, type: DocumentRow['type']) {
    const placeholder: DocumentRow = { fileName: file.name, fileSize: file.size, mimeType: file.type, title, type, uploading: true }
    setDocuments((prev) => [...prev, placeholder])
    await uploadDocumentFile(file, title, type, activeCaseId!, (state, result) => {
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
    if (!activeCaseId) return
    await fetch(`/api/cases/${activeCaseId}/documents/${docId}`, { method: 'DELETE' })
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId))
  }

  async function handleConfirmDelete() {
    if (!confirmTarget) return
    setConfirmLoading(true)
    if (confirmTarget.kind === 'item') {
      removeItem(confirmTarget.index)
    } else if (confirmTarget.kind === 'image') {
      await deleteImage(confirmTarget.id)
    } else if (confirmTarget.kind === 'document') {
      await deleteDocument(confirmTarget.id)
    }
    setConfirmLoading(false)
    setConfirmTarget(null)
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
          body: JSON.stringify({ name, description, qrdata, items: items.map(({ id: _id, ...rest }) => rest) }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to create case')
        }
        const created = await res.json()

        // Upload any buffered files now that we have a caseId
        await Promise.all([
          ...pendingImages.map((p) => processAndUploadImageWithId(p.file, created.id)),
          ...pendingDocuments.map((p) => uploadDocumentWithId(p.file, p.title, p.type, created.id)),
        ])

        router.push(`/case/${created.id}`)
      } else {
        const res = await fetch(`/api/cases/${activeCaseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, qrdata: qrdata || undefined, items }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to update case')
        }
        router.refresh()
        router.push(`/case/${activeCaseId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  // Versions of upload helpers that take an explicit caseId (used during create->edit transition)
  async function processAndUploadImageWithId(file: File, id: string) {
    const placeholder: ImageRow = { fileName: file.name, fileSize: file.size, mimeType: file.type, url: '', uploading: true }
    setImages((prev) => [...prev, placeholder])
    await uploadImageFile(file, id, (state, result) => {
      setImages((prev) =>
        prev.map((img) =>
          img.fileName === file.name && img.uploading
            ? state === 'done' ? result! : { ...img, uploading: false, error: result?.error }
            : img
        )
      )
    })
  }

  async function uploadDocumentWithId(file: File, title: string, type: DocumentRow['type'], id: string) {
    const placeholder: DocumentRow = { fileName: file.name, fileSize: file.size, mimeType: file.type, title, type, uploading: true }
    setDocuments((prev) => [...prev, placeholder])
    await uploadDocumentFile(file, title, type, id, (state, result) => {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.fileName === file.name && doc.uploading
            ? state === 'done' ? { ...result!, uploading: false } : { ...doc, uploading: false, error: result?.error }
            : doc
        )
      )
    })
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

      {/* QR Data */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">QR Code</h2>
        <div>
          <label className="block text-sm font-medium mb-1.5">QR Data {mode === 'create' ? '*' : ''}</label>
          <div className="flex gap-2">
            <input
              type="text"
              required={mode === 'create'}
              className="input-field"
              placeholder="Scan or type the code from the sticker"
              value={qrdata}
              onChange={(e) => setQrdata(e.target.value)}
            />
            <button type="button" onClick={() => setShowScanner((v) => !v)} className="btn-ghost shrink-0 text-sm">
              {showScanner ? 'Hide' : 'Scan'}
            </button>
          </div>
        </div>
        {showScanner && (
          <div className="rounded-xl overflow-hidden border border-white/10">
            <QRScanner onScan={(result) => { setQrdata(result); setShowScanner(false) }} />
          </div>
        )}
        <p className="text-muted text-xs">
          This is the raw payload from the physical sticker - not a URL. Legacy Google Keep URLs are also supported.
        </p>
      </section>

      {/* Gear list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Gear List</h2>
          <button type="button" onClick={addItem} className="text-brand text-sm hover:underline">+ Add Item</button>
        </div>
        {items.length === 0 && <p className="text-muted text-sm">No items yet.</p>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={items.map((item, i) => item.id ?? String(i))}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {items.map((item, i) => (
                <SortableItemRow
                  key={item.id ?? i}
                  id={item.id ?? String(i)}
                  item={item}
                  index={i}
                  mode={mode}
                  allCases={allCases}
                  onUpdate={updateItem}
                  onMoveToCase={moveItemToCase}
                  onRemove={() => setConfirmTarget({ kind: 'item', index: i })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      {/* Photos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Photos</h2>

        <input ref={imageInputRef} type="file" accept="image/*,.heic,.heif" multiple className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (mode === 'create') files.forEach(addPendingImage)
            else files.forEach(processAndUploadImage)
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

        {/* Pending previews (create mode) */}
        {pendingImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {pendingImages.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt={p.file.name} className="w-full h-full object-cover opacity-60" />
                <button type="button" onClick={() => removePendingImage(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-500/80 transition-colors" aria-label="Remove photo">×</button>
              </div>
            ))}
          </div>
        )}

        {/* Uploaded images (edit mode) */}
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
                      <button type="button" onClick={() => setConfirmTarget({ kind: 'image', id: img.id!, name: img.fileName })} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-500/80 transition-colors" aria-label="Delete photo">&times;</button>
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

        {/* Inline draft - shown after a file is selected, before it is committed */}
        {docDraft && (
          <div className="card space-y-3">
            <p className="text-xs text-muted font-medium uppercase tracking-wider">New document: {docDraft.file.name}</p>
            <div>
              <label className="block text-xs font-medium mb-1">Title</label>
              <input
                type="text"
                className="input-field"
                value={docDraft.title}
                onChange={(e) => setDocDraft((d) => d ? { ...d, title: e.target.value } : d)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Type</label>
              <select
                className="input-field"
                value={docDraft.type}
                onChange={(e) => setDocDraft((d) => d ? { ...d, type: e.target.value as DocumentRow['type'] } : d)}
              >
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

        {/* Pending documents (create mode) */}
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

        {/* Uploaded documents (edit mode) */}
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

      {/* Error + submit */}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : mode === 'create' ? 'Create Case' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">Cancel</button>
      </div>

      {confirmTarget && (
        <ConfirmModal
          title={
            confirmTarget.kind === 'item' ? 'Remove item' :
            confirmTarget.kind === 'image' ? 'Delete photo' : 'Delete document'
          }
          message={
            confirmTarget.kind === 'item'
              ? 'Remove this item from the gear list?'
              : `Delete "${confirmTarget.name}"? This cannot be undone.`
          }
          confirmLabel={confirmTarget.kind === 'item' ? 'Remove' : 'Delete'}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmTarget(null)}
          loading={confirmLoading}
        />
      )}

    </form>
  )
}

// ---------- Sortable item row ----------

type SortableItemRowProps = {
  id: string
  item: ItemRow
  index: number
  mode: 'create' | 'edit'
  allCases: { id: string; name: string }[]
  onUpdate: (index: number, field: keyof ItemRow, value: string | number) => void
  onMoveToCase: (itemId: string, targetCaseId: string) => void
  onRemove: () => void
}

function SortableItemRow({ id, item, index, mode, allCases, onUpdate, onMoveToCase, onRemove }: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="card flex gap-2 items-start">
      {/* Drag handle */}
      <button
        type="button"
        className="text-muted hover:text-foreground pt-2 cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>
      <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
        <input type="text" required className="input-field col-span-2" placeholder="Item name" value={item.name} onChange={(e) => onUpdate(index, 'name', e.target.value)} />
        <input type="number" min={1} className="input-field" placeholder="Qty" value={item.quantity} onChange={(e) => onUpdate(index, 'quantity', parseInt(e.target.value) || 1)} />
        <input type="text" className="input-field" placeholder="Comment (optional)" value={item.comment} onChange={(e) => onUpdate(index, 'comment', e.target.value)} />
      </div>
      <div className="flex flex-col gap-1 pt-1">
        {mode === 'edit' && item.id && allCases.length > 0 && (
          <select onChange={(e) => { if (e.target.value) onMoveToCase(item.id!, e.target.value) }} className="text-xs bg-surface border border-white/10 rounded text-muted" defaultValue="" title="Move to another case">
            <option value="">Move...</option>
            {allCases.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <button type="button" onClick={onRemove} className="text-red-400/60 hover:text-red-400 text-xs transition-colors" aria-label="Remove item">Remove</button>
      </div>
    </div>
  )
}
