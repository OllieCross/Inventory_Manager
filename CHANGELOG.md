# Changelog

All notable changes to SFXProOne CaseManager are documented here.

---

## v1.2.1 - 2026-04-07

### Added

- **Admin: delete user**: admins can delete any user account (except their own) from the Admin Panel user table; a two-step inline confirmation ("Delete {name}? Confirm / Cancel") prevents accidental deletion
- **Login page redesign**: animated gradient orbs (brand blue, indigo, cyan) drift in the background using GPU-composited CSS keyframes; the form card uses glassmorphism (`backdrop-filter: blur`) with a slide-up entrance animation; logo springs in with a subtle overshoot curve; card shakes on failed login; password field gains a show/hide toggle; submit button shows an inline spinner while signing in; all animations respect `prefers-reduced-motion`

---

## v1.2.0 - 2026-04-07

### Added

- **Recycle Bin (Admin)**: deleting a Case, Device, Item, Consumable, Photo, or Document now soft-deletes (sets `deletedAt`) instead of immediately destroying the record; items are permanently purged after 7 days
- **Recycle Bin page (`/admin/recycle-bin`)**: admins can browse all soft-deleted items by category, see how many days remain before permanent deletion, and restore any item with one click
- **Purge Expired button**: admins can trigger an immediate purge of all items past the 7-day retention window (also deletes files from MinIO); accessible from the Recycle Bin page
- **Recycle Bin link in Admin Panel**: a "Recycle Bin" button in the Admin Panel header navigates to the recycle bin page
- **Theme toggle (sun/moon) in header**: a small sun/moon icon button in the top-right header lets users manually switch between light and dark mode; preference is saved to `localStorage` and persists across sessions; on first visit (no saved preference) the OS/browser theme is detected automatically via `prefers-color-scheme`

---

## v1.1.9 - 2026-04-07

### Added

- **Issues page (`/issues`)**: new page listing all devices with status Faulty or In Repair, with their last 3 logbook entries; accessible via a red "Issues" button in the Inventory header
- **Report Issue form**: any logged-in user can submit a manual issue report from the Issues page by selecting an entity type (Device, Case, or Item), picking the specific entity, and writing a description; submitted issues appear in a "Reported Issues" section below the device list

---

## v1.1.8 - 2026-04-07

### Added

- **Recent Events on case/device detail pages**: each case and device detail page now shows the 3 most recent completed or confirmed events that included the item, with event name, date, and a View link; shows "No recent events." when none qualify

### Fixed

- **Docker build: CSS opacity classes on CSS-variable colors**: Tailwind `text-foreground/70`, `bg-foreground/5`, etc. now compile correctly in the Docker production build; CSS color variables switched from hex values to RGB channel tuples so Tailwind can inject the alpha value

---

## v1.1.7 - 2026-04-07

### Added

- **Consumable warning/critical thresholds**: each consumable now has optional `warningThreshold` and `criticalThreshold` fields; set them on the create/edit form with inline help text
- **Consumable stock status bar**: the inventory list replaces the plain quantity label with a horizontal fill bar per consumable - green when healthy, yellow at warning level, red at critical level with a `!` indicator; no thresholds set shows a neutral grey bar

---

## v1.1.6 - 2026-04-07

### Added

- **Light/dark system theme**: the app now follows the OS/browser color scheme preference automatically; no manual toggle is needed
- **Light mode palette**: background `#f5f5f5`, surface `#ffffff`, foreground `#0a0a0a`; brand color and layout unchanged
- **CSS variable tokens**: `background`, `surface`, `foreground`, and `muted` are now CSS variables so all components respond to theme changes without JavaScript

---

## v1.1.5 - 2026-04-07

### Added

- **User profile page (`/profile`)**: any logged-in user can update their display name and change their password; accessed by clicking the role badge in the header
- **Admin: create user**: admins can create new user accounts directly from the Admin Panel via a "Create User" modal (name, email, role, password); duplicate email is rejected with a clear error
- **Role badge links to profile**: the role pill in the top-right header is now a clickable link to `/profile`

---

## v1.1.4 - 2026-04-07

### Changed

