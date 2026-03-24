# SFXProOne CaseManager - Build Phases

This document tracks the implementation plan for the full-stack CaseManager application.
Each phase builds on the previous one and results in a testable milestone.

---

## Phase 1 - Project Scaffold & Infrastructure [COMPLETE]

Goal: Every config file, environment variable, and database table is in place.
Nothing runs in the browser yet, but the foundation is solid.

Files written:

- `package.json` - all npm dependencies and scripts
- `tsconfig.json` - TypeScript compiler options, path aliases
- `next.config.mjs` - Next.js 15 standalone output, MinIO image domains
- `tailwind.config.ts` - brand colours (#1576bf, #0a0a0a, #fcfcfc), font stack
- `postcss.config.mjs` - Tailwind + autoprefixer pipeline
- `.eslintrc.json` - next/core-web-vitals + next/typescript rules
- `.prettierrc` - single quotes, no semis, 100-char line width
- `prisma/schema.prisma` - User, Case, Item, Image, Document models + Role/DocType enums
- `prisma/seed.ts` - admin, viewer, 3 sample cases (audio rack, machine, legacy Keep)
- `.env` / `.env.example` - DATABASE_URL, Redis, MinIO, NextAuth, Authentik vars
- `docker-compose.yml` - postgres:17, redis:7, minio, nextjs-app with Traefik labels
- `.dockerignore` - excludes node_modules, .next, .git, .env, infrastructure/
- `next-env.d.ts` - Next.js TypeScript reference declarations

Verified by:

1. `npm install` - no errors
2. `npx prisma validate` - schema valid
3. `docker compose up postgres redis minio -d` - all 3 containers healthy
4. `npx prisma migrate dev --name init` - migration applied
5. `npm run db:seed` - 2 users and 3 cases seeded

---

## Phase 2 - Core Library Files [COMPLETE]

Goal: All shared server utilities and client hooks are written and type-check cleanly.
No UI yet, but all business logic building blocks exist.

Files written:

- `src/lib/prisma.ts` - singleton PrismaClient with hot-reload guard
- `src/lib/auth.ts` - NextAuth v5: credentials provider + optional Authentik OIDC, JWT strategy, role in session
- `src/lib/minio.ts` - AWS SDK v3 S3Client pointed at MinIO, ensureBucket() helper
- `src/lib/redis.ts` - ioredis singleton with lazy connect
- `src/lib/utils.ts` - cn() (clsx + tailwind-merge), formatBytes(), formatDate()
- `src/types/next-auth.d.ts` - extends Session with user.id and user.role
- `src/types/case.d.ts` - CaseWithRelations, ItemInput, CaseFormData types
- `src/hooks/usePermissions.ts` - isViewer / isEditor / isAdmin derived from session role
- `src/hooks/useUpload.ts` - XHR upload with progress via presigned URL

Verified by:

- `npx tsc --noEmit` - zero errors

---

## Phase 3 - API Routes [COMPLETE]

Goal: All backend endpoints are functional and secured by role.
Can be tested with curl or Postman before any UI exists.

Files written:

- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth GET/POST handler
- `src/app/api/cases/route.ts` - GET all cases (any auth), POST create (EDITOR+)
- `src/app/api/cases/[id]/route.ts` - GET one, PUT update with item diff, DELETE (ADMIN only)
- `src/app/api/minio/presigned-url/route.ts` - generates 5-min presigned PUT URL, validates mime type

Security applied:

- All routes check session; return 401 if missing
- Role checks return 403 for insufficient role
- Zod validation on all request bodies; returns 422 on invalid input
- MIME type allowlist for uploads (jpeg/png/webp/heic for images, pdf for documents)
- QR data uniqueness enforced at DB level and checked before insert

Verified by:

- `npx tsc --noEmit` - zero errors

---

## Phase 4 - Layout, Auth Pages & Navigation [PENDING]

Goal: The app runs in the browser. You can log in with the seeded admin account
and see a working header with role-aware navigation.

Files to write:

- `src/app/globals.css` - Tailwind base, global dark background, font
- `src/app/layout.tsx` - root HTML shell, SessionProvider, font class
- `src/app/page.tsx` - home redirect (logged in -> /scan, logged out -> /login)
- `src/app/login/page.tsx` - credentials login form with error display
- `src/components/layout/Header.tsx` - logo, nav links gated by role, sign-out button
- `src/components/layout/AuthGuard.tsx` - client component enforcing minimum role

Verified by:

- `npm run dev` starts without errors
- Browser loads at <http://localhost:3000> and redirects to /login
- Login with <admin@sfxproone.com> / admin123 succeeds
- Header shows correct name and role
- Sign out returns to /login

---

## Phase 5 - Case Viewer (Scan + View) [PENDING]

Goal: A stagehand can scan a QR code or type a case ID and see the full case contents
including gear list, images, and PDF documents.

Files to write:

- `src/app/scan/page.tsx` - camera scanner page
- `src/app/case/[id]/page.tsx` - case detail page (gear list, gallery, documents)
- `src/components/scanner/QRScanner.tsx` - html5-qrcode wrapper, handles legacy Google Keep URLs
- `src/components/media/CaseGallery.tsx` - image lightbox / swipe viewer
- `src/components/media/PDFViewer.tsx` - pdf.js embed for viewing manuals in-browser

QR handling logic:

- Raw string (new stickers) -> look up by qrdata field directly
- Google Keep URL (legacy) -> strip prefix, look up by qrdata field directly
- Both cases resolve to the same GET /api/cases?qrdata=... lookup

Verified by:

- Scanning SAMPLE-AUDIO-001 (or typing it) shows the Main PA Case gear list
- Scanning the legacy Keep URL shows the Legacy Mic Case
- VIEWER role can see all content but has no edit buttons

---

## Phase 6 - Case Editor (Create + Edit + Upload) [PENDING]

Goal: An editor can create new cases, edit gear lists, upload images and PDFs,
and move items between cases.

Files to write:

- `src/app/editor/page.tsx` - list all cases with edit/delete actions
- `src/app/editor/new/page.tsx` - new case form: name, description, QR scan or manual entry, initial items
- `src/components/forms/CaseEditorForm.tsx` - full editor form with:
  - drag-to-reorder item list
  - HEIC -> JPEG conversion via heic2any before upload
  - image resize/compress (max 1920px, quality 0.8) via browser-image-compression
  - camera capture or file picker for photos
  - PDF upload
  - move item to another case

Verified by:

- Editor can create a new case with items
- Editor can upload a HEIC photo from iPhone and it appears in the gallery as JPEG
- Editor can upload a PDF and it opens in the PDF viewer
- Editor can move an item to a different case
- VIEWER sees the updated case content
- VIEWER cannot access /editor routes (redirected)

---

## Phase 7 - Admin Panel, Security Hardening & Deployment [PENDING]

Goal: Admin dashboard, rate-limiting, Dockerfile, Traefik config, and server deployment.

Files to write:

- `src/app/admin/page.tsx` - user list, role assignment, basic audit log placeholder
- Rate-limiting middleware using Redis (applied to login + presigned URL routes)
- `Dockerfile` - multi-stage build: deps -> builder -> runner (standalone output)
- `infrastructure/traefik/traefik.yml` - static config: entrypoints 80/443, Let's Encrypt
- `infrastructure/traefik/dynamic_conf.yml` - TLS options, security headers middleware
- `infrastructure/authentik/docker-compose.yml` - standalone Authentik stack

Deployment steps:

1. Set up Traefik + `proxy` Docker network on server
2. Deploy Authentik, create OIDC provider, populate AUTHENTIK_* vars in .env
3. Set DATABASE_URL back to @postgres:5432 in .env
4. `docker compose build && docker compose up -d`
5. `docker compose exec nextjs-app npx prisma migrate deploy`
6. `docker compose exec nextjs-app node prisma/seed.js` (if first deploy)

Verified by:

- <https://sfxproone.olliecross.com> loads over HTTPS with valid certificate
- Authentik SSO login works
- Admin can assign roles to users from the panel
- Login brute-force is blocked after 5 attempts (Redis rate-limit)
