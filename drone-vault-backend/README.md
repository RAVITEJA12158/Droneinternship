# DroneVault Backend

Node.js + Express + Prisma + PostgreSQL backend for the Drone Agriculture Data Management Platform.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill env
cp .env.example .env

# 3. Generate Prisma client & run migrations
npx prisma migrate dev --name init

# 4. Start dev server
npm run dev
```

## Prerequisites
- Node.js 20+
- PostgreSQL 15
- Redis (for BullMQ background jobs)

## API Base URL
`http://localhost:4000/api`

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register |
| POST | /auth/login | Login |
| GET | /projects | List projects |
| POST | /projects | Create project |
| GET | /projects/:id/missions | List missions |
| POST | /missions/:id/upload/rgb | Upload RGB images |
| POST | /missions/:id/upload/multispectral | Upload MS TIFFs |
| POST | /missions/:id/upload/orthomosaic | Upload orthomosaics |
| GET | /missions/:id/files | List files (paginated) |
| GET | /missions/:id/capture-sets | List capture sets |
| POST | /missions/:id/export/zip | Queue ZIP export |
| GET | /dashboard/stats | Dashboard stats |
| GET | /search?q= | Global search |

## Storage Layout

```
STORAGE_ROOT/
  projects/{projectId}/{missionId}/
    plan/         ← mission plan files
    raw/rgb/      ← RGB JPGs
    raw/multispectral/  ← MS TIFFs
    orthomosaic/rgb|multispectral|ndvi|dsm/
    thumbnails/   ← auto-generated
    exports/      ← ZIP/PDF exports
    temp/         ← upload staging
```