- **Event model: `endDate` removed**: events now have a single start date/time; all API routes, forms, and detail pages updated
- **Event model: `clientName` added**: new optional client name field available on create/edit forms and shown in the event detail view
- **Event form: crew section above inventory**: the crew (stagehand) picker is now a distinct section above the inventory picker, with a clear visual separator
- **Event form: items outside cases only**: the inventory picker no longer lists items that belong to a case; only standalone items (caseId IS NULL) are available to add directly to an event
- **Event form: group picker in create mode**: the group template picker is now available on the event create form (previously only on edit); expanding a group populates the inventory fields locally without requiring a round-trip
- **Event form: inventory search input**: a real-time search/filter input above the inventory picker filters across all inventory types (Cases, Devices, Items, Consumables) by name
- **Event form: 15-minute start time steps**: the start time picker is now a date input + time select with 15-minute increments (00, 15, 30, 45) instead of a free-form datetime-local input

---

## v1.1.3 - 2026-04-07

### Changed

- **Rebranded to "Inventory Manager"**: all visible frontend labels updated (page title, header, login page, PWA manifest name/short_name); backend, container names, and infrastructure unchanged
- **Inventory tab button labels**: create buttons now read `+ Case`, `+ Item`, `+ Device`, `+ Consumable` (removed the word "New")
- **Section renames in Inventory tab**: "Devices" renamed to "Devices outside Cases"; "Standalone Items" renamed to "Items outside Cases"
- **Edit/Delete removed from inventory list rows**: all four inventory sections (Cases, Devices, Consumables, Items outside Cases) now show only a blue "View" button per row; edit and delete actions are accessed from the detail/edit page
- **Events list: end date removed**: event cards now show only start date and time; end date display removed entirely from the list
- **Events list: inventory counts removed, crew names surfaced**: the per-event item/case/device count chips are gone; assigned crew members are now shown as individual pills (name badges) on each event card
- **Event details: "Stagehands" renamed to "Crew"**: section heading and all references updated; email addresses removed from the crew member list
- **Event details: "Back to Events" button removed**: navigation handled by the header
- **Events list: upcoming events highlighted**: events where the logged-in user is assigned as crew and the start date is today or tomorrow are sorted to the top of the list and given a glowing white 1px border

---

## v1.1.2 - 2026-04-07

### Fixed

- **Stale data after edit**: editing a case or device and saving no longer shows old data on the detail page; `router.refresh()` is now called before navigation to invalidate the server component cache
- **Audit log actions in ALL_CAPS**: audit log entries now display human-readable labels ("Created device", "Updated event", etc.) instead of raw enum strings; time of action is now shown alongside the date (e.g. "07 Apr 2026, 14:32")
- **Admin panel mobile overflow**: user table and audit log table are now wrapped in `overflow-x-auto` containers so they scroll horizontally on small screens instead of breaking the layout
- **Changelog page missing header**: the `/changelog` page now renders the standard `Header` component; the "Go Back" button has been removed
- **Inventory search only found cases**: the search input on the Inventory page now filters across all four sections (Cases, Devices, Consumables, and Standalone Items) simultaneously; case search still highlights matched item names within a case
- **Consumable edit page missing delete**: the consumable edit form now has a Delete button with a confirmation modal; wired to `DELETE /api/consumables/[id]`
- **Standalone item edit page missing delete**: the standalone item edit form now has a Delete button with a confirmation modal; wired to `DELETE /api/items/[id]`
- **Case and device edit forms missing QR code field**: the QR code / QR data field is now visible and editable in edit mode for both cases and devices, not just during creation; `PUT /api/cases/[id]` and `PATCH /api/devices/[id]` now accept the updated QR payload; device PATCH returns 409 if the new QR code is already in use by another device

---

## v1.1.1 - 2026-04-06

### Security

