import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getFileUrl } from '@/lib/minio'
import { formatDate } from '@/lib/utils'
import Header from '@/components/layout/Header'
import CaseGallery from '@/components/media/CaseGallery'
import PDFViewer from '@/components/media/PDFViewer'

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const caseData = await prisma.case.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      images: { orderBy: { createdAt: 'asc' } },
      documents: { orderBy: { createdAt: 'asc' } },
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
    },
  })

  if (!caseData) notFound()

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

  const hasContent =
    caseData.items.length > 0 || imageUrls.length > 0 || documentUrls.length > 0

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8 pb-16">

        {/* Case header */}
        <div>
          <h1 className="text-2xl font-bold">{caseData.name}</h1>
          {caseData.description && (
            <p className="text-muted mt-1 text-sm">{caseData.description}</p>
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
            <div className="card divide-y divide-white/10">
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
