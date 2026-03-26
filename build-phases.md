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

## Phase 7 - Admin Panel, Security Hardening & Dockerfile [COMPLETE]

Goal: Admin dashboard, Redis rate-limiting, and the production Dockerfile.
Everything in this phase is written and tested locally before touching the server.

Files written:

- `src/lib/rateLimit.ts` - shared rate-limit helper using ioredis (sliding window, fails open if Redis is down)
- `src/lib/auth.ts` - updated: rate-limit applied per email in the credentials authorize callback; throws after 5 attempts in 60s
- `src/app/api/minio/presigned-url/route.ts` - updated: rate-limit applied per user ID; returns 429 after 20 requests in 60s
- `src/app/api/admin/users/[userId]/role/route.ts` - PATCH: ADMIN-only endpoint to change a user's role (cannot change own role)
- `src/components/admin/RoleSelector.tsx` - client component: role dropdown with saving/saved/error feedback and router.refresh()
- `src/app/admin/page.tsx` - server component: user table (name, email, joined date, role selector), audit log placeholder
- `Dockerfile` - three-stage build: deps (npm ci) -> builder (prisma generate + next build) -> runner (standalone output, non-root user, prisma CLI copied for migrations)

Verified by:

- `npx tsc --noEmit` - zero errors
- `docker build -t sfxproone-casemanager .` - build succeeds, all 20 routes present in output
- Admin page loads at /admin for ADMIN role, redirects to /scan for other roles
- Admin can change a user's role from VIEWER to EDITOR in the UI
- Login brute-force blocked after 5 attempts (rate-limit throws error shown on login page)
- Upload rate-limit returns 429 after 20 requests per user in 60s

---

## Phase 8 - DNS & Server Infrastructure Setup [PENDING]

Goal: The server is ready to receive the application.
Traefik is running and issuing certificates, Authentik is deployed and configured,
and DNS is pointing at the server's public IP.
This phase is done via Claude Code in the server terminal - not in this local session.

Pre-requisites:

- A Linux server (Ubuntu 22.04 or Debian 12 recommended) with Docker + Docker Compose installed
- The server's public IPv4 address is known

Step 1 - DNS setup on websupport.sk:

- Log in to websupport.sk -> Sprava domeny -> DNS zaznamy for the target domain
- Add an A record: `sfxproone.olliecross.com` -> server public IP, TTL 300
- Add a CNAME record: `auth.sfxproone.olliecross.com` -> `sfxproone.olliecross.com` (for Authentik)
- Wait for propagation (5-30 min); verify with `dig sfxproone.olliecross.com`

Step 2 - Server baseline:

```bash
docker network create proxy
mkdir -p /opt/traefik /opt/authentik
touch /opt/traefik/acme.json && chmod 600 /opt/traefik/acme.json
```

Step 3 - Write infrastructure config files (Claude Code will write these on the server):

- `infrastructure/traefik/traefik.yml` - static config:
  - entryPoints: web (80, redirect to websecure), websecure (443)
  - certificatesResolvers.letsencrypt.acme: email, tlsChallenge, storage at /acme.json
  - providers.docker: exposedByDefault false, network proxy
  - api.dashboard false (disabled for security)

- `infrastructure/traefik/dynamic_conf.yml` - dynamic config:
  - TLS options: minVersion VersionTLS12, cipherSuites (modern safe list)
  - Middleware `secHeaders`: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera=self for QR scanner)

- `infrastructure/authentik/docker-compose.yml` - standalone Authentik stack:
  - Services: authentik-server, authentik-worker, postgresql (separate from app DB), redis
  - Traefik labels to expose at `auth.sfxproone.olliecross.com` with TLS + secHeaders middleware
  - Volumes: authentik-db-data, authentik-media, authentik-certs
  - Env: AUTHENTIK_SECRET_KEY, AUTHENTIK_POSTGRESQL__* vars

Step 4 - Deploy Traefik:

```bash
docker compose -f /opt/traefik/docker-compose.yml up -d
# verify: docker logs traefik | grep "Certificate obtained"
```

Step 5 - Deploy Authentik:

```bash
cd /opt/authentik && docker compose up -d
# wait ~60s for first boot, then open https://auth.sfxproone.olliecross.com/if/flow/initial-setup/
# complete the admin setup wizard
```

Step 6 - Configure Authentik OIDC provider:

- Admin UI -> Applications -> Providers -> Create -> OAuth2/OpenID Provider
  - Name: CaseManager
  - Client ID: (auto-generated, copy it)
  - Client Secret: (auto-generated, copy it)
  - Redirect URIs: `https://sfxproone.olliecross.com/api/auth/callback/authentik`
  - Scopes: openid, email, profile
- Admin UI -> Applications -> Create
  - Name: CaseManager, Slug: casemanager, Provider: CaseManager
- Admin UI -> Directory -> Groups -> Create group `sfxproone-editors` and `sfxproone-admins`
  - Property Mappings: add a custom mapping that exposes group membership as a `role` claim
- Copy AUTHENTIK_CLIENT_ID and AUTHENTIK_CLIENT_SECRET to the app .env on the server

Verified by:

- `https://auth.sfxproone.olliecross.com` loads the Authentik login page over HTTPS
- `https://sfxproone.olliecross.com` resolves (Traefik returns 502 until Phase 9 - that is expected)
- Authentik OIDC provider is created and redirect URI is saved
- `dig sfxproone.olliecross.com` returns the correct server IP

---

## Phase 9 - Production Deployment [PENDING]

Goal: The application is live on the server over HTTPS with SSO login working.
This phase is done via Claude Code in the server terminal - not in this local session.

Pre-requisites:

- Phase 7 complete (Dockerfile exists and builds locally)
- Phase 8 complete (Traefik + Authentik running, DNS propagated, OIDC provider configured)

Step 1 - Clone or copy the project onto the server:

```bash
git clone <repo-url> /opt/sfxproone
# or: rsync -av --exclude node_modules --exclude .next . user@server:/opt/sfxproone
```

Step 2 - Create the production .env on the server:

```bash
cp /opt/sfxproone/.env.example /opt/sfxproone/.env
# Edit /opt/sfxproone/.env:
#   DATABASE_URL=postgresql://casemanager:STRONG_PASSWORD@postgres:5432/casemanager
#   REDIS_URL=redis://redis:6379
#   MINIO_ENDPOINT=minio
#   MINIO_PORT=9000
#   MINIO_ACCESS_KEY=...
#   MINIO_SECRET_KEY=...
#   AUTH_SECRET=<random 32-char string>
#   NEXTAUTH_URL=https://sfxproone.olliecross.com
#   AUTHENTIK_ISSUER=https://auth.sfxproone.olliecross.com/application/o/casemanager/
#   AUTHENTIK_CLIENT_ID=<from Phase 8>
#   AUTHENTIK_CLIENT_SECRET=<from Phase 8>
```

Step 3 - Build and start the app stack:

```bash
cd /opt/sfxproone
docker compose build
docker compose up -d
```

Step 4 - Run database migrations and seed:

```bash
docker compose exec nextjs-app npx prisma migrate deploy
docker compose exec nextjs-app node prisma/seed.js   # only on first deploy
```

Step 5 - Verify all services are healthy:

```bash
docker compose ps   # all services should show "healthy" or "running"
docker compose logs nextjs-app --tail=50   # check for startup errors
```

Verified by:

- `https://sfxproone.olliecross.com` loads over HTTPS with a valid Let's Encrypt certificate
- Credentials login works with `admin@sfxproone.com` / `admin123`
- Authentik SSO login redirects correctly and returns to the app with role assigned
- QR scanner works on a mobile device (camera permission prompt appears)
- Admin can assign roles to users from the /admin panel
- Login brute-force is blocked after 5 attempts (Redis rate-limit returns 429)