- **IDOR fix - logbook entry deletion**: DELETE `/api/devices/[id]/logbook/[entryId]` now verifies the entry belongs to the device in the URL path before deleting; previously any authenticated editor could delete any logbook entry by ID
- **XSS fix - changelog markdown rendering**: `marked()` output is now sanitised with `isomorphic-dompurify` before being passed to `dangerouslySetInnerHTML`; added `isomorphic-dompurify` dependency
- **PostgreSQL port hardened**: Docker Compose postgres port binding changed from `0.0.0.0:5432` to `127.0.0.1:5432` so the database is no longer reachable from outside the host
- **Rate limiter no longer fails open**: Redis `catch` block now falls back to an in-memory sliding-window counter (per-key `Map` with TTL) instead of unconditionally allowing all requests when Redis is unavailable
- **Item DELETE existence check**: `/api/items/[id]` DELETE handler now returns 404 when the item does not exist instead of surfacing a raw Prisma error
- **Item move - target case validation**: `/api/cases/[id]/items/[itemId]/move` PATCH now verifies the target case exists before updating; prevents foreign-key errors leaking to the client
- **Consumable DELETE existence check**: `/api/consumables/[id]` DELETE handler now returns 404 when the consumable does not exist
- **Authenticated version endpoint**: `/api/version` now requires a valid session; response is cached at module level to avoid a filesystem read on every request
- **MinIO CORS headers restricted**: Traefik `accesscontrolallowheaders` for MinIO changed from wildcard `*` to an explicit list (`Content-Type`, `Authorization`, `X-Amz-Date`, `X-Amz-Content-Sha256`, `X-Amz-Security-Token`)
- **Rate limiting on write endpoints**: `checkRateLimit` added to POST handlers for `/api/cases`, `/api/devices`, and `/api/events` (30 requests / 60 s per user)
- **Presigned URL extension derived from MIME type**: file extension in the MinIO object key is now taken from a validated `MIME_TO_EXT` map instead of the user-supplied filename, preventing extension/MIME mismatch
- **Dependency overrides**: `defu` forced to `>=6.1.5` (prototype pollution fix) and `effect` forced to `>=3.20.0` (AsyncLocalStorage context leak fix) via npm `overrides`

### Infrastructure

- Backup system documented below (three dedicated containers: `postgres-backup`, `redis-backup`, `minio-backup`)

#### Backup containers

| Container | Image | Schedule | Retention | Output volume |
|-----------|-------|----------|-----------|---------------|
| `sfxproone-postgres-backup` | `postgres:17-alpine` | Daily at 02:00 (via `sleep 86400` loop) | 7 days | `sfxproone_postgres_backups` |
| `sfxproone-redis-backup` | `offen/docker-volume-backup:v2` | `0 2 * * *` | 7 days | `sfxproone_redis_backups` |
| `sfxproone-minio-backup` | `offen/docker-volume-backup:v2` | `0 2 * * *` | 7 days | `sfxproone_minio_backups` |

- **postgres-backup**: runs `pg_dump | gzip` against the `postgres` service, writes compressed `.sql.gz` files to `/backups`, prunes files older than 7 days via `find -mtime +7 -delete`; depends on `postgres` being healthy
- **redis-backup**: mounts `redis_data` read-only, archives the volume to `sfxproone_redis_backups` nightly, retains 7 days of archives
- **minio-backup**: mounts `minio_data` read-only, archives the volume to `sfxproone_minio_backups` nightly, retains 7 days of archives
- All backup containers run on the `internal` network only; no external exposure

---

## v1.1.0 - 2026-04-01

### Added

- Audit log extended to cover all new entities:
  - `CONSUMABLE_CREATED`, `CONSUMABLE_UPDATED`, `CONSUMABLE_STOCK_ADJUSTED` on consumable write operations
  - `GROUP_CREATED`, `GROUP_UPDATED`, `GROUP_DELETED` on group write operations
  - `EVENT_CREATED`, `EVENT_UPDATED`, `EVENT_COMPLETED` on event write operations
- All new actions are visible in the Admin panel alongside existing case/device/role audit entries

---

## v1.0.9 - 2026-04-01

### Added

- Standalone items: items no longer require a case assignment; `Item.caseId` is now nullable
- `/items/new` - create a standalone item (name, quantity, notes)
- `/items/[id]/edit` - edit a standalone item
- Inventory page now shows a Standalone Items section with count and Edit links
- Migration `20260401000002_nullable_item_caseid` makes `Item.caseId` optional

---

## v1.0.8 - 2026-04-01

### Added

