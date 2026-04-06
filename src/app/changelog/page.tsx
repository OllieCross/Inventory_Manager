import { readFileSync } from 'fs'
import path from 'path'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import Header from '@/components/layout/Header'

export const metadata = {
  title: 'Changelog - SFXProOne CaseManager',
}

export default function ChangelogPage() {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md')
  const markdown = readFileSync(filePath, 'utf-8')
  const html = DOMPurify.sanitize(marked(markdown) as string)

  return (
    <>
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <article
          className="prose-changelog"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </>
  )
}
