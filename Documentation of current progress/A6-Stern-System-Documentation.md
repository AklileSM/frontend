# A6 Stern — Full System Documentation

Last updated: April 8, 2026

Quickstart onboarding? See docs/ONBOARDING.md

## Technical Guide (Read This First)

This section leads with the practical, technical details you need to build, operate, and extend A6 Stern. Each topic explains what the component does, how it works internally, and how to use it with concrete commands/examples.

### 1. System Architecture

What it is
- A browser UI (React) served by Nginx talks to a FastAPI backend. The backend stores metadata in PostgreSQL and all large files in MinIO on a Synology NAS. An external (configurable) Vision API generates structured image descriptions. Point clouds (LAZ/LAS) are converted to Potree format for web viewing.

How it works
- The frontend proxies `/api/*` to the backend over the Docker network. The backend streams object bytes from MinIO back to the browser, keeping everything same-origin. For point clouds, the backend preserves HTTP Range semantics needed by Potree.

How to use it
- In production, open `http://<VM-IP>:3003` for the UI. Backend docs live at `http://<VM-IP>:3002/api/docs`. For health checks use `http://<VM-IP>:3002/api/health`.

Runtime diagram
```
Browser → Frontend (Nginx) ──/api──▶ Backend (FastAPI)
                                   ├─▶ PostgreSQL (metadata)
                                   ├─▶ MinIO on Synology (objects)
                                   └─▶ Vision API (AI analysis)
```

### 2. File Storage and Object Layout (MinIO)

What it is
- S3-compatible object storage holds originals, thumbnails, reports, and Potree artifacts. Buckets are configurable; defaults are provided.

How it works
- Keys are grouped by room slug and capture date for human legibility. Point cloud Potree outputs are stored alongside the original under a `_potree/` subpath.

How to use it
- Ensure buckets exist on the NAS (API port, not Console port):
  - `construction-images`, `construction-thumbnails`, `construction-pointclouds`, `construction-reports` (and optional `construction-pdfs`).
- The backend proxies objects to the browser; you do not need to expose MinIO publicly.

Key patterns
- Images/Videos/PDFs: `{roomSlug}/{YYYY-MM-DD}/{uuid}.{ext}`
- Thumbnails: `{roomSlug}/{YYYY-MM-DD}/thumb-{uuid}.jpg`
- Point clouds: `{roomSlug}/{YYYY-MM-DD}/{uuid}.laz` and `{same-base}_potree/{metadata.json|hierarchy.bin|octree.bin}`

### 3. Data Model (PostgreSQL)

What it is
- Normalized metadata for projects, rooms, file assets, reports, annotations, and users.

How it works
- SQLAlchemy models define tables; the app creates tables at startup. FileAsset rows point to MinIO bucket/object pairs and carry extra flags in `metadata_json` (e.g., conversion status, uploaded_by).

How to use it
- Query examples (psql inside the db container):
  - List files by date: `SELECT id, display_name FROM file_assets WHERE capture_date='2026-03-29' ORDER BY created_at DESC;`
  - Latest reports: `SELECT id, file_id, created_at FROM reports ORDER BY created_at DESC LIMIT 20;`

Entities (purpose-focused)
- Project/Room: logical grouping for media; Room has a stable `slug` used in URLs and storage keys.
- FileAsset: one record per uploaded file; links to Room; points to MinIO; media_type is image|video|pointcloud|pdf; thumbnails optional.
- Report: PDF and notes tied to an image; includes flags/screenshots metadata.
- Annotation: small JSON overlays per file for UI features.
- User: password hash (bcrypt), role (viewer|manager|admin), active state.

### 4. Uploads and Conversion

What it is
- Authenticated file ingestion with special handling for large point clouds.

How it works
- Standard files (image/video/pdf): read into memory (bounded), stored in MinIO, thumbnail generated for images. Point clouds: streamed to a temp file, uploaded to MinIO, then PotreeConverter runs in a background task; status moves pending → processing → ready (or failed with an error message).

How to use it (API examples)
- Single image upload:
  - `curl -sS -X POST http://127.0.0.1:3001/api/upload/single -H "Authorization: Bearer $TOKEN" -F room_slug=room-101 -F media_type=image -F capture_date=2026-03-29 -F file=@photo.jpg`
- Point cloud (direct-to-MinIO flow):
  1) `POST /api/upload/pointcloud/direct-init` → presigned PUT URL
  2) `PUT` file to MinIO with that URL
  3) `POST /api/upload/pointcloud/direct-complete` → DB record + conversion queued
- Check status: `GET /api/files/{file_id}/conversion-status`

### 5. Media Access and Viewers

What it is
- Backend-proxied media access so the browser never talks to MinIO directly.

How it works
- Images: UI uses thumbnails for grids and switches to `/api/files/{id}/content` for full view.
- Videos/PDFs: served via `/api/files/{id}/content` and rendered in the browser.
- Point clouds: Potree fetches `/api/files/{id}/pointcloud/{metadata.json|hierarchy.bin|octree.bin}`; Nginx forwards Range headers so seeking works.