- Event model fully implemented: list, create, view, and edit pages at `/events`, `/events/new`, `/events/[id]`, `/events/[id]/edit`
- Event fields: name, venue name, location, start/end date+time, client phone/email, comments, event status (Planned / Confirmed / Completed / Cancelled / Needs Details), invoice status (Paid / Not Paid / Deposit Paid / Deposit Not Yet Paid / Not Paid in Full)
- Events support stagehands (existing users), cases, devices, items, and consumables as inventory
- Consumables on an event carry a `quantityNeeded` and optional `quantityUsed` field
- Add Group template to an existing event via the edit page (expands all group members into event inventory)
- Marking an event as Completed automatically decrements each consumable's stock quantity by its `quantityUsed`
- Events list page shows status and invoice status with colour coding, stagehand names, and inventory counts

---

## v1.0.7 - 2026-04-01

### Added

- Group model fully implemented: list, create, and edit pages at `/groups`, `/groups/new`, `/groups/[id]/edit`
- Groups are reusable event templates that bundle Cases, Devices, Items, and Consumables together
- Consumables in a group carry a `quantityNeeded` field (e.g. 2.5 kg titanium dust)
- Adding/removing members in edit mode saves immediately via API without requiring a Save button
- Events page "Groups" button now links to the live `/groups` page

---

## v1.0.6 - 2026-04-01

### Added

- Consumable model fully implemented: create and edit pages at `/consumables/new`, `/consumables/[id]/edit`
- Consumable fields: name, unit (free text, e.g. kg / bag / cartridge), stock quantity (decimal), notes
- Inventory page now shows Cases, Devices, and Consumables as three separate sections with counts
- Stock quantity supports decimal values (e.g. 2.5 kg)

---

## v1.0.5 - 2026-04-01

### Added

- Device model fully implemented: create, view, and edit pages at `/devices/new`, `/devices/[id]`, `/devices/[id]/edit`
- Device fields: name, QR code (with scanner), serial number, purchase date, status (Working / Faulty / In Repair / Retired / Lost / Rented to a Friend), optional case assignment, notes
- Device detail page shows status with colour coding, info card, photos, documents, and logbook
- Device logbook: add and delete maintenance entries (date + comment + user) from the edit page
- Device photos and documents use the same presigned MinIO upload flow as cases
- Inventory page now shows Cases and Devices as two separate sections with counts
- Audit log extended with DEVICE_CREATED, DEVICE_UPDATED, DEVICE_DELETED, LOGBOOK_ENTRY_ADDED actions

---

## v1.0.4 - 2026-04-01

### Added

- Database: new `Device` model with status (`Working / Faulty / InRepair / Retired / Lost / RentedToFriend`), optional case assignment, serial number, purchase date, notes, photos, documents, and a maintenance logbook (date + comment + user per entry)
- Database: new `Consumable` model for single-use stock items (confetti, pyro cartridges, titanium dust, etc.) with unit, stock quantity, and notes; stock decrements after event completion
- Database: new `Group` model as a reusable event template bundling Cases, Devices, Items, and Consumables (with quantity per consumable entry)
- Database: new `Event` model with venue, location, start/end date+time, client contact, stagehands (existing users), full inventory (Cases, Devices, Items, Consumables), status (`Planned / Confirmed / Completed / Cancelled / NeedsDetails`), and invoice status (`Paid / NotPaid / DepositPaid / DepositNotYetPaid / NotPaidInFull`)
- Case now stores `warehouseLocation` (free text, e.g. "Warehouse A / Shelf 3") and `notes`
- Inventory page header split into two rows: Row 1 is title + QR Generator; Row 2 (editors/admins) has + New Case, + New Item, + New Device, + New Consumable buttons
- Events page header split into two rows: Row 1 is title; Row 2 (editors/admins) has + New Event and Groups buttons

---

## v1.0.3 - 2026-04-01

### Added

- Update snackbar: after a version bump, a blue snackbar appears at the bottom of the screen on first visit showing "App updated to vX.Y.Z"; auto-dismisses after 6 seconds; version is read live from CHANGELOG.md and tracked per-browser in localStorage
- Editors can now delete cases (previously admin-only)
- Inventory case cards now have a fixed-width button area so card width is consistent across all roles
- Gear list items can now be reordered by drag-and-drop; up/down arrow buttons removed; supports mouse drag and long-press drag on touch devices
- QR code label text size is now dynamic: scales up to fill the available width with padding, so short codes render large instead of small and fixed

### Fixed

