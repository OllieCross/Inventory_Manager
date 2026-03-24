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

## Phase 4 - Layout, Auth Pages & Navigation [COMPLETE]

Goal: The app runs in the browser. You can log in with the seeded admin account
and see a working header with role-aware navigation.

Files written:

- `src/app/globals.css` - Tailwind base, dark background, custom scrollbar, btn/input/card utility classes
- `src/app/layout.tsx` - root HTML shell, SessionProvider, PWA metadata, viewport config
- `src/app/page.tsx` - server component redirect (session -> /scan, no session -> /login)
- `src/app/login/page.tsx` - credentials login form with error display, logo, loading state
- `src/components/layout/Header.tsx` - sticky header: logo, role-gated nav links, role badge, sign-out
- `src/components/layout/AuthGuard.tsx` - client guard: redirects unauthenticated to /login, insufficient role to /scan

Verified by:

- `npx tsc --noEmit` - zero errors
- `npm run dev` starts without errors
- Browser loads at `http://localhost:3000` and redirects to /login
- Login with `admin@sfxproone.com` / `admin123` succeeds
- Header shows correct name and role badge
- Sign out returns to /login

---

## Phase 5 - Case Viewer (Scan + View) [COMPLETE]

Goal: A stagehand can scan a QR code or type a case ID and see the full case contents
including gear list, images, and PDF documents.

Files written:

- `src/app/api/cases/lookup/route.ts` - GET by qrdata query param, returns case id + name
- `src/lib/minio.ts` - added getFileUrl() for presigned GET URLs (1hr expiry)
- `src/app/scan/page.tsx` - camera scanner + manual fallback input, loading/error states
- `src/app/case/[id]/page.tsx` - server component: Prisma fetch + presigned URLs + render
- `src/components/scanner/QRScanner.tsx` - dynamically imported html5-qrcode wrapper
- `src/components/media/CaseGallery.tsx` - tap-to-open lightbox with prev/next navigation
- `src/components/media/PDFViewer.tsx` - pdf.js canvas renderer with page nav + open-in-new-tab fallback
- `src/app/globals.css` - added html5-qrcode style overrides (white icon, square viewport, centered icon, branded button)

QR handling logic:

- Any raw string (new stickers) -> looked up directly via qrdata field
- Legacy Google Keep URL -> stored as-is in qrdata, looked up the same way
- Both cases go through GET /api/cases/lookup?qrdata=...

Presigned URL strategy:

- GET URLs are generated server-side in the case detail page (never exposed via client API)
- PUT URLs are generated via /api/minio/presigned-url (editor only, Phase 6)

Verified by:

- `npx tsc --noEmit` - zero errors
- Typing SAMPLE-AUDIO-001 in manual input shows Main PA Case gear list
- Typing the legacy Keep URL shows Legacy Mic Case
- VIEWER role can see all content but has no edit buttons
- Camera scanner requests permission and scans live QR codes

---

## Phase 6 - Case Editor (Create + Edit + Upload) [COMPLETE]

Goal: An editor can create new cases, edit gear lists, upload images and PDFs,
and move items between cases.

Files written:

- `src/lib/minio.ts` - added deleteFile() using DeleteObjectCommand
- `src/app/api/cases/[id]/images/route.ts` - POST: record image in DB after MinIO upload
- `src/app/api/cases/[id]/images/[imageId]/route.ts` - DELETE: remove from MinIO + DB
- `src/app/api/cases/[id]/documents/route.ts` - POST: record document in DB after MinIO upload
- `src/app/api/cases/[id]/documents/[docId]/route.ts` - DELETE: remove from MinIO + DB
- `src/app/api/cases/[id]/items/[itemId]/move/route.ts` - PATCH: move item to another case
- `src/app/editor/page.tsx` - server component: case list with view/edit/delete (admin only) actions
- `src/app/editor/new/page.tsx` - create case: name, description, QR scan or manual entry, items
- `src/app/editor/[id]/page.tsx` - server component: fetches case + presigned URLs, renders edit form
- `src/components/editor/DeleteCaseButton.tsx` - confirm-before-delete client button
- `src/components/forms/CaseEditorForm.tsx` - full editor form:
  - create mode: basic info + QR code (scanner or manual) + gear list
  - edit mode: all of above + photo upload + PDF upload + delete existing files
  - HEIC/HEIF -> JPEG via heic2any (dynamic import)
  - image resize/compress (max 1920px, quality 0.8) via browser-image-compression
  - camera capture (capture=environment) or file picker for photos
  - up/down reorder for gear list items
  - move item to another case via dropdown

Upload flow:

1. Client processes file (HEIC convert + compress if image)
2. Fetch presigned PUT URL from /api/minio/presigned-url
3. PUT directly to MinIO (no Next.js bottleneck)
4. POST file metadata to /api/cases/[id]/images or /documents to record in DB

Verified by:

- `npx tsc --noEmit` - zero errors
- Editor can create a new case with items
- After create, redirected to /editor/[id] for file uploads
- Editor can upload photos (file picker + camera capture)
- HEIC photos are converted to JPEG before upload
- Editor can upload a PDF, set title and type
- Editor can delete photos and documents
- Editor can move an item to a different case via dropdown
- VIEWER cannot access /editor routes (redirected to /scan)
- ADMIN sees Delete button on case list; non-admin does not

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

- `https://sfxproone.olliecross.com` loads over HTTPS with valid certificate
- Authentik SSO login works
- Admin can assign roles to users from the panel
- Login brute-force is blocked after 5 attempts (Redis rate-limit)