How to use it
- Open any file by navigating to its `src` in the API response from explorer endpoints, or via the UI viewers (Room explorer, By‑date view, PDF viewer, Potree viewer).

### 6. AI Image Analysis

What it is
- A wrapper around a Vision API that produces a 3‑section report (Scene, Quality Issues, Safety Issues) for any image.

How it works
- Prefer `file_id`: the backend fetches bytes from MinIO and sends base64 to the Vision API (no public URL required). If given a URL, the backend verifies it’s usable or downloads it first. Responses are cached in-memory by a deterministic key.

How to use it
- `curl -sS -X POST http://127.0.0.1:3001/api/ai/analyze -H "Content-Type: application/json" -d '{"file_id":"'$FILE_ID'"}'`
- Configure `VISION_API_URL`, `VISION_MODEL`, and (optionally) `VISION_API_KEY` in backend env.

### 7. API Guide (Descriptive)

Auth (JWT; first user becomes admin)
- Purpose: identify users and grant roles. Tokens are HS256 JWTs. Passwords are bcrypt‑hashed.
- Usage: `POST /auth/register` then `POST /auth/login`; UI stores `access_token` and sends `Authorization: Bearer` on all API calls.

Projects and Rooms
- Purpose: define navigation axes. Rooms carry `slug` used by UI and storage keys.
- Usage: list with `GET /projects/` and `GET /rooms/`; fetch a single room `GET /rooms/{room_slug}`.

Explorer and Files
- Purpose: high‑level listings for the UI grouped by date or by room.
- Usage: `GET /files/explorer/date/{YYYY-MM-DD}` or `GET /files/explorer/room/{room_slug}`; the response contains groups with `images`, `videos`, `pointclouds`, and `pdfs`, each with a `src` suitable for viewers.
- Admin usage: `GET /files/my-uploads` shows assets credited to the current user; `DELETE /files/{id}` removes both DB row and MinIO object.

Uploads
- Purpose: durable ingestion; thumbnails for images; background conversion for point clouds.
- Usage: single‑file for most media via `/upload/single`; direct/chunk flows for point clouds via `/upload/pointcloud/*`.

Reports and Annotations
- Purpose: store field‑observation PDFs and lightweight overlays tied to an image.
- Usage: list with `GET /reports/`; upload PDF via `POST /reports/with-pdf` (multipart); delete with `DELETE /reports/{id}`; annotations via `GET /annotations/file/{file_id}` and `POST /annotations`.

### 8. Configuration (Explained)

What it is
- Backend environment variables drive DB connectivity, MinIO, CORS, auth, upload sizes, and AI.

How it works
- `DATABASE_URL` overrides discrete DB vars; `MINIO_*` configure object storage; `FRONTEND_URL` and `CORS_EXTRA_ORIGINS` set allowed browsers; `JWT_SECRET` signs tokens; upload caps are explicit; point‑cloud cleanup is toggled by `DELETE_ORIGINAL_POINTCLOUD_AFTER_CONVERSION`.

How to use it
- Copy `deployment/.env.docker` → `.env` on the VM. Minimum to set: DB creds, MinIO endpoint+API port+access/secret, `JWT_SECRET`. For AI, set `VISION_API_URL` and (optionally) `VISION_API_KEY`.

Common pitfalls
- Using the MinIO Console port for the backend will fail; use the API port. Empty `JWT_SECRET` invalidates all auth on restart.

### 9. Deployment & Operations (Compose)

What it is
- A docker‑compose stack that builds and runs Postgres, pgAdmin, backend, and frontend.

How it works
- Stable volume names keep data across redeployments. Nginx inside the frontend image proxies `/api` and optimizes for large uploads and Range responses.

How to use it
- Bring up: `cd deployment && cp .env.docker .env && docker-compose up -d --build`
- Check: `docker-compose ps`, `docker-compose logs -f backend`
- Access: UI at `:3003`; backend at `:3002`; pgAdmin at `:5050`
- Backup DB: `docker-compose exec db pg_dump -U postgres a6_stern > a6_stern.sql`

### 10. Security and Roles

What it is
- JWT-based auth with roles (viewer, manager, admin). CORS restricted to known frontends.

How it works
- Tokens signed with `JWT_SECRET`, expire after `JWT_EXPIRE_MINUTES`. Admin/manager can delete objects; only admin can upload (guarded in `deps.require_user_can_upload`). All media fetches are same‑origin via backend to avoid leaking private endpoints.

How to use it
- Rotate `JWT_SECRET` to invalidate all sessions; extend CORS via `CORS_EXTRA_ORIGINS` if hosting the UI at additional origins.

### 11. Developer Workflows

Add an API
- Create a router in `backend/app/api/`, include it from `app/main.py`; define request/response models in `app/schemas.py`. Add a typed wrapper in `frontend/src/services/apiClient.ts`.

Add a media type
- Extend backend bucket mapping and serializers; update frontend `ApiMediaFile` union and viewers as needed.

Migrations
- Today tables are created on startup; adopt Alembic before making incompatible schema changes.

---


