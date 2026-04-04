# SFXProOne Case Manager

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)
![MinIO](https://img.shields.io/badge/MinIO-C7202C?style=for-the-badge&logo=minio&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Authentik](https://img.shields.io/badge/Authentik-FD4B2D?style=for-the-badge&logo=authentik&logoColor=white)
![Traefik](https://img.shields.io/badge/Traefik-24A1C1?style=for-the-badge&logo=traefik-proxy&logoColor=white)

<div align="center">
  <img src="logo.jpg" alt="SFXProOne Logo" width="500" />
</div>

## Project Overview

**SFXProOne Case Manager** is a comprehensive, full-stack inventory and event management application built for AV/SFX rental companies. It tracks flight cases, individual devices, consumables, reusable gear groups, and real-world events - all through a mobile-first web interface accessible from any phone or desktop browser.

The app supports QR code scanning (including legacy Google Keep QR codes), direct file uploads to MinIO, role-based access control via Authentik SSO, and is deployed fully containerised behind Traefik with Let's Encrypt TLS.

---

## Key Features

- **Inventory Management:** Track cases, individual devices, generic accessories (items), and consumable stock. Each entity supports photos, PDFs, and rich metadata.
- **Device Logbook:** Per-device maintenance and status history with timestamped entries (e.g. "Prism replaced", "Faulty discharge lamp").
- **Consumables Stock:** Track quantities of expendable materials (confetti, pyro cartridges, CO₂). Stock is decremented automatically when an event completes.
- **Reusable Groups (Templates):** Bundle cases, devices, items, and consumables into named group templates (e.g. "Small Lights Package") to speed up event creation.
- **Event Management:** Create and manage real-world jobs/shows with full inventory assignment, stagehand crew lists, client contact info, and invoice status tracking.
- **QR Code Scanning:** Camera-based scanner with manual fallback. Handles both raw string QR codes (new stickers) and legacy Google Keep URLs stored on existing cases.
- **Media Handling:** Upload photos (JPEG, PNG, WebP, HEIC) and PDFs directly to MinIO via presigned URLs. HEIC images are converted to JPEG client-side before upload. Images are resized and compressed (max 1920 px, quality 0.8) in-browser.
- **PDF Viewer:** In-browser PDF rendering via a self-hosted PDF.js worker.
- **Access Control:** Three roles - VIEWER, EDITOR, ADMIN - enforced on every page and API route. SSO via Authentik OIDC or credentials login.
- **Rate Limiting:** Redis sliding-window rate limiter on login attempts and file upload endpoints per user.
- **Audit Logging:** Admin panel shows the last 100 audit log entries covering all entity changes (cases, devices, consumables, groups, events).
- **Changelog:** Release notes rendered from `CHANGELOG.md` at `/changelog`.
- **PWA-ready:** `manifest.json` and Apple touch icons for iOS/Android home screen shortcuts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, standalone output) |
| Language | TypeScript |
| Styling | Tailwind CSS + PostCSS |
| Database ORM | Prisma (PostgreSQL 17) |
| Auth | NextAuth.js v5 + Authentik OIDC |
| File Storage | MinIO (S3-compatible, presigned PUT/GET URLs) |
| Caching / Rate-limiting | Redis 7 (ioredis, sliding window) |
| QR Scanning | html5-qrcode |
| PDF Viewing | PDF.js (self-hosted worker) |
| HEIC Conversion | heic2any (client-side, dynamic import) |
| Image Compression | browser-image-compression |
| Reverse Proxy | Traefik v3 + Let's Encrypt ACME |
| Containers | Docker + Docker Compose |
| Identity Provider | Authentik (separate infrastructure stack) |

---

## Application Routes

### Auth

| Route | Access | Description |
|---|---|---|
| `/login` | Public | Credentials login form |

### Core

| Route | Access | Description |
|---|---|---|
| `/` | Any | Redirects to `/scan` (authed) or `/login` (unauthed) |
| `/scan` | Viewer+ | QR scanner with manual input fallback |
| `/changelog` | Viewer+ | Release notes rendered from CHANGELOG.md |
| `/admin` | Admin | User table with role selector and last 100 audit log entries |

### Inventory (Cases)

| Route | Access | Description |
|---|---|---|
| `/editor` | Viewer+ | Inventory overview: cases, devices, consumables, standalone items |
| `/editor/new` | Editor+ | Create new case with QR code, gear list, photos, and PDFs |
| `/editor/[id]` | Editor+ | Edit existing case |
| `/case/[id]` | Viewer+ | Case detail: gear list, photos, documents |

### Devices

| Route | Access | Description |
|---|---|---|
| `/devices/new` | Editor+ | Create device (name, QR, serial, purchase date, status, case assignment) |
| `/devices/[id]` | Viewer+ | Device detail: info card, photos, documents, logbook |
| `/devices/[id]/edit` | Editor+ | Edit device fields, media, and logbook entries |

### Consumables

| Route | Access | Description |
|---|---|---|
| `/consumables/new` | Editor+ | Create consumable (name, unit, stock quantity, notes) |
| `/consumables/[id]/edit` | Editor+ | Edit consumable including manual stock adjustment |

### Groups

| Route | Access | Description |
|---|---|---|
| `/groups` | Viewer+ | List all group templates with member counts |
| `/groups/new` | Editor+ | Create group (name + add cases, devices, items, consumables) |
| `/groups/[id]/edit` | Editor+ | Edit group name and members |

### Events

| Route | Access | Description |
|---|---|---|
| `/events` | Viewer+ | Events list with status, invoice status, stagehands, and inventory counts |
| `/events/new` | Editor+ | Create event (all fields, stagehands, inventory) |
| `/events/[id]` | Viewer+ | Event detail: info, stagehands, cases, devices, items, consumables |
| `/events/[id]/edit` | Editor+ | Edit event fields and inventory; add group template |

### Standalone Items

| Route | Access | Description |
|---|---|---|
| `/items/new` | Editor+ | Create standalone item |
| `/items/[id]/edit` | Editor+ | Edit standalone item |

> **Viewer+** = VIEWER, EDITOR, ADMIN &nbsp;|&nbsp; **Editor+** = EDITOR, ADMIN &nbsp;|&nbsp; **Admin** = ADMIN only

---

## Data Model

| Model | Description |
|---|---|
| `User` | App user with role (VIEWER / EDITOR / ADMIN) |
| `Case` | Physical flight case with QR code, warehouse location, items, devices, photos, and PDFs |
| `Device` | Single identifiable piece of equipment with status, serial number, logbook, photos, and PDFs |
| `Item` | Generic reusable accessory (cables, clamps, adapters); can be inside a case or standalone |
| `Consumable` | Expendable stock item (confetti, pyro, CO₂); stock decremented after events |
| `Group` | Reusable template bundling cases, devices, items, and consumables |
| `Event` | Real-world job/show with inventory assignment, stagehand crew, client info, and invoice status |
| `LogbookEntry` | Per-device maintenance entry (date, comment, user) |
| `AuditLog` | Append-only log of all entity changes |

**Enums:**

- `Role`: `VIEWER` / `EDITOR` / `ADMIN`
- `DocType`: `MANUAL` / `CERTIFICATE` / `OTHER`
- `DeviceStatus`: `Working` / `Faulty` / `InRepair` / `Retired` / `Lost` / `RentedToFriend`
- `EventStatus`: `Planned` / `Confirmed` / `Completed` / `Cancelled` / `NeedsDetails`
- `InvoiceStatus`: `Paid` / `NotPaid` / `DepositPaid` / `DepositNotYetPaid` / `NotPaidInFull`

---

## Directory Structure

```text
SFXProOne_CaseManager/
├── prisma/
│   ├── schema.prisma        # Full data model (User, Case, Device, Item, Consumable, Group, Event, ...)
│   ├── seed.ts              # Seeds admin user + sample cases
│   └── migrations/          # Prisma auto-generated SQL migrations
├── public/
│   ├── manifest.json        # PWA manifest
│   ├── pdf.worker.min.mjs   # Self-hosted PDF.js worker
│   └── icons/               # iOS/Android home screen icons
├── src/
│   ├── app/
│   │   ├── api/             # All API routes (cases, devices, consumables, groups, events, minio, admin, auth)
│   │   ├── login/           # Credentials login page
│   │   ├── scan/            # QR scanner page
│   │   ├── case/[id]/       # Case detail view
│   │   ├── editor/          # Case inventory (list, new, edit)
│   │   ├── devices/         # Device pages (new, detail, edit)
│   │   ├── consumables/     # Consumable pages (new, edit)
│   │   ├── groups/          # Group template pages (list, new, edit)
│   │   ├── events/          # Event pages (list, new, detail, edit)
│   │   ├── items/           # Standalone item pages (new, edit)
│   │   ├── admin/           # Admin dashboard (users + audit log)
│   │   └── changelog/       # Release notes page
│   ├── components/
│   │   ├── scanner/         # QRScanner (html5-qrcode wrapper)
│   │   ├── media/           # PDFViewer, CaseGallery (lightbox)
│   │   ├── editor/          # DeleteCaseButton, QRGenerator
│   │   ├── forms/           # CaseEditorForm and other entity forms
│   │   ├── admin/           # RoleSelector
│   │   └── layout/          # Header, Footer, AuthGuard
│   ├── lib/
│   │   ├── prisma.ts        # Singleton PrismaClient
│   │   ├── auth.ts          # NextAuth v5 config (credentials + Authentik OIDC, rate-limit on login)
│   │   ├── minio.ts         # S3Client helpers (ensureBucket, presigned PUT/GET, deleteFile)
│   │   ├── redis.ts         # ioredis singleton
│   │   ├── rateLimit.ts     # Sliding-window rate limiter backed by Redis
│   │   └── utils.ts         # cn(), formatBytes(), formatDate()
│   ├── hooks/
│   │   ├── usePermissions.ts # isViewer / isEditor / isAdmin from session role
│   │   └── useUpload.ts      # XHR upload with progress via presigned URL
│   └── types/
│       ├── next-auth.d.ts   # Session extended with user.id and user.role
│       └── case.d.ts        # Domain types (CaseWithRelations, ItemInput, CaseFormData)
├── infrastructure/
│   ├── traefik/             # Traefik static config, dynamic config (TLS, headers), docker-compose
│   └── authentik/           # Authentik docker-compose and .env.example
├── docker-compose.yml       # App stack: nextjs-app, postgres, redis, minio
├── Dockerfile               # Multi-stage build: deps → builder → runner (non-root, standalone)
└── entrypoint.sh            # Runs `prisma migrate deploy` then starts the server
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker](https://www.docker.com/) & Docker Compose

### Local Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd SFXProOne_CaseManager
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — PostgreSQL connection string
   - `NEXTAUTH_SECRET` and `AUTH_URL`
   - `AUTH_TRUST_HOST=true` (required when behind any reverse proxy)
   - MinIO credentials and bucket name
   - Redis connection string
   - Authentik OIDC client ID/secret (optional for local dev)

4. **Start infrastructure:**

   ```bash
   docker compose up postgres redis minio -d
   ```

5. **Run migrations and seed:**

   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```

6. **Start the dev server:**

   ```bash
   npm run dev
   ```

   App runs at [http://localhost:3000](http://localhost:3000).

---

## Production Deployment

The app is deployed via Docker Compose. `entrypoint.sh` runs `prisma migrate deploy` automatically on every container start, so migrations are applied without manual intervention.

```bash
# On the server
cd /home/user/sfxproone
git pull
docker compose build
docker compose up -d

# First deploy only — seed the database:
docker compose exec nextjs-app node node_modules/ts-node/dist/bin.js \
  --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

### Infrastructure (separate stacks)

- **Traefik** (`srv/traefik/`) — edge router, TLS termination via Let's Encrypt ACME, security headers middleware.
- **Authentik** (`srv/authentik/`) — OIDC/OAuth2 SSO provider. Groups `sfxproone-editors` and `sfxproone-admins` control role claims returned to NextAuth.

Both run on a shared `proxy` Docker network so Traefik can route to them.

---

## Security

- All API routes check session; unauthenticated requests return `401`, insufficient role returns `403`.
- Zod validation on all request bodies; invalid input returns `422`.
- MIME type allowlist for uploads: JPEG, PNG, WebP, HEIC (images) and PDF (documents).
- QR code uniqueness enforced at DB level.
- Redis sliding-window rate limiting on login attempts and presigned URL generation per user.
- TLS 1.2+ only with hardened cipher suite configured in Traefik.
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Non-root container user in production.

---

## Authentication

Login supports two modes:

1. **Credentials** — email + password stored in the database (bcrypt hashed).
2. **Authentik OIDC** — SSO via external Authentik instance. Role claim (`VIEWER`/`EDITOR`/`ADMIN`) is injected via a custom scope mapping using `ak_is_group_member()` expressions.

Sessions use JWT strategy. Session lifetime is configured to keep stagehands logged in for at least 30 minutes of inactivity.
