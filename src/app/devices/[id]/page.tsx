import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getFileUrl } from '@/lib/minio'
import { formatDate } from '@/lib/utils'
import Header from '@/components/layout/Header'
import CaseGallery from '@/components/media/CaseGallery'
import PDFViewer from '@/components/media/PDFViewer'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  Working: 'Working',
  Faulty: 'Faulty',
  InRepair: 'In Repair',
  Retired: 'Retired',
  Lost: 'Lost',
  RentedToFriend: 'Rented to a Friend',
}

const STATUS_COLORS: Record<string, string> = {
  Working: 'text-green-400',
  Faulty: 'text-red-400',
  InRepair: 'text-yellow-400',
  Retired: 'text-muted',
  Lost: 'text-red-600',
  RentedToFriend: 'text-blue-400',
}

function relativeTime(date: Date): string {
  const months = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 1) return 'less than a month ago'
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`
  const years = Math.round(months / 12)
  return `${years} year${years !== 1 ? 's' : ''} ago`
}

export default async function DevicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const [device, recentEvents] = await Promise.all([
    prisma.device.findUnique({
      where: { id },
      include: {
        case: { select: { id: true, name: true } },
        images: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
        documents: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
        logbook: {
          orderBy: { date: 'desc' },
          include: { user: { select: { name: true } } },
        },
      },
    }),
    prisma.event.findMany({
      where: {
        devices: { some: { deviceId: id } },
        startDate: { lte: new Date() },
        status: { in: ['Completed', 'Confirmed'] },
      },
      orderBy: { startDate: 'desc' },
      take: 3,
      select: { id: true, name: true, startDate: true, status: true },
    }),
  ])

  if (!device) notFound()

  const canEdit = ['EDITOR', 'ADMIN'].includes(session.user.role)

  const imageUrls = await Promise.all(
    device.images.map(async (img) => ({
      url: await getFileUrl(img.fileKey),
      fileName: img.fileName,
    }))
  )

  const documentUrls = await Promise.all(
    device.documents.map(async (doc) => ({
      url: await getFileUrl(doc.fileKey),
      title: doc.title,
      type: doc.type,
      fileName: doc.fileName,
    }))
  )

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8 pb-16">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{device.name}</h1>
            <p className={`text-sm font-medium mt-1 ${STATUS_COLORS[device.status] ?? 'text-muted'}`}>
              {STATUS_LABELS[device.status] ?? device.status}
            </p>
          </div>
          {canEdit && (
            <Link href={`/devices/${id}/edit`} className="btn-ghost p-2 rounded-lg shrink-0" aria-label="Edit device">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </Link>
          )}
        </div>

        {/* Info */}
        <section className="card space-y-2 text-sm">
          <div className="flex gap-3">
            <span className="text-muted w-28 shrink-0">QR Code</span>
            <span className="font-mono">{device.qrCode}</span>
          </div>
          {device.serialNumber && (
            <div className="flex gap-3">
              <span className="text-muted w-28 shrink-0">Serial No.</span>
              <span>{device.serialNumber}</span>
            </div>
          )}
          {device.purchaseDate && (
            <div className="flex gap-3">
              <span className="text-muted w-28 shrink-0">Purchased</span>
              <span>{formatDate(device.purchaseDate)} <span className="text-muted">({relativeTime(device.purchaseDate)})</span></span>
            </div>
          )}
          {device.case && (
            <div className="flex gap-3">
              <span className="text-muted w-28 shrink-0">In Case</span>
              <Link href={`/case/${device.case.id}`} className="text-brand hover:underline">
                {device.case.name}
              </Link>
            </div>
          )}
          {device.notes && (
            <div className="flex gap-3">
              <span className="text-muted w-28 shrink-0">Notes</span>
              <span className="text-muted">{device.notes}</span>
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
            Logbook <span className="ml-2 text-muted text-sm font-normal">{device.logbook.length} entries</span>
          </h2>
          {device.logbook.length === 0 ? (
            <p className="text-muted text-sm">No logbook entries yet.</p>
          ) : (
            <div className="card divide-y divide-foreground/10">
              {device.logbook.map((entry) => (
                <div key={entry.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm">{entry.comment}</p>
                  <p className="text-muted text-xs mt-0.5">
                    {formatDate(entry.date)} &middot; {entry.user.name}
                  </p>
                </div>
              ))}
            </div>
          )}
          {canEdit && (
            <div className="mt-3">
              <Link href={`/devices/${id}/edit`} className="btn-secondary w-full text-sm text-center block">
                + Add logbook entry
              </Link>
            </div>
          )}
        </section>

        {/* Recent Events */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent Events</h2>
          {recentEvents.length === 0 ? (
            <p className="text-muted text-sm">No recent events.</p>
          ) : (
            <div className="card divide-y divide-foreground/10 p-0 overflow-hidden">
              {recentEvents.map((ev) => (
                <Link key={ev.id} href={`/events/${ev.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-foreground/5 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{ev.name}</p>
                    <p className="text-xs text-muted mt-0.5">{formatDate(ev.startDate)}</p>
                  </div>
                  <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <p className="text-muted text-xs">Added {formatDate(device.createdAt)}</p>
      </main>
    </>
  )
}
