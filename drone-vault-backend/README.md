# DroneVault Backend

Node.js + Express + Prisma + PostgreSQL backend for the Drone Agriculture Data Management Platform.

## Quick Start

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

Set `DISEASE_MODEL_CHECKPOINT` in `.env` to enable the post-labelling disease prediction stage.

## Prerequisites

- Node.js 20+
- PostgreSQL 15
- Python 3.10+ with `rasterio`, `numpy`, `matplotlib`, `scikit-image`, `scikit-learn`, `torch`, and `timm` for multispectral labelling and disease prediction

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
| POST | /missions/:id/upload/multispectral | Upload multispectral TIFFs |
| POST | /missions/:id/upload/orthomosaic | Upload orthomosaics |
| GET | /missions/:id/files | List files, paginated |
| GET | /missions/:id/capture-sets | List capture sets |
| POST | /missions/:id/labelling/start | Start multispectral labelling |
| GET | /missions/:id/labelling | Get labelling status and outputs |
| GET | /orthomosaics/:id/preview | View generated JPEG preview |
| GET | /orthomosaics/:id/download | Download original orthomosaic |
| POST | /missions/:id/export/zip | Create ZIP export |
| GET | /dashboard/stats | Dashboard stats |
| GET | /search?q= | Global search |

## Storage Layout

```text
STORAGE_ROOT/
  projects/{projectName}/{missionName}/
    plan/                         mission plan files
    raw/rgb/                      RGB JPGs
    raw/multispectral/           multispectral TIFFs
    orthomosaic/rgb/
    orthomosaic/multispectral/
    orthomosaic/ndvi/
    orthomosaic/dsm/
    labelling/{jobId}/              NDVI, NDRE, and label map outputs
    thumbnails/                   generated image previews
    exports/                      ZIP and JSON exports
  temp/                           upload staging
```
