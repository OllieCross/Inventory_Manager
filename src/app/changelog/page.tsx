import { readFileSync } from 'fs'
import path from 'path'
import { marked } from 'marked'
import Link from 'next/link'

export const metadata = {
  title: 'Changelog - SFXProOne CaseManager',
}

export default function ChangelogPage() {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md')
  const markdown = readFileSync(filePath, 'utf-8')
  const html = marked(markdown) as string

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/scan" className="text-sm text-muted hover:text-foreground transition-colors">
          ← Back
        </Link>
      </div>

      <article
        className="prose-changelog"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