- Moving an item to another case no longer causes the destination case name to bleed into the Move dropdown of the next item in the list (was caused by index-based React keys reusing DOM nodes after removal)
- Delete confirmations now appear as a centered modal overlay instead of inline text within the card; applies to case deletion from inventory, and item, photo, and document deletion from the case editor

---

## v1.0.2 - 2026-03-31

### Added

- Inventory search: live client-side filter input on the Inventory page that searches by case name and item names within a case; cases matched via item show the matching item names highlighted below the case metadata
- iPhone safe-area support: header now extends under the notch/Dynamic Island (`env(safe-area-inset-top)`), footer has padding above the home indicator (`env(safe-area-inset-bottom)`)
- Inventory search: matched item names now wrap across multiple lines instead of overflowing as a single truncated line; each item on its own line
- Search input clear button styled as a custom white SVG X, replacing the native browser icon which was not visible on the dark background
- New case creation now completes in one step: "Create Case" creates the case, uploads any pending photos and documents, then redirects to the case detail page - no second "Save Changes" click required
- PDF upload now shows an inline title and type form instead of browser prompt dialogs; document type is a dropdown (Manual / Certificate / Other)
- Document type enum values renamed from ALL_CAPS to CamelCase; added Bill, Order, Invoice, and Service Report types
- Edit Case button added to the case detail view for editors and admins, linking directly to the case editor
- Audit logging for all write operations - events are stored in a new `AuditLog` table and displayed in the Admin panel (last 100 events, most recent first)
- Logged events: `CASE_CREATED`, `CASE_UPDATED`, `CASE_DELETED`, `IMAGE_UPLOADED`, `IMAGE_DELETED`, `DOCUMENT_UPLOADED`, `DOCUMENT_DELETED`, `ITEM_MOVED`, `ROLE_CHANGED`
- Each log entry records the acting user, target resource ID, and a JSON metadata field (e.g. case name, file name, old/new role)
- New user account: `editor@sfxproone.com` with Editor role

### Changed

- Added Events tab to the header navigation (visible to all roles, placeholder for now)
- Moved Admin link from the header to the footer alongside Release notes; only visible to admins
- Renamed the "Editor" navigation tab to "Inventory"
- Inventory page is now accessible to users with the Viewer role
- Viewers see the full case list with "View" links but no write controls (New Case, Edit, Delete buttons are hidden)

### Infrastructure

- Added `docker-compose.override.yml` for local deployment (local volumes, exposed ports 3000/9000/9001, local proxy network)
- Updated `.env` with local-deployment defaults (`NEXTAUTH_URL`, `MINIO_PUBLIC_URL` pointing to localhost, generated `AUTH_SECRET`)
- Added migration `20260331000000_add_audit_log` creating the `AuditLog` table with a descending `createdAt` index

---

## v1.0.1 - 2026-03-26

### Added

- QR code generator modal in the editor: enter a custom label or auto-generate a 20-character random ID, renders a downloadable 1024×1024 PNG with a text label strip
- Footer on every page with credits ("Made by olliecross © 2026"), social icon links (Instagram, LinkedIn, GitHub), and a link to the release notes

### Fixed

- File uploads in production were blocked by a Mixed Content error -presigned PUT URLs were signed against the internal Docker hostname (`http://minio:9000`). Introduced a separate `s3Public` client using `MINIO_PUBLIC_URL` so the browser receives a valid public HTTPS URL
- File uploads returned 403 Forbidden -AWS SDK v3 was adding a `x-amz-checksum-crc32` header to presigned URLs which MinIO rejected. Fixed by setting `requestChecksumCalculation: 'WHEN_REQUIRED'`
- File uploads returned 403 Forbidden -`PutObjectCommand` included a `ContentLength` of 20 MB, causing a signature mismatch when the actual file was smaller. Removed `ContentLength` from the command
- Uploaded files could not be viewed -presigned GET URLs were also signed against the internal hostname. `getFileUrl()` now uses `s3Public`
- PDF.js worker returned 404 -the CDN URL for pdfjs-dist 4.10.38 does not exist on cdnjs. Worker file is now self-hosted at `/pdf.worker.min.mjs` (copied from `node_modules`)
- PDF viewer only showed content after pressing "Next" -`renderPage(1)` ran before React had mounted the canvas element. Canvas is now always in the DOM (hidden via CSS while loading) so the ref is available immediately
- CORS errors on MinIO PUT requests -`PutBucketCorsCommand` is not implemented in this MinIO build. Removed the SDK call and configured CORS via Traefik middleware labels instead (`accesscontrolalloworiginlist`, `accesscontrolallowmethods`, `accesscontrolallowheaders`)

