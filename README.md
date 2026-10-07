# Inventory Manager

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)
![MinIO](https://img.shields.io/badge/MinIO-C7202C?style=for-the-badge&logo=minio&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Authentik](https://img.shields.io/badge/Authentik-FD4B2D?style=for-the-badge&logo=authentik&logoColor=white)
![Traefik](https://img.shields.io/badge/Traefik-24A1C1?style=for-the-badge&logo=traefik-proxy&logoColor=white)

## Project Overview

**Inventory Manager** is a comprehensive, full-stack inventory and event management application built for AV/SFX rental companies. It tracks flight cases, individual devices, consumables, reusable gear groups, and real-world events - all through a mobile-first web interface accessible from any phone or desktop browser.

The app supports QR code scanning (including legacy Google Keep QR codes), direct file uploads to MinIO, role-based access control via Authentik SSO, and is deployed fully containerised behind Traefik with Let's Encrypt TLS.

---

## Key Features

- **Inventory Management:** Track cases, individual devices, generic accessories (items), and consumable stock. Each entity supports photos, PDFs, and rich metadata.
- **Device Logbook:** Per-device maintenance and status history with timestamped entries (e.g. "Prism replaced", "Faulty discharge lamp").
- **Consumables Stock:** Track quantities of expendable materials (confetti, pyro cartridges, CO2). Stock is decremented automatically when an event completes.
- **Reusable Groups (Templates):** Bundle cases, devices, items, and consumables into named group templates (e.g. "Small Lights Package") to speed up event creation.
- **Event Management:** Create and manage real-world jobs/shows with full inventory assignment, stagehand crew lists, client contact info, and invoice status tracking.
- **Tanks:** Track SFX gas tanks (CO2, O2, N2, LN2, H2, butane/propane, water) with chemical compound, full/current capacity, fill bar (green >=60%, yellow >=30%, red <30%), notes, photos, documents, and a maintenance logbook.
- **Pyro Effects:** Track pyrotechnic effects with brand, category (T1/T2/F1/F2/F3/F4/P1/P2/Other), stock quantity, warning/critical thresholds, notes, photos, and documents; stock decremented automatically when an event completes.
- **Shopping List (`/shopping`):** Lists all items needing restocking - consumables and pyro split into critical (red) and warning (yellow) groups; tanks shown with a fill bar; links directly to each item's detail/edit page.
- **Issues page (`/issues`):** Lists all devices with Faulty or In Repair status (with their last 3 logbook entries); editors can submit manual issue reports linked to a device, case, stored item, item in a case, tank, or free-text "Other" description; individual issues are deletable with a confirmation modal.
- **Recycle Bin:** Deleting a Case, Device, Item, Consumable, Photo, or Document soft-deletes the record; items are permanently purged after 30 days. Admins can browse, restore, or immediately empty the bin from `/admin/recycle-bin`.
- **Light / Dark Theme:** Follows OS `prefers-color-scheme` automatically; a sun/moon toggle in the header overrides and persists the preference to `localStorage`.
- **User Profile (`/profile`):** Any logged-in user can update their display name and change their password via two independent form sections.
- **Admin - User Management:** Admins can create new user accounts (name, email, role, password) and delete existing accounts (except their own) directly from the Admin Panel.
- **QR Code Scanning:** Camera-based scanner with manual fallback. Handles both raw string QR codes (new stickers) and legacy Google Keep URLs stored on existing cases. Camera view shows four corner-bracket crosshair overlay to help frame the code.
- **Media Handling:** Upload photos (JPEG, PNG, WebP, HEIC) and PDFs directly to MinIO via presigned URLs. HEIC images are converted to JPEG client-side before upload. Images are resized and compressed (max 1920 px, quality 0.8) in-browser.
- **PDF Viewer:** In-browser PDF rendering via a self-hosted PDF.js worker.
- **Access Control:** Three roles - VIEWER, EDITOR, ADMIN - enforced on every page and API route. SSO via Authentik OIDC or credentials login.
- **Rate Limiting:** Redis sliding-window rate limiter on login attempts and file upload/write endpoints per user.
- **Audit Logging:** Admin panel shows the last 100 audit log entries (grouped by date) covering all entity changes (cases, devices, consumables, groups, events, items, tanks, pyro).
- **Backup System:** Three dedicated Docker containers run nightly at 02:00 - `postgres-backup` (pg_dump - gzip), `redis-backup`, and `minio-backup` (volume archives via offen/docker-volume-backup). Backups are written to the Synology NAS over NFS (share `/volume3/Homelab_Backups/sfxproone`; the NAS address is `NAS_HOST` in `.env`), and each run overwrites the previous one.
- **Update Snackbar:** After a version bump a blue snackbar appears on first visit showing the new version; auto-dismisses after 6 seconds; tracked per-browser in `localStorage`.
- **Changelog:** Release notes rendered from `CHANGELOG.md` at `/changelog`. The most recent version header displays a "Latest" badge.
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

### Tanks

| Route | Access | Description |
|---|---|---|
| `/tanks/new` | Editor+ | Create tank (compound, unit, full/current capacity, notes) |
| `/tanks/[id]` | Viewer+ | Tank detail: capacity bar, info, photos, documents, logbook |
| `/tanks/[id]/edit` | Editor+ | Edit tank fields, media, and logbook entries |

### Pyro Effects

| Route | Access | Description |
|---|---|---|
| `/pyro/new` | Editor+ | Create pyro effect (name, brand, category, stock, thresholds) |
| `/pyro/[id]` | Viewer+ | Pyro detail: stock bar, info, photos, documents |
| `/pyro/[id]/edit` | Editor+ | Edit pyro fields and media |

### Issues

| Route | Access | Description |
|---|---|---|
| `/issues` | Viewer+ | Faulty/In Repair devices with logbook; manual issue report form |

### Shopping List

| Route | Access | Description |
|---|---|---|
| `/shopping` | Viewer+ | Low-stock consumables, pyro, and tanks needing restocking |

### Profile

| Route | Access | Description |
|---|---|---|
| `/profile` | Viewer+ | Update display name and change password |

### Admin (extended)

| Route | Access | Description |
|---|---|---|
| `/admin/recycle-bin` | Admin | Browse, restore, or empty soft-deleted items |

> **Viewer+** = VIEWER, EDITOR, ADMIN &nbsp;|&nbsp; **Editor+** = EDITOR, ADMIN &nbsp;|&nbsp; **Admin** = ADMIN only

---

## Data Model

| Model | Description |
|---|---|
| `User` | App user with role (VIEWER / EDITOR / ADMIN) |
| `Case` | Physical flight case with QR code, warehouse location, items, devices, photos, and PDFs |
| `Device` | Single identifiable piece of equipment with status, serial number, logbook, photos, and PDFs |
| `Item` | Generic reusable accessory (cables, clamps, adapters); can be inside a case or standalone |
| `Consumable` | Expendable stock item (confetti, pyro cartridges, CO2); stock decremented after events; warning/critical thresholds |
| `Tank` | SFX gas tank (CO2, O2, N2, LN2, H2, butane/propane, water); tracks full/current capacity, notes, photos, documents, and a maintenance logbook |
| `Pyro` | Pyrotechnic effect with brand, category, stock quantity, warning/critical thresholds, notes, photos, and documents |
| `Group` | Reusable template bundling cases, devices, items, consumables, tanks, and pyro |
| `Event` | Real-world job/show with inventory assignment, stagehand crew, client info, and invoice status |
| `LogbookEntry` | Per-device or per-tank maintenance entry (date, comment, user) |
| `IssueEntry` | Manual issue report linked to a device, case, item, item-in-case, tank, or free-text description |
| `AuditLog` | Append-only log of all entity changes |

**Enums:**

- `Role`: `VIEWER` / `EDITOR` / `ADMIN`
- `DocType`: `MANUAL` / `CERTIFICATE` / `OTHER`
- `DeviceStatus`: `Working` / `Faulty` / `InRepair` / `Retired` / `Lost` / `RentedToFriend`
- `EventStatus`: `Planned` / `Confirmed` / `Completed` / `Cancelled` / `NeedsDetails`
- `InvoiceStatus`: `Paid` / `NotPaid` / `DepositPaid` / `DepositNotYetPaid` / `NotPaidInFull`
- `PyroCategory`: `T1` / `T2` / `F1` / `F2` / `F3` / `F4` / `P1` / `P2` / `Other`

---

## Directory Structure

```text
Inventory_Manager/
+-- prisma/
|   +-- schema.prisma        # Full data model (User, Case, Device, Item, Consumable, Group, Event, Tank, Pyro, ...)
|   +-- seed.ts              # Seeds admin user + sample cases
|   +-- migrations/          # Prisma auto-generated SQL migrations
+-- public/
|   +-- manifest.json        # PWA manifest
|   +-- pdf.worker.min.mjs   # Self-hosted PDF.js worker
|   +-- icons/               # iOS/Android home screen icons
+-- src/
|   +-- app/
|   |   +-- api/             # All API routes (cases, devices, consumables, groups, events, tanks, pyro, minio, admin, auth)
|   |   +-- login/           # Credentials login page
|   |   +-- scan/            # QR scanner page
|   |   +-- case/[id]/       # Case detail view
|   |   +-- editor/          # Case inventory (list, new, edit)
|   |   +-- devices/         # Device pages (new, detail, edit)
|   |   +-- consumables/     # Consumable pages (new, edit)
|   |   +-- groups/          # Group template pages (list, new, edit)
|   |   +-- events/          # Event pages (list, new, detail, edit)
|   |   +-- items/           # Standalone item pages (new, edit)
|   |   +-- tanks/           # Tank pages (list, detail, new, edit)
|   |   +-- pyro/            # Pyro pages (list, detail, new, edit)
|   |   +-- shopping/        # Shopping list page
|   |   +-- issues/          # Issues page (faulty devices + manual reports)
|   |   +-- profile/         # User profile (display name + password)
|   |   +-- admin/           # Admin dashboard (users, audit log, recycle bin)
|   |   +-- changelog/       # Release notes page
|   +-- components/
|   |   +-- scanner/         # QRScanner (html5-qrcode wrapper)
|   |   +-- media/           # PDFViewer, CaseGallery (lightbox)
|   |   +-- editor/          # DeleteCaseButton, QRGenerator
|   |   +-- forms/           # CaseEditorForm and other entity forms
|   |   +-- admin/           # RoleSelector
|   |   +-- layout/          # Header, Footer, AuthGuard
|   +-- lib/
|   |   +-- prisma.ts        # Singleton PrismaClient
|   |   +-- auth.ts          # NextAuth v5 config (credentials + Authentik OIDC, rate-limit on login)
|   |   +-- minio.ts         # S3Client helpers (ensureBucket, presigned PUT/GET, deleteFile)
|   |   +-- redis.ts         # ioredis singleton
|   |   +-- rateLimit.ts     # Sliding-window rate limiter backed by Redis
|   |   +-- utils.ts         # cn(), formatBytes(), formatDate()
|   +-- hooks/
|   |   +-- usePermissions.ts # isViewer / isEditor / isAdmin from session role
|   |   +-- useUpload.ts      # XHR upload with progress via presigned URL
|   +-- types/
|       +-- next-auth.d.ts   # Session extended with user.id and user.role
|       +-- case.d.ts        # Domain types (CaseWithRelations, ItemInput, CaseFormData)
+-- infrastructure/
|   +-- traefik/             # Traefik static config, dynamic config (TLS, headers), docker-compose
|   +-- authentik/           # Authentik docker-compose and .env.example
+-- docker-compose.yml       # App stack: nextjs-app, postgres, redis, minio, backup containers
+-- Dockerfile               # Multi-stage build: deps -> builder -> runner (non-root, standalone)
+-- entrypoint.sh            # Runs `prisma migrate deploy` then starts the server
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
   cd Inventory_Manager
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` - PostgreSQL connection string
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
cd /home/user/inventory_manager
git pull
docker compose build
docker compose up -d

# First deploy only - seed the database:
docker compose exec nextjs-app node node_modules/ts-node/dist/bin.js \
  --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

### Infrastructure (separate stacks)

- **Traefik** (`srv/traefik/`) - edge router, TLS termination via Let's Encrypt ACME, security headers middleware.
- **Authentik** (`srv/authentik/`) - OIDC/OAuth2 SSO provider. Groups `editors` and `admins` control role claims returned to NextAuth.

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

1. **Credentials** - email + password stored in the database (bcrypt hashed).
2. **Authentik OIDC** - SSO via external Authentik instance. Role claim (`VIEWER`/`EDITOR`/`ADMIN`) is injected via a custom scope mapping using `ak_is_group_member()` expressions.

Sessions use JWT strategy. Session lifetime is configured to keep stagehands logged in for at least 30 minutes of inactivity.
