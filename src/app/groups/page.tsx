import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Header from '@/components/layout/Header'

export default async function GroupsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const canEdit = ['EDITOR', 'ADMIN'].includes(session.user.role)

  const groups = await prisma.group.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { cases: true, devices: true, items: true, consumables: true } },
    },
  })

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Groups</h1>
          {canEdit && (
            <Link href="/groups/new" className="btn-primary text-sm">+ New Group</Link>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-muted text-sm font-medium">No groups yet.</p>
            <p className="text-muted text-xs max-w-xs">Groups let you bundle cases, devices, and consumables into reusable templates for events.</p>
            {canEdit && (
              <Link href="/groups/new" className="btn-primary text-sm mt-2">+ New Group</Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => {
              const total = g._count.cases + g._count.devices + g._count.items + g._count.consumables
              return (
                <div key={g.id} className="card flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{g.name}</p>
                    <p className="text-muted text-xs mt-0.5">
                      {total} member{total !== 1 ? 's' : ''}
                      {g._count.cases > 0 && ` · ${g._count.cases} case${g._count.cases !== 1 ? 's' : ''}`}
                      {g._count.devices > 0 && ` · ${g._count.devices} device${g._count.devices !== 1 ? 's' : ''}`}
                      {g._count.items > 0 && ` · ${g._count.items} item${g._count.items !== 1 ? 's' : ''}`}
                      {g._count.consumables > 0 && ` · ${g._count.consumables} consumable${g._count.consumables !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  {canEdit && (
                    <Link href={`/groups/${g.id}/edit`} className="btn-primary text-xs py-1.5 px-3 shrink-0">
                      Edit
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
