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

## 📌 Project Overview

**SFXProOne Case Manager** is a comprehensive, full-stack case management application built to orchestrate, track, and manage complex cases, attachments, and digital assets. It features a modern, responsive user interface utilizing the latest Next.js App Router, backed by up-to-date deployment infrastructure including Docker, Traefik, Authentik, MinIO, Redis, and a Prisma ORM integrated database.

## ✨ Key Features

- **Advanced Case Management:** Create, track, and update cases via an intuitive Case Editor panel.
- **Media & Document Handling:** Securely upload, view (PDFs, Images), and manage digital evidence through MinIO Object Storage, utilizing pre-signed URLs.
- **QR Code Scanning:** Quickly navigate or assign assets / case details on the go using the integrated QR Scanner (`/scan`).
- **Access Control & Security:** NextAuth integrated with an external **Authentik** SSO provider, complete with custom permission hooks and Role-Based Access Controls (Admin dashboard, Editor paths).
- **Reverse Proxy Routing:** Robust network and SSL processing powered by **Traefik**.
- **Real-time caching & Background tasks:** Leveraging **Redis** for performant session handling and backend task execution.

## 🏗 Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & PostCSS
- **Database ORM:** Prisma
- **Auth:** NextAuth.js + Authentik
- **Storage:** MinIO (S3 compatible object storage)
- **Caching:** Redis
- **Infra:** Docker, Docker Compose, Traefik
- **UI Components:** Custom forms, PDF Viewers, Auth Guards, QR Scanners

## 📁 System Architecture & Directory Structure

- `/src/app`: Next.js App Router routes (e.g., `/admin`, `/editor`, `/scan`, `/case/[id]`).
- `/src/components`: Reusable UI modules (Forms, Media viewers, Scanners, Layouts).
- `/src/lib`: Core service integrations (`prisma.ts`, `minio.ts`, `redis.ts`, `auth.ts`).
- `/src/hooks`: Custom React hooks for uploading files and checking permissions.
- `/prisma`: Database schema and database seeding scripts.
- `/infrastructure`: Essential external services container arrangements.
- `/authentik`: SSO/Identity Management platform.
- `/traefik`: Edge router and ACME (Let's Encrypt) configuration.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [Git](https://git-scm.com/)

### Installation & Local Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd SFXProOne_CaseManager
   ```

2. **Install Node dependencies:**

   ```bash
   npm install
   # or yarn / pnpm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory (use a `.env.example` if provided) and populate it with your specific secrets:
   - Database connection string (PostgreSQL/MySQL)
   - NextAuth Secrets and URLs
   - MinIO credentials and bucket names
   - Redis connection strings

4. **Spin up Infrastructure (Docker):**
   Start the supporting databases, Redis, MinIO, Authentik, and Traefik instances:

   ```bash
   docker-compose up -d
   ```

   *(You may also need to start specific infrastructure stacks manually inside `/infrastructure` if they aren't bundled in the main `docker-compose.yml`)*

5. **Run Prisma Migrations:**

   ```bash
   npx prisma migrate dev
   npx prisma db seed # If seed data is required
   ```

6. **Start the Development Server:**

   ```bash
   npm run dev
   ```

The application should now be running cleanly on [http://localhost:3000](http://localhost:3000).

## 🛡 Authentication

This project relies on **Authentik** via NextAuth. Ensure that your Authentik instance is running, and you have configured an appropriate OAuth2 / OIDC application for NextAuth to communicate with.

## ✅ To-Do List

v1.0.0.

- [x] basic features
- [x] docker deploy

v1.0.1.

- [x] favicon.ico implementation
- [ ] default rear camera option
- [ ] Release Notes page
- [ ] No Case found Page
- [ ] Dockerfile optimizations
- [ ] Migrate Authentik and Traefik to separate folders outside project codebase

v1.0.2.

- [ ] Light/Dark mode switch based on OS settings
- [ ] Footer with credits, github, linkedin, instagram, copyrights
- [ ] /edit - option to edit the assigned qr code to case
- [ ] /scan - option to ist all available cases
- [ ] DB daily backup
- [ ] password changer

v 1.1.0.

- [ ] Events organisation system
- [ ] /events - date/location/time/contact/users/inventory/comment
- [ ] Event inventory PDF generator
