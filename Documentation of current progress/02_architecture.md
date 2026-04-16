# A6 Stern — System Architecture

> For developers who need to understand how the system is built, how its parts connect, and how data moves through it. Last updated: 2026-04-14.

---

## Table of Contents

1. [Component Overview](#1-component-overview)
2. [Network Topology](#2-network-topology)
3. [Component Deep-Dives](#3-component-deep-dives)
   - [Nginx (Frontend Container)](#31-nginx--react-frontend-container)
   - [React SPA](#32-react-spa)
   - [FastAPI Backend](#33-fastapi-backend)
   - [PostgreSQL](#34-postgresql)
   - [MinIO Object Storage](#35-minio-object-storage)
   - [PotreeConverter](#36-potreeconverter)
   - [Ollama Vision API](#37-ollama-vision-api-external)
4. [Data Flows](#4-data-flows)
   - [Authentication](#41-authentication-flow)
   - [Image Upload](#42-image-upload-flow)
   - [Image Serving (Range Requests)](#43-image--video-serving-flow)
   - [Point Cloud Upload & Conversion](#44-point-cloud-upload--conversion-pipeline)
   - [AI Image Analysis](#45-ai-image-analysis-flow)
   - [Report Creation & PDF Publishing](#46-report-creation--pdf-publishing-flow)
5. [Database Schema](#5-database-schema)
6. [External Services](#6-external-services)
7. [Configuration Reference](#7-configuration-reference)

---

## 1. Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Host Machine (VM / NAS)                                        │
│                                                                 │
│  ┌─────────────────────────┐   ┌──────────────────────────┐    │
│  │  a6_stern_frontend      │   │  a6_stern_api            │    │
│  │  Nginx 1.27 + React SPA │   │  FastAPI / Uvicorn       │    │
│  │  :3003 → :80            │──▶│  :3002 → :3001           │    │
│  └─────────────────────────┘   └──────────┬───────────────┘    │
│                                            │                    │
│                          ┌─────────────────┼────────────┐      │
│                          ▼                 ▼            ▼      │
│               ┌──────────────┐  ┌──────────────┐              │
│               │ a6_stern_db  │  │ a6_stern_     │              │
│               │ Postgres 15  │  │ pgadmin       │              │
│               │ :5433 → :5432│  │ :5050 → :80  │              │
│               └──────────────┘  └──────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

External (on LAN):
  MinIO NAS        192.168.50.200:9100  (object storage)
  Ollama           192.168.50.103:11434 (Vision AI)
```

All four Docker containers share a single Compose network (`default`). The only services exposed to the host are the four mapped ports; everything else communicates container-to-container by service name.

---

## 2. Network Topology

### Port Map

| Container | Internal Port | Host Port | Purpose |
|---|---|---|---|
| `a6_stern_frontend` | 80 | **3003** | HTTP — Nginx serves React app + proxies `/api` |
| `a6_stern_api` | 3001 | **3002** | HTTP — FastAPI JSON API |
| `a6_stern_db` | 5432 | **5433** | PostgreSQL (direct access / psql) |
| `a6_stern_pgadmin` | 80 | **5050** | pgAdmin web UI |

### Compose Service Dependencies

```
a6_stern_frontend  depends_on → a6_stern_api
a6_stern_api       depends_on → a6_stern_db
a6_stern_pgadmin   depends_on → a6_stern_db
```

### Request Path from Browser

Every browser request enters through **port 3003 (Nginx)**. Nginx either serves a static file or proxies to the backend:

```
Browser  →  :3003  →  Nginx
                        ├── Static asset (.js/.css/font)  →  serve from /usr/share/nginx/html
                        ├── /api/files/{id}/pointcloud/*  →  proxy http://backend:3001 (range-aware)
                        ├── /api/*                        →  proxy http://backend:3001/api/
                        ├── /health                       →  proxy http://backend:3001/health
                        └── anything else                 →  /index.html (SPA fallback)
```

The React app never contacts the backend directly from JS — all API calls go to `/api` on the same origin and Nginx proxies them. This means MinIO is never exposed to browsers.

### Nginx Special Handling

**`/api/files/{id}/pointcloud/` (point cloud binaries):**
- `proxy_buffering off` — streams bytes directly, no Nginx RAM buffer
- `Range` header forwarded verbatim — Potree requires byte-range access
- `proxy_read_timeout 3600s` — large binary traversal can take minutes

**`/api/` (general API):**
- `proxy_buffering off` — prevents stalling on large multipart uploads
- `proxy_send_timeout 3600s` / `proxy_read_timeout 3600s` — supports 5 GB upload sessions
- `client_max_body_size 5G`

**Development (Vite):**
- `vite.config.ts` defines a proxy: `/api → http://localhost:3001`
- Mirrors production Nginx routing so the same frontend code works in both environments

---

## 3. Component Deep-Dives

### 3.1 Nginx + React Frontend Container

**Dockerfile:** Multi-stage build
1. `node:18-alpine` — runs `npm run build` (Vite)
2. `nginx:1.27-alpine` — copies `/dist` to `/usr/share/nginx/html`, injects `nginx.conf`

**React SPA responsibilities:**
- Client-side routing via React Router DOM 6 (18 routes defined in `App.tsx`)
- Auth token management (`auth/authSession.ts`) — JWT stored in `localStorage` under key `a6_auth_v2`
- All API calls via `services/apiClient.ts` — appends `Authorization: Bearer {token}` to every authenticated request
- Point cloud viewing — bundles Potree library from `frontend/dist/potree/`
- 360° viewing — A-Frame 1.6 + Three.js 0.170

**Session storage:**
```
localStorage['a6_auth_v2'] = {
  accessToken: "eyJ...",
  user: { id, username, email, role }
}
```
"Remember me" unchecked → token stored in module-level variable only (lost on page close).

---

### 3.2 FastAPI Backend

**Entry point:** `backend/app/main.py`  
**Server:** Uvicorn on port 3001 (ASGI)

#### Startup sequence (`lifespan` handler):
1. `Base.metadata.create_all(bind=engine)` — creates all tables if missing
2. `ensure_comparison_drafts_state_json(engine)` — schema migration helper
3. `seed_defaults(db)` — inserts default projects and rooms if the DB is empty
4. `storage_service.ensure_buckets()` — creates 5 MinIO buckets if missing

#### CORS origins (combined at startup):
- `settings.frontend_url` (from env)
- `http://localhost:5173`, `http://127.0.0.1:5173`
- `http://localhost`, `http://127.0.0.1`
- Any values in `CORS_EXTRA_ORIGINS` (comma-separated)

#### Registered routers:

| Prefix | Module | Key Responsibility |
|---|---|---|
| `/api/auth` | `api/auth.py` | Register, login, `/me` |
| `/api/projects` | `api/projects.py` | List projects |
| `/api/rooms` | `api/rooms.py` | List rooms, get by slug |
| `/api/files` | `api/files.py` | Explorer, serve files, delete |
| `/api/upload` | `api/upload.py` | Single + chunked + direct upload |
| `/api/ai` | `api/ai.py` | Vision AI analysis |
| `/api/reports` | `api/reports.py` | Reports, comparison drafts, viewer drafts |
| `/api/annotations` | `api/annotations.py` | Per-file JSON overlays |

#### Dependency injection pattern:
Every protected route uses `Depends(get_current_user)` from `api/deps.py`:
```
HTTP Request
  → Extract "Authorization: Bearer {token}"
  → decode_access_token(token)  [python-jose, HS256]
  → Assert payload["type"] == "access"
  → Query User by payload["sub"]
  → Assert user.is_active == True
  → Inject User into route handler
```

Upload routes additionally `Depends(require_user_can_upload)`:
```
  → Assert user.role == "admin"
  → Raise HTTP 403 otherwise
```

Delete routes check `_can_delete_file(user)`:
```
  → Return user.role in ("admin", "manager")
```

---

### 3.3 PostgreSQL

**Image:** `postgres:15-alpine`  
**Container:** `a6_stern_db`  
**Volume:** `a6_stern_postgres_data` (named, persists across container recreations)

**Connection from backend:**
```python
engine = create_engine(
    "postgresql+psycopg2://user:pass@db:5432/a6_stern",
    pool_pre_ping=True,   # DROP dead connections before use
    future=True           # SQLAlchemy 2.x style
)
```

**Session lifecycle:** `get_db()` yields a session per request; `finally` block closes it even on exception.

**Schema management:** Tables are created by SQLAlchemy on startup (`create_all`). There is no migration framework — schema changes are handled by `db_migrations.py` helpers run at boot.

**Tables:** `users`, `projects`, `rooms`, `file_assets`, `reports`, `comparison_drafts`, `viewer_report_drafts`, `annotations`. Full schema in [Section 5](#5-database-schema).

---

### 3.4 MinIO Object Storage

**Location:** External NAS at `192.168.50.200:9100` (not a Docker container)  
**Protocol:** S3-compatible HTTP API  
**Client library:** `minio-py 7.2.10`

#### Buckets (auto-created on startup):

| Bucket | Contents |
|---|---|
| `construction-images` | Original images and videos |
| `construction-thumbnails` | 400×300 JPEG thumbnails |
| `construction-pointclouds` | LAS/LAZ originals + converted Potree files |
| `construction-pdfs` | Field PDFs uploaded as file assets |
| `construction-reports` | Generated report PDFs |

#### Object naming convention:
```
images:        {room_slug}/{YYYY-MM-DD}/{uuid}_{original_filename}
thumbnails:    {room_slug}/{YYYY-MM-DD}/{uuid}_{filename}_thumb.jpg
pointclouds:   {room_slug}/{YYYY-MM-DD}/{uuid}_{filename}.laz
potree output: {room_slug}/{YYYY-MM-DD}/{uuid}_{stem}_potree/metadata.json
                                                              hierarchy.bin
                                                              octree.bin
reports:       {user_id}/{report_uuid}.pdf
```

#### Access pattern — browsers never talk to MinIO directly:
The backend proxies all MinIO reads through FastAPI endpoints (`/api/files/{id}/content`, `/api/files/{id}/pointcloud/*`). This keeps storage credentials server-side and allows Range request support regardless of MinIO's CORS configuration.

**Presigned PUT URLs** are used for the "direct" point cloud upload path (browser uploads large LAZ directly to MinIO without going through FastAPI, reducing backend load). The backend still controls authorization and verifies the upload afterward.

---

### 3.5 PotreeConverter

**Type:** CLI binary bundled inside the `a6_stern_api` container  
**Discovered at runtime:** Checks env `POTREE_CONVERTER_PATH`, then `$PATH`, then `/usr/local/bin/PotreeConverter`

**Why it exists:** Web browsers cannot render raw LAS/LAZ point cloud files. PotreeConverter transforms them into a streaming octree format (three binary files: `metadata.json`, `hierarchy.bin`, `octree.bin`) that the Potree.js viewer can progressively load using HTTP Range requests.

**Execution model:** Runs as a subprocess in a FastAPI `BackgroundTask` (not blocking the request). Timeout: 600 seconds.

---

### 3.6 Ollama Vision API (External)

**Location:** `http://192.168.50.103:11434` (LAN server, not Docker)  
**Protocol:** OpenAI-compatible chat completions API  
**Default model:** `qwen3-vl:8b`

**Why it exists:** Provides AI-generated descriptions of construction site images — structured output with Scene, Quality Issues, and Safety Issues sections. Running locally avoids sending site imagery to a cloud provider and gives low-latency access for large images.

The backend calls this API via `httpx` from `services/ai.py`. Results are cached in-process by a deterministic key (`file:{id}` for known assets, URL-based for others). The cache is in-memory and clears on container restart.

---

## 4. Data Flows

### 4.1 Authentication Flow

```
[Browser] POST /api/auth/login  { username, password }
    │
    ▼
[Nginx] proxy → FastAPI /api/auth/login
    │
    ▼
[FastAPI] auth.py
  1. Query User WHERE username = ?                    → [PostgreSQL]
  2. bcrypt.verify(plain_password, user.password_hash)
  3. create_access_token(sub=user.id, username, role)
     → JWT { sub, username, role, exp, iat, type="access" }
     → Signed with HS256 + JWT_SECRET
    │
    ▼
[Response] { access_token: "eyJ...", user: { id, username, email, role } }
    │
    ▼
[Browser] authSession.ts
  storeSession(session, persist=rememberMe)
    ├── persist=true  → localStorage['a6_auth_v2'] = JSON.stringify(session)
    └── persist=false → module variable only (ephemeral)

All subsequent requests:
  apiFetch() adds: "Authorization: Bearer eyJ..."
  FastAPI deps.py verifies token on every protected endpoint
```

---

### 4.2 Image Upload Flow

```
[Browser] FormData { file, room_slug, media_type="image", capture_date }
    │
    ▼
[Nginx] POST /api/upload/single
  client_max_body_size 5G
  proxy_buffering off
    │
    ▼
[FastAPI] upload.py — upload_single()
  1. require_user_can_upload → assert role == "admin"
  2. Query Room by room_slug                          → [PostgreSQL]
  3. Read file bytes into memory
  4. object_name = "{room_slug}/{date}/{uuid}_{filename}"
    │
    ├──[MinIO] PUT construction-images / {object_name}
    │
    └── (if media_type == "image"):
        5. PIL: open image bytes
           thumbnail = image.thumbnail(400×300)
           thumb_bytes = JPEG encode (quality 82)
          │
          └──[MinIO] PUT construction-thumbnails / {thumb_object_name}
    │
    ▼
  6. INSERT FileAsset {
       room_id, media_type, capture_date,
       bucket_name, object_name,
       thumbnail_bucket_name, thumbnail_object_name,
       metadata_json: { uploaded_by_user_id, uploaded_by_username }
     }                                                → [PostgreSQL]
    │
    ▼
[Response] { id, room, media_type, file_name, capture_date }
    │
    ▼
[Browser] Gallery updates — thumbnail appears
```

---

### 4.3 Image / Video Serving Flow

Range requests are essential for video scrubbing and large-file streaming.

```
[Browser] GET /api/files/{asset_id}/content
          (optional) Range: bytes=0-1048575
    │
    ▼
[Nginx] proxy → FastAPI — Range header forwarded, proxy_buffering off
    │
    ▼
[FastAPI] files.py — proxy_file_content()
  1. Query FileAsset by asset_id                      → [PostgreSQL]
  2. storage_service.stat_object_size()               → [MinIO HEAD]
    │
    ├── Range header present?
    │   YES → parse "bytes=start-end"
    │         get_object_range_bytes(start, end)      → [MinIO GET with Range]
    │         Response 206 Partial Content
    │         Headers: Content-Range, Content-Length, Accept-Ranges: bytes
    │
    └── No Range header
        ├── size ≤ 100 MB → get_object_bytes()        → [MinIO GET full]
        │                   Response 200 OK
        └── size > 100 MB → StreamingResponse (1 MB chunks)
                            Response 200 OK

Cache-Control: public, max-age=86400  (images/video)
Cache-Control: private, max-age=300   (report PDFs)
```

Thumbnail endpoint (`/api/files/{id}/thumbnail`) follows the same pattern but always returns the full thumbnail (small, no range needed).

---

### 4.4 Point Cloud Upload & Conversion Pipeline

Two upload paths exist; the frontend tries **Direct** first and falls back to **Chunked**.

```
─── DIRECT UPLOAD PATH (preferred) ───────────────────────────────

[Browser] POST /api/upload/pointcloud/direct-init
          { room_slug, capture_date, filename, file_size }
    │
    ▼
[FastAPI] upload.py
  1. Generate object_name, upload_id
  2. storage_service.get_presigned_put_url(bucket, object_name)  → [MinIO]
  3. INSERT FileAsset (conversion_status="pending")              → [PostgreSQL]
    │
    ▼
[Response] { upload_url: "http://minio:9100/...?presigned...", upload_id }
    │
    ▼
[Browser] XHR PUT {file bytes} directly to MinIO presigned URL
          (progress events for UI progress bar)
    │
    ▼
[Browser] POST /api/upload/pointcloud/direct-complete { upload_id }
    │
    ▼
[FastAPI] Verify MinIO object size matches expected                → [MinIO]
          Queue background task: convert_pointcloud_background()


─── CHUNKED UPLOAD PATH (fallback) ────────────────────────────────

[Browser] POST /api/upload/pointcloud/init
          { room_slug, capture_date, filename, file_size }
    │
    ▼
[FastAPI] Returns { upload_id, chunk_size: 32 MB }

[Browser] Splits file into N chunks (64 MB each)
          5 concurrent workers
          Each chunk: POST /api/upload/pointcloud/chunk
          { upload_id, chunk_index, chunk_blob }
          Retry up to 3× with exponential backoff (500 ms × 2^attempt)
    │
    ▼
[FastAPI] Saves chunk as {upload_dir}/{upload_id}/{chunk_index:08d}.part

[Browser] POST /api/upload/pointcloud/complete { upload_id, total_chunks }
    │
    ▼
[FastAPI] Assembles parts in order → uploads to MinIO
          INSERT FileAsset                                          → [PostgreSQL]
          Queue background task


─── CONVERSION (both paths converge here) ─────────────────────────

[FastAPI BackgroundTask] services/pointcloud.py
  1. UPDATE FileAsset.metadata_json.conversion_status = "processing"  → [PostgreSQL]
  2. Download LAZ from MinIO to /tmp/{uuid}.laz                        → [MinIO]
  3. subprocess.run([PotreeConverter, laz_path, -o, output_dir])
     timeout = 600 seconds

  SUCCESS:
    4a. Upload {stem}_potree/metadata.json  → [MinIO construction-pointclouds]
    4b. Upload {stem}_potree/hierarchy.bin  → [MinIO construction-pointclouds]
    4c. Upload {stem}_potree/octree.bin     → [MinIO construction-pointclouds]
    5.  UPDATE metadata_json: { conversion_status="ready",
                                potree_base_object="{stem}_potree/" }
    6.  If DELETE_ORIGINAL_POINTCLOUD_AFTER_CONVERSION:
          DELETE original .laz from MinIO

  FAILURE:
    4.  UPDATE metadata_json: { conversion_status="failed",
                                conversion_error="..." }


─── VIEWING ────────────────────────────────────────────────────────

[Browser] Polls GET /api/files/{id}/conversion-status
          until status == "ready"

[Potree.js] Fetches 3 files sequentially with Range requests:
  GET /api/files/{id}/pointcloud/metadata.json
  GET /api/files/{id}/pointcloud/hierarchy.bin  (many Range requests)
  GET /api/files/{id}/pointcloud/octree.bin     (many Range requests)
    │
    ▼
[Nginx] Route: /api/files/{id}/pointcloud/
  proxy_buffering off  ← critical: lets Potree control pacing
  Forwards Range header
    │
    ▼
[FastAPI] files.py — proxy_pointcloud_file()
  Validates path (only metadata.json / hierarchy.bin / octree.bin allowed)
  Fetches byte range from MinIO                                     → [MinIO]
  Returns 206 Partial Content
```

---

### 4.5 AI Image Analysis Flow

```
[Browser] POST /api/ai/analyze { image_url, file_id? }
    │
    ▼
[FastAPI] ai.py → services/ai.py — analyze_image_url()

  ─── Resolve the image ──────────────────────────────────────────
  if file_id provided:
    Query FileAsset                                                → [PostgreSQL]
    storage_service.get_object_bytes(bucket, object)               → [MinIO]
    Encode as base64 data URL: "data:image/jpeg;base64,..."
    cache_key = "file:{file_id}"

  elif already "data:image/...":
    Use as-is
    cache_key = first 256 chars

  elif public HTTPS URL (not localhost / private IP):
    Use URL directly (Vision API fetches it)
    cache_key = url

  else (presigned URL or localhost):
    httpx.get(url) → bytes → base64 data URL
    cache_key = "fetched:{url}"

  ─── Cache check ────────────────────────────────────────────────
  if cache_key in _cache:
    return { description: _cache[cache_key], cached: True }

  ─── Vision API call ────────────────────────────────────────────
  httpx.post(settings.vision_api_url, json={
    "model": "qwen3-vl:8b",
    "messages": [{
      "role": "user",
      "content": [
        { "type": "text", "text": "<construction inspector prompt>" },
        { "type": "image_url", "image_url": { "url": data_url_or_http } }
      ]
    }],
    "max_tokens": 4096,
    "temperature": 0.3,
    "frequency_penalty": 1.3
  })
    │
    ▼
  [Ollama / Qwen3-VL:8b at 192.168.50.103:11434]
    │
    ▼
  Extract choices[0].message.content
  Strip <think>...</think> blocks (Qwen thinking model artefacts)
  _cache[cache_key] = description

    ▼
[Response] { description: "Scene: ...\nQuality Issues: ...\nSafety Issues: ...",
             cached: false }
    │
    ▼
[Browser] Display in report UI
```

---

### 4.6 Report Creation & PDF Publishing Flow

The frontend generates PDF bytes client-side (using `pdf-lib` / `jspdf`), then uploads the blob to the backend.

```
─── PATH A: Simple Report ──────────────────────────────────────────

[Browser] POST /api/reports/with-pdf  (multipart)
  Fields: { file: <PDF Blob>, file_id, ai_description?,
            manual_observations?, flags_json }
    │
    ▼
[FastAPI] reports.py — create_report_with_pdf()
  1. Verify FileAsset exists                                        → [PostgreSQL]
  2. object_name = "{user_id}/{report_uuid}.pdf"
     storage_service.upload_bytes(construction-reports, ...)       → [MinIO]
  3. INSERT Report {
       file_id, ai_description, manual_observations, flags,
       pdf_bucket_name, pdf_object_name,
       created_by: current_user.id
     }                                                              → [PostgreSQL]
    ▼
[Response] ReportResponse { id, file_id, pdf_url, ... }


─── PATH B: Comparison Draft → Publish ─────────────────────────────

Step 1 — Create draft (no PDF yet):
[Browser] POST /api/reports/comparison-drafts
  Body: { file_id, manual_observations?, flags?, state: { left:{}, right:{} } }
    ▼
[FastAPI] INSERT ComparisonDraft { state_json }                     → [PostgreSQL]

Step 2 — Edit in viewer (iterative):
[Browser] PATCH /api/reports/comparison-drafts/{draft_id}
    ▼
[FastAPI] UPDATE ComparisonDraft.state_json                        → [PostgreSQL]

Step 3 — Publish:
[Browser] POST /api/reports/comparison-drafts/publish  (multipart)
  Fields: { file: <PDF Blob>, file_id, draft_ids_json,
            manual_observations?, flags_json }
    ▼
[FastAPI] reports.py — publish_comparison_drafts()
  1. Upload PDF to MinIO                                            → [MinIO]
  2. INSERT Report                                                  → [PostgreSQL]
  3. DELETE ComparisonDraft rows for all draft_ids                  → [PostgreSQL]
    ▼
[Response] ReportResponse


─── PATH C: Viewer Draft → Publish (same pattern) ──────────────────
  POST   /api/reports/viewer-drafts          (create)
  PATCH  /api/reports/viewer-drafts/{id}     (update state)
  POST   /api/reports/viewer-drafts/{id}/publish  (upload PDF, finalize)


─── Viewing a published report ─────────────────────────────────────
[Browser] GET /api/reports/
    ▼
[FastAPI] Returns list of Reports for current user                  → [PostgreSQL]
  Each includes pdf_url: "/api/reports/{id}/pdf"

[Browser] GET /api/reports/{id}/pdf
    ▼
[FastAPI] Proxy PDF from MinIO with Range support                   → [MinIO]
  Cache-Control: private, max-age=300
```

---

## 5. Database Schema

All primary keys are UUIDs (string). All `created_at` fields default to `utcnow()`.

```
┌────────────┐         ┌────────────┐         ┌──────────────────┐
│  projects  │ 1──── * │   rooms    │ 1──── * │   file_assets    │
│────────────│         │────────────│         │──────────────────│
│ id (PK)    │         │ id (PK)    │         │ id (PK)          │
│ name       │         │ project_id │(FK)     │ room_id (FK)     │
│ slug       │         │ name       │         │ media_type       │
│ created_at │         │ slug       │         │ capture_date ◀idx│
└────────────┘         │ floor_plan_│         │ original_name    │
                       │ coords     │(JSON)   │ display_name     │
                       │ sort_order │         │ bucket_name      │
                       │ created_at │         │ object_name      │
                       └────────────┘         │ thumbnail_bucket │
                                              │ thumbnail_object │
                                              │ content_type     │
                                              │ file_size        │
                                              │ metadata_json    │(JSON)
                                              │ created_at       │
                                              └──────┬───────────┘
                                                     │ 1
                         ┌───────────────────────────┼──────────────────────┐
                         │                           │                      │
                         ▼ *                         ▼ *                   ▼ *
               ┌──────────────────┐    ┌──────────────────────┐   ┌──────────────────┐
               │    reports       │    │  comparison_drafts   │   │viewer_report_    │
               │──────────────────│    │──────────────────────│   │drafts            │
               │ id (PK)          │    │ id (PK)              │   │──────────────────│
               │ file_id (FK)     │    │ file_id (FK)         │   │ id (PK)          │
               │ ai_description   │    │ manual_observations  │   │ file_id (FK)     │
               │ manual_observ.   │    │ flags       (JSON)   │   │ viewer_kind      │
               │ flags    (JSON)  │    │ state_json  (JSON)   │   │ manual_observ.   │
               │ screenshots(JSON)│    │ pdf_bucket_name      │   │ flags    (JSON)  │
               │ pdf_bucket_name  │    │ pdf_object_name      │   │ state_json(JSON) │
               │ pdf_object_name  │    │ created_by           │   │ pdf_bucket_name  │
               │ created_by       │    │ created_at           │   │ pdf_object_name  │
               │ created_at       │    └──────────────────────┘   │ created_by       │
               └──────────────────┘                               │ created_at       │
                                                                   └──────────────────┘

                         ▼ * (from file_assets)
               ┌──────────────────┐
               │   annotations    │
               │──────────────────│
               │ id (PK)          │
               │ file_id (FK)     │
               │ annotation_type  │
               │ data     (JSON)  │
               │ created_at       │
               └──────────────────┘

Separate table (no FK to above):
               ┌──────────────────┐
               │     users        │
               │──────────────────│
               │ id (PK)          │
               │ username ◀ idx   │
               │ email    ◀ idx   │
               │ password_hash    │
               │ role             │(admin|manager|viewer)
               │ is_active        │
               │ created_at       │
               └──────────────────┘

Cascade deletes: Project → Rooms → FileAssets → Reports / Drafts / Annotations
```

**Key fields in `file_assets.metadata_json`** (point cloud assets):
```json
{
  "uploaded_by_user_id": "...",
  "uploaded_by_username": "...",
  "conversion_status": "pending | processing | ready | failed",
  "conversion_error": "...",
  "potree_base_object": "room1/2024-01-01/uuid_scan_potree/"
}
```

---

## 6. External Services

### MinIO (Object Storage)

| Property | Value |
|---|---|
| Host | `192.168.50.200:9100` (Synology NAS) |
| Protocol | S3-compatible HTTP |
| Access | Backend only — browsers never connect directly |
| Client | `minio-py 7.2.10` |
| Auth | Access key + secret key |

**Why it exists:** Stores all binary assets (images, videos, point clouds, PDFs) outside the database and container filesystem. Being S3-compatible means standard tools (mc, boto3, rclone) can manage buckets directly. Running on a NAS provides RAID-backed persistence without cloud egress costs.

**Presigned URLs:** The backend can issue time-limited PUT URLs, allowing the browser to upload large point cloud files directly to MinIO without streaming through FastAPI. The same mechanism is used for GET URLs in development but is not used for production serving (backend proxies instead).

---

### Ollama Vision API (AI)

| Property | Value |
|---|---|
| Host | `http://192.168.50.103:11434` (LAN GPU server) |
| Protocol | OpenAI-compatible `/v1/chat/completions` |
| Model | `qwen3-vl:8b` (vision-language model) |
| Client | `httpx 0.28` |

**Why it exists:** Generates structured descriptions (Scene / Quality Issues / Safety Issues) from construction site images. Running on-premises keeps sensitive project imagery off cloud APIs and provides sub-second latency for base64-encoded images under ~5 MB.

**Failure mode:** If the Vision API is unreachable, `analyze_image_url()` raises an exception that propagates as HTTP 500. The frontend should handle this gracefully (the cache means a retry after connectivity is restored returns instantly).

---

## 7. Configuration Reference

All values are set in `deployment/.env.docker` and injected into the backend container at runtime. The frontend has a single env var (`VITE_API_URL`) baked into the JS bundle at build time.

### Backend (environment variables)

**Database:**

| Variable | Default | Notes |
|---|---|---|
| `DB_HOST` | `localhost` | `db` in Docker Compose |
| `DB_PORT` | `5432` | |
| `DB_NAME` | `a6_stern` | |
| `DB_USER` | `postgres` | |
| `DB_PASSWORD` | _(empty)_ | **Set this** |
| `DATABASE_URL` | _(computed)_ | Overrides individual vars if set |

**MinIO:**

| Variable | Default | Notes |
|---|---|---|
| `MINIO_ENDPOINT` | `127.0.0.1` | IP/hostname of NAS |
| `MINIO_API_PORT` | `9000` | |
| `MINIO_ACCESS_KEY` | _(empty)_ | **Set this** |
| `MINIO_SECRET_KEY` | _(empty)_ | **Set this** |
| `MINIO_USE_SSL` | `false` | |
| `MINIO_PUBLIC_UPLOAD_BASE_URL` | _(empty)_ | Optional; rewrites presigned PUT URL base |
| `MINIO_BUCKET_IMAGES` | `construction-images` | |
| `MINIO_BUCKET_THUMBNAILS` | `construction-thumbnails` | |
| `MINIO_BUCKET_POINTCLOUDS` | `construction-pointclouds` | |
| `MINIO_BUCKET_PDFS` | `construction-pdfs` | |
| `MINIO_BUCKET_REPORTS` | `construction-reports` | |

**Authentication:**

| Variable | Default | Notes |
|---|---|---|
| `JWT_SECRET` | `dev-only-change-me` | **Must change in production** |
| `JWT_ALGORITHM` | `HS256` | |
| `JWT_EXPIRE_MINUTES` | `10080` | 7 days |

**Vision AI:**

| Variable | Default | Notes |
|---|---|---|
| `VISION_API_URL` | `http://192.168.50.103:11434/v1/chat/completions` | |
| `VISION_API_KEY` | _(empty)_ | Optional Bearer key |
| `VISION_MODEL` | `qwen3-vl:8b` | Any OpenAI-compatible vision model |

**Upload / Processing:**

| Variable | Default | Notes |
|---|---|---|
| `MAX_UPLOAD_SIZE_BYTES` | `5368709120` | 5 GB |
| `DELETE_ORIGINAL_POINTCLOUD_AFTER_CONVERSION` | `true` | |
| `THUMBNAIL_WIDTH` | `400` | |
| `THUMBNAIL_HEIGHT` | `300` | |
| `THUMBNAIL_QUALITY` | `82` | JPEG quality |

**CORS:**

| Variable | Default | Notes |
|---|---|---|
| `FRONTEND_URL` | `http://localhost:5173` | Added to CORS allow-list |
| `CORS_EXTRA_ORIGINS` | _(empty)_ | Comma-separated additional origins |

### Frontend (build-time env vars)

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `/api` | Override for non-same-origin deployments |

### Hard-coded values (not configurable)

| Value | Location | Notes |
|---|---|---|
| Point cloud chunk size (backend) | `upload.py` | 32 MB |
| Point cloud chunk size (frontend) | `apiClient.ts` | 64 MB |
| Conversion subprocess timeout | `pointcloud.py` | 600 s |
| Concurrent chunk upload workers | `apiClient.ts` | 5 |
| Chunk retry count | `apiClient.ts` | 3 |
| AI cache | `services/ai.py` | In-memory, cleared on restart |
| Large-file streaming threshold | `files.py` | 100 MB |
| Stream chunk size | `files.py` | 1 MB |
| Presigned URL expiry | `config.py` | 604 800 s (7 days) |
