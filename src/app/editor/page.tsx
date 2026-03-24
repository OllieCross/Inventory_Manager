import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import DeleteCaseButton from '@/components/editor/DeleteCaseButton'

export default async function EditorPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) redirect('/scan')

  const cases = await prisma.case.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { items: true, images: true, documents: true } },
      createdBy: { select: { name: true } },
    },
  })

  const isAdmin = session.user.role === 'ADMIN'

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Cases</h1>
          <Link href="/editor/new" className="btn-primary text-sm">
            + New Case
          </Link>
        </div>

        {cases.length === 0 && (
          <p className="text-muted text-sm">No cases yet. Create one to get started.</p>
        )}

        <div className="space-y-2">
          {cases.map((c) => (
            <div key={c.id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.name}</p>
                <p className="text-muted text-xs mt-0.5">
                  {c._count.items} items &middot; {c._count.images} photos &middot; {c._count.documents} docs
                  &middot; by {c.createdBy.name}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/case/${c.id}`}
                  className="text-muted hover:text-foreground text-xs transition-colors"
                >
                  View
                </Link>
                <Link
                  href={`/editor/${c.id}`}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  Edit
                </Link>
                {isAdmin && <DeleteCaseButton caseId={c.id} caseName={c.name} />}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
