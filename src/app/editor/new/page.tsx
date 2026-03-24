import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import CaseEditorForm from '@/components/forms/CaseEditorForm'

export default async function NewCasePage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['EDITOR', 'ADMIN'].includes(session.user.role)) redirect('/scan')

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6">New Case</h1>
        <CaseEditorForm mode="create" />
      </main>
    </>
  )
}
