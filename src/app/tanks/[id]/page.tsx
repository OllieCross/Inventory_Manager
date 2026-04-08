import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getFileUrl } from '@/lib/minio'
import { formatDate } from '@/lib/utils'
import Header from '@/components/layout/Header'
import CaseGallery from '@/components/media/CaseGallery'
import PDFViewer from '@/components/media/PDFViewer'
import Link from 'next/link'

const COMPOUND_LABELS: Record<string, string> = {
  H2O: 'H\u2082O (Water)',
  O2: 'O\u2082 (Oxygen)',
  CO2: 'CO\u2082 (Carbon Dioxide)',
  C4H10C3H8: 'C\u2084H\u2081\u2080/C\u2083H\u2088 (Butane/Propane)',
  N2: 'N\u2082 (Nitrogen)',
  H2: 'H\u2082 (Hydrogen)',
  LN2: 'LN\u2082 (Liquid Nitrogen)',
  Other: 'Other',
}

export default async function TankPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const tank = await prisma.tank.findUnique({
    where: { id },
    include: {
      images: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      documents: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      logbook: {
        orderBy: { date: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  })

  if (!tank) notFound()

  const canEdit = ['EDITOR', 'ADMIN'].includes(session.user.role)

  const imageUrls = await Promise.all(
    tank.images.map(async (img) => ({
      url: await getFileUrl(img.fileKey),
      fileName: img.fileName,
    }))
  )

  const documentUrls = await Promise.all(
    tank.documents.map(async (doc) => ({
      url: await getFileUrl(doc.fileKey),
      title: doc.title,
      type: doc.type,
      fileName: doc.fileName,
    }))
  )

  const fillPct = tank.fullCapacity > 0
    ? Math.min(100, Math.round((tank.currentCapacity / tank.fullCapacity) * 100))
    : 0
  const fillColor = fillPct >= 60 ? 'bg-green-500' : fillPct >= 30 ? 'bg-yellow-400' : 'bg-red-500'

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8 pb-16">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{tank.name}</h1>
            <p className="text-sm text-muted mt-1">{COMPOUND_LABELS[tank.chemicalCompound] ?? tank.chemicalCompound}</p>
          </div>
          {canEdit && (
            <Link href={`/tanks/${id}/edit`} className="btn-ghost p-2 rounded-lg shrink-0" aria-label="Edit tank">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </Link>
          )}
        </div>

        {/* Capacity */}
        <section className="card space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Capacity</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Current</span>
            <span className="font-semibold">{tank.currentCapacity} / {tank.fullCapacity} {tank.unit}</span>
          </div>
          <div className="h-3 rounded-full bg-foreground/10 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${fillColor}`} style={{ width: `${fillPct}%` }} />
          </div>
          <p className="text-xs text-muted text-right">{fillPct}% full</p>
        </section>

        {/* Info */}
        <section className="card space-y-2 text-sm">
          {tank.qrCode && (
            <div className="flex gap-3">
              <span className="text-muted w-28 shrink-0">QR Code</span>
              <span className="font-mono">{tank.qrCode}</span>
            </div>
          )}
          {tank.notes && (
            <div className="flex gap-3">
              <span className="text-muted w-28 shrink-0">Notes</span>
              <span className="text-muted">{tank.notes}</span>
            </div>
          )}
        </section>

        {/* Photos */}
        {imageUrls.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">
              Photos <span className="ml-2 text-muted text-sm font-normal">{imageUrls.length}</span>
            </h2>
            <CaseGallery images={imageUrls} />
          </section>
        )}

        {/* Documents */}
        {documentUrls.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Documents</h2>
            <div className="space-y-4">
              {documentUrls.map((doc, i) => (
                <div key={i} className="card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-medium text-sm">{doc.title}</p>
                      <p className="text-muted text-xs mt-0.5">{doc.type} &middot; {doc.fileName}</p>
                    </div>
                  </div>
                  <PDFViewer url={doc.url} title={doc.title} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Logbook */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Logbook <span className="ml-2 text-muted text-sm font-normal">{tank.logbook.length} entries</span>
          </h2>
          {tank.logbook.length === 0 ? (
            <p className="text-muted text-sm">No logbook entries yet.</p>
          ) : (
            <div className="card divide-y divide-foreground/10">
              {tank.logbook.map((entry) => (
                <div key={entry.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm">{entry.comment}</p>
                  <p className="text-muted text-xs mt-0.5">
                    {formatDate(entry.date)} &middot; {entry.user.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-muted text-xs">Added {formatDate(tank.createdAt)}</p>
      </main>
    </>
  )
}