### Infrastructure

- Added `MINIO_SERVER_URL` env var to the MinIO container so it validates presigned URL hostnames correctly
- Added MinIO service to the `proxy` Traefik network and configured a public router at `minio.sfxproone.olliecross.com`
- Added `MINIO_PUBLIC_URL` to `.env.example`

---

## v1.0.0 - 2026-03-26

### Added

- QR code scanner always selects the rear camera by default (no camera picker shown)
- Sign-out button now correctly redirects to the login page in production
- Footer on every page with credits, social links (Instagram, LinkedIn, GitHub) and a link to release notes
- Release notes page at `/changelog` rendered from `CHANGELOG.md`

### Infrastructure

- Fixed `NEXTAUTH_URL` pointing to `localhost:3000` in production environment
- Added `marked` for server-side markdown rendering

---

## v0.9.0 - Phase 9

### Deployed

- Application live at `https://sfxproone.olliecross.com` with valid Let's Encrypt certificate
- Credentials login and Authentik OIDC SSO both functional
- Automatic database migrations on container start via `entrypoint.sh`
- All 4 containers healthy: app, postgres, redis, minio

---

## v0.8.0 - Phase 8

### Infrastructure

- Traefik v3 reverse proxy with automatic HTTPS (Let's Encrypt)
- Authentik OIDC deployed at `https://auth.sfxproone.olliecross.com`
- Role claims (`ADMIN`, `EDITOR`, `VIEWER`) mapped from Authentik groups via scope expression
- DNS configured and pointing to server public IP

---

## v0.7.0 - Phase 7

### Added

- Admin dashboard: user table with inline role selector
- Redis sliding-window rate limiting on login (5 attempts / 60 s)
- Upload rate limiting: 429 after 20 requests per user per 60 s

### Infrastructure

- Multi-stage Dockerfile: deps - builder - runner (standalone, non-root user)
- `entrypoint.sh` runs `prisma migrate deploy` before starting the server

---

## v0.6.0 - Phase 6

### Added

- Case editor: create and edit cases with gear list, images, and PDFs
- Direct file uploads via MinIO pre-signed PUT URLs (no Next.js bottleneck)
- HEIC/HEIF - JPEG conversion client-side via `heic2any`
- Image resize/compress: max 1920 px, quality 0.8 via `browser-image-compression`
- Camera capture or file picker for photo uploads
- Drag-to-reorder gear list items
- Move items between cases via dropdown

---

## v0.5.0 - Phase 5

### Added

- QR code scanner page with manual code entry fallback
- Case detail page: gear list, image gallery with lightbox, PDF viewer
- Legacy Google Keep QR code URLs supported (looked up by `qrdata` field)
- Pre-signed GET URLs generated server-side (never exposed to client)

---

## v0.4.0 - Phase 4

### Added

- Login page with credentials form, loading state, and error display
- Role-aware header: nav links hidden below required role
- Role badge (Admin / Editor / Viewer)
- `AuthGuard` client component enforcing RBAC on protected routes

---

## v0.3.0 - Phase 3

### Added

- API routes: cases CRUD, QR lookup, MinIO pre-signed URL generation
- Zod validation on all request bodies
- MIME type allowlist for uploads
- Session + role checks on every route (401 / 403)

---

## v0.2.0 - Phase 2

### Added

- Prisma singleton client
- NextAuth v5 with credentials provider and optional Authentik OIDC
- MinIO S3 client with `ensureBucket` / `getFileUrl` / `deleteFile` helpers
- Redis singleton for rate limiting
- `usePermissions` and `useUpload` hooks

---

## v0.1.0 - Phase 1

### Added

- Project scaffold: Next.js 15 App Router, TypeScript, Tailwind CSS
- Prisma schema: User, Case, Item, Image, Document models
- Docker Compose stack: postgres, redis, minio, nextjs-app
- Environment variable template (`.env.example`)
