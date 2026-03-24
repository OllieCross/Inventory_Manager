# SFXProOne CaseManager - File & Folder Structure

This document outlines the projected file and folder structure for the SFXProOne CaseManager full-stack application. It uses Next.js 15 (App Router), Prisma, Tailwind CSS, Docker, and various integrations (MinIO, Redis, Authentik, Traefik).

```text
SFXProOne_CaseManager/
|-- .env                     # Contains secret environment variables (DB credentials, MinIO keys, Auth secrets)
|-- .env.example             # Template for .env (safe to commit to version control)
|-- .gitignore               # Ignores node_modules, .next, .env, and other sensitive/build files
|-- .dockerignore            # Files and directories to exclude from the Docker build context
|-- .eslintrc.json           # ESLint configuration for code quality and Next.js strict rules
|-- .prettierrc              # Prettier configuration for consistent code formatting
|-- README.md                # General project documentation
|-- claudecode.md            # Originally provided project requirements and architecture
|-- filestructure.md         # This file
|-- docker-compose.yml       # Defines the app stack: nextjs-app, postgres, redis, minio
|-- Dockerfile               # Multi-stage Docker build for the Next.js frontend/API
|-- package.json             # NPM dependencies, scripts, and project metadata
|-- package-lock.json        # Deterministic dependency tree mapping
|-- postcss.config.mjs       # Configuration for PostCSS (required by Tailwind CSS)
|-- tailwind.config.ts       # Tailwind CSS configuration, theme extensions, and plugin list
|-- tsconfig.json            # TypeScript configuration and compiler options
|-- next.config.mjs          # Next.js configuration (e.g., image domains for MinIO, standalone output for Docker)
|-- next-env.d.ts            # Next.js TypeScript declarations
|
|-- prisma/                  # Prisma ORM Database Directory
|   |-- schema.prisma        # Database schema definitions and relationships
|   |-- seed.ts              # Script to seed initial data (e.g., admin users, test cases)
|   `-- migrations/          # Auto-generated SQL migrations from Prisma
|
|-- public/                  # Static assets served at the root (/)
|   |-- favicon.ico          # Website icon
|   |-- logo.svg             # Company logo
|   |-- manifest.json        # PWA setup for Chrome Home Screen bookmarking
|   `-- icons/               # Icons for iOS and Android home screen shortcuts
|
|-- src/                     # Source Code Directory
|   |-- app/                 # Next.js 14 App Router Directory
|   |   |-- layout.tsx       # Root layout containing HTML/body, providers (SessionProvider)
|   |   |-- page.tsx         # Home page: redirects to /scan (authed) or /login (unauthed)
|   |   |-- globals.css      # Global styles, Tailwind base, btn/input/card utility classes
|   |   |
|   |   |-- login/
|   |   |   `-- page.tsx     # Credentials login form with error display
|   |   |
|   |   |-- api/             # Next.js API Routes (Backend logic)
|   |   |   |-- auth/
|   |   |   |   `-- [...nextauth]/route.ts  # NextAuth.js v5 handler for Authentik OIDC
|   |   |   |-- cases/
|   |   |   |   |-- route.ts                # GET all cases, POST new case
|   |   |   |   |-- lookup/route.ts         # GET ?qrdata=... -> returns case id (used by scanner)
|   |   |   |   `-- [id]/
|   |   |   |       |-- route.ts            # GET, PUT, DELETE specific case
|   |   |   |       |-- images/
|   |   |   |       |   |-- route.ts        # POST: record image after MinIO upload
|   |   |   |       |   `-- [imageId]/route.ts  # DELETE: remove from MinIO + DB
|   |   |   |       |-- documents/
|   |   |   |       |   |-- route.ts        # POST: record document after MinIO upload
|   |   |   |       |   `-- [docId]/route.ts    # DELETE: remove from MinIO + DB
|   |   |   |       `-- items/[itemId]/move/route.ts  # PATCH: move item to another case
|   |   |   `-- minio/
|   |   |       `-- presigned-url/route.ts  # Generates presigned PUT URLs for direct MinIO uploads
|   |   |
|   |   |-- scan/
|   |   |   `-- page.tsx     # QR Scanner interface using html5-qrcode
|   |   |
|   |   |-- case/
|   |   |   `-- [id]/page.tsx # Dynamic route to display case contents, PDFs, and Images
|   |   |
|   |   |-- editor/          # Editor Dashboard (Role protected)
|   |   |   |-- page.tsx     # Server component: case list with edit/delete actions
|   |   |   |-- new/page.tsx # Create new case: name, description, QR code, gear list
|   |   |   `-- [id]/page.tsx # Edit case: gear list + photo/document upload/delete
|   |   |
|   |   `-- admin/           # Admin Dashboard (Role protected)
|   |       `-- page.tsx     # Future user management, audit logs, and system limits
|   |
|   |-- components/          # Reusable React Components
|   |   |-- ui/              # Shared UI elements (Buttons, Inputs, Cards, Modals)
|   |   |-- scanner/
|   |   |   `-- QRScanner.tsx # client-side wrapper for html5-qrcode
|   |   |-- media/
|   |   |   |-- PDFViewer.tsx # Integrates pdf.js to view manuals/certificates
|   |   |   `-- CaseGallery.tsx # Image viewer for case contents
|   |   |-- editor/
|   |   |   `-- DeleteCaseButton.tsx  # Confirm-before-delete client button (admin only)
|   |   |-- forms/
|   |   |   `-- CaseEditorForm.tsx # Create/edit form: items, HEIC convert, compress, upload, move
|   |   `-- layout/
|   |       |-- Header.tsx   # Navigation bar highlighting current user and role
|   |       `-- AuthGuard.tsx # Wrapper to enforce RBAC (Viewer, Editor, Admin)
|   |
|   |-- lib/                 # Shared Utility Modules & Integrations
|   |   |-- prisma.ts        # Singleton Prisma client setup
|   |   |-- auth.ts          # NextAuth configuration and role extraction logic
|   |   |-- minio.ts         # Wrapper for AWS S3 SDK connecting to MinIO
|   |   |-- redis.ts         # Redis connection and UI rate-limiting helpers
|   |   `-- utils.ts         # General utilities (Tailwind class merging, formatting)
|   |
|   |-- hooks/               # Custom React Hooks
|   |   |-- usePermissions.ts # Hook to easily check specific user roles (VIEWER, EDITOR, ADMIN)
|   |   `-- useUpload.ts     # Hook managing the pre-signed URL fetching and direct MinIO push
|   |
|   `-- types/               # TypeScript Typings and Interfaces
|       |-- next-auth.d.ts   # Extend NextAuth session types to include custom roles
|       `-- case.d.ts        # Domain interfaces (e.g., ICase, IGear, IFile)
|
`-- infrastructure/          # Out-of-band Docker configuration mappings (Traefik, Authentik)
    |-- traefik/
    |   |-- traefik.yml      # Base Traefik static configuration
    |   |-- dynamic_conf.yml # TLS settings, routers, and middlewares
    |   `-- acme.json        # Let's Encrypt certificate storage (ensure proper permissions)
    `-- authentik/
        `-- docker-compose.yml # Standalone Authentik orchestration if kept separate from the main app stack
```

## Key Highlights

- **`src/app/api/minio/presigned-url/route.ts`**: This handles generating the Pre-signed URLs as requested, protecting the server loop.
- **`Dockerfile`**: Will be crafted with a multi-stage `standalone` Next.js build strategy to keep the final image minimal.
- **`src/components/scanner/QRScanner.tsx`**: Where the logic for standard QR codes vs legacy `keep.google.com` links is split.
- **`src/components/forms/CaseEditorForm.tsx`**: Will hold the `heic2any` library logic before requesting a presigned URL.
- **`infrastructure/`**: Details the broader system-level deployments that connect the web app to SSL and SSO.
