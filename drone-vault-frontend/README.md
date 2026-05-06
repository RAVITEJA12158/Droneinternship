# DroneVault Frontend

Drone Agriculture Data Management Platform — Next.js 14 App Router frontend.

## Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + Tailwind CSS
- **State**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod
- **Maps**: Leaflet + React-Leaflet
- **HTTP**: Axios with cookie auth interceptors
- **Upload**: react-dropzone (multipart streaming)
- **Notifications**: react-hot-toast
- **Icons**: lucide-react

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env.local
# Edit NEXT_PUBLIC_API_URL to point to your backend

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/           — Next.js App Router pages
  components/    — Reusable UI components
  hooks/         — React Query + custom hooks
  lib/api/       — Axios API clients per resource
  lib/utils/     — formatBytes, formatDate, etc.
  lib/validations/ — Zod schemas for forms
  store/         — Zustand global stores
  types/         — Shared TypeScript interfaces
  middleware.ts  — Route protection (session cookie)
```

## Key Pages

| Route | Description |
|-------|-------------|
| `/login` | Login form |
| `/register` | Registration form |
| `/` | Dashboard with stats |
| `/projects` | Project list |
| `/projects/new` | Create project |
| `/projects/[id]` | Project detail (tabs) |
| `/projects/[id]/missions/new` | Create mission |
| `/projects/[id]/missions/[id]` | Mission detail (tabs) |
| `/projects/[id]/missions/[id]/upload` | 4-step upload wizard |

## Auth

Auth is cookie-based (httpOnly session cookie from backend). `middleware.ts` redirects unauthenticated users to `/login`.

## Backend API

Expected at `NEXT_PUBLIC_API_URL` (default: `http://localhost:4000`).

See `src/lib/api/` for all endpoint contracts.
