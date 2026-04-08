import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getFileUrl } from '@/lib/minio'
import Header from '@/components/layout/Header'
import CaseEditorForm from '@/components/forms/CaseEditorForm'

export default async function EditCasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) redirect('/scan')
  const isAdmin = session.user.role === 'ADMIN'

  const { id } = await params

  const [caseData, allCases] = await Promise.all([
    prisma.case.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        images: { orderBy: { createdAt: 'asc' } },
        documents: { orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.case.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!caseData) notFound()

  // Generate presigned GET URLs for existing files
  const images = await Promise.all(
    caseData.images.map(async (img) => ({
      id: img.id,
      fileKey: img.fileKey,
      fileName: img.fileName,
      fileSize: img.fileSize,
      mimeType: img.mimeType,
      url: await getFileUrl(img.fileKey),
    }))
  )

  const documents = await Promise.all(
    caseData.documents.map(async (doc) => ({
      id: doc.id,
      fileKey: doc.fileKey,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      title: doc.title,
      type: doc.type,
      url: await getFileUrl(doc.fileKey),
    }))
  )

  const initialData = {
    name: caseData.name,
    description: caseData.description ?? '',
    qrdata: caseData.qrdata,
    items: caseData.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      comment: item.comment ?? '',
      sortOrder: item.sortOrder,
    })),
    images,
    documents,
  }

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6">Edit Case</h1>
        <CaseEditorForm
          mode="edit"
          caseId={id}
          isAdmin={isAdmin}
          initialData={initialData}
          allCases={allCases.filter((c) => c.id !== id)}
        />
      </main>
    </>
  )
}
