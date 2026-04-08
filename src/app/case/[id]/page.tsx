import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getFileUrl } from '@/lib/minio'
import { formatDate } from '@/lib/utils'
import Header from '@/components/layout/Header'
import CaseGallery from '@/components/media/CaseGallery'
import PDFViewer from '@/components/media/PDFViewer'
import Link from 'next/link'

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const [caseData, recentEvents] = await Promise.all([
    prisma.case.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        devices: { where: { deletedAt: null }, orderBy: { name: 'asc' } },
        images: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
        documents: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
      },
    }),
    prisma.event.findMany({
      where: {
        cases: { some: { caseId: id } },
        startDate: { lte: new Date() },
        status: { in: ['Completed', 'Confirmed'] },
      },
      orderBy: { startDate: 'desc' },
      take: 3,
      select: { id: true, name: true, startDate: true, status: true },
    }),
  ])

  if (!caseData) notFound()

  const canEdit = ['EDITOR', 'ADMIN'].includes(session.user.role)

  // Generate presigned GET URLs server-side (1 hour expiry)
  const imageUrls = await Promise.all(
    caseData.images.map(async (img) => ({
      url: await getFileUrl(img.fileKey),
      fileName: img.fileName,
    }))
  )

  const documentUrls = await Promise.all(
    caseData.documents.map(async (doc) => ({
      url: await getFileUrl(doc.fileKey),
      title: doc.title,
      type: doc.type,
      fileName: doc.fileName,
    }))
  )

  const STATUS_LABELS: Record<string, string> = {
    Working: 'Working', Faulty: 'Faulty', InRepair: 'In Repair',
    Retired: 'Retired', Lost: 'Lost', RentedToFriend: 'Rented to a Friend',
  }
  const STATUS_COLORS: Record<string, string> = {
    Working: 'text-green-400', Faulty: 'text-red-400', InRepair: 'text-yellow-400',
    Retired: 'text-muted', Lost: 'text-red-600', RentedToFriend: 'text-blue-400',
  }

  const hasContent =
    caseData.items.length > 0 || caseData.devices.length > 0 || imageUrls.length > 0 || documentUrls.length > 0

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8 pb-16">

        {/* Case header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{caseData.name}</h1>
            {caseData.description && (
              <p className="text-muted mt-1 text-sm">{caseData.description}</p>
            )}
          </div>
          {canEdit && (
            <Link href={`/editor/${id}`} className="btn-ghost p-2 rounded-lg shrink-0" aria-label="Edit case">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </Link>
          )}
        </div>

        {!hasContent && (
          <p className="text-muted text-sm">This case has no content yet.</p>
        )}

        {/* Gear list */}
        {caseData.items.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">
              Gear List
              <span className="ml-2 text-muted text-sm font-normal">
                {caseData.items.length} items
              </span>
            </h2>
            <div className="card divide-y divide-foreground/10">
              {caseData.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    {item.comment && (
                      <p className="text-muted text-xs mt-0.5">{item.comment}</p>
                    )}
                  </div>
                  <span className="text-muted text-sm ml-4 shrink-0">x{item.quantity}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Devices */}
        {caseData.devices.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">
              Devices
              <span className="ml-2 text-muted text-sm font-normal">
                {caseData.devices.length}
              </span>
            </h2>
            <div className="card divide-y divide-foreground/10">
              {caseData.devices.map((device) => (
                <Link
                  key={device.id}
                  href={`/devices/${device.id}`}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-foreground/5 transition-colors -mx-4 px-4"
                >
                  <div>
                    <p className="font-medium text-sm">{device.name}</p>
                    <p className={`text-xs mt-0.5 ${STATUS_COLORS[device.status] ?? 'text-muted'}`}>
                      {STATUS_LABELS[device.status] ?? device.status}
                    </p>
                  </div>
                  <span className="text-muted text-xl shrink-0" aria-hidden>&#8250;</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Photos */}
        {imageUrls.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">
              Photos
              <span className="ml-2 text-muted text-sm font-normal">{imageUrls.length}</span>
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
                      <p className="text-muted text-xs mt-0.5">
                        {doc.type} &middot; {doc.fileName}
                      </p>
                    </div>
                  </div>
                  <PDFViewer url={doc.url} title={doc.title} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Events */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent Events</h2>
          {recentEvents.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 py-6 text-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <p className="text-muted text-sm">No events yet - this case has not been assigned to any events.</p>
            </div>
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

        {/* Footer meta */}
        <p className="text-muted text-xs">
          Added by {caseData.createdBy.name} on {formatDate(caseData.createdAt)}
          {caseData.updatedBy && (
            <> &middot; Updated by {caseData.updatedBy.name} on {formatDate(caseData.updatedAt)}</>
          )}
        </p>
      </main>
    </>
  )
}
