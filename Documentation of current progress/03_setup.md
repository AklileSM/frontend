# A6 Stern — Developer Setup Guide

> Complete walkthrough from a bare machine to a fully running local stack. Last updated: 2026-04-14.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [MinIO — Object Storage Setup](#3-minio--object-storage-setup)
4. [Environment Variables Explained](#4-environment-variables-explained)
5. [Option A — Docker Compose (recommended)](#5-option-a--docker-compose-recommended)
6. [Option B — Local Dev Servers (no Docker)](#6-option-b--local-dev-servers-no-docker)
7. [First Run — Seed Data and First User](#7-first-run--seed-data-and-first-user)
8. [Verifying Everything Is Running](#8-verifying-everything-is-running)
9. [Common Problems and Fixes](#9-common-problems-and-fixes)
10. [Daily Workflow Commands](#10-daily-workflow-commands)

---

## 1. Prerequisites

### Required for Docker Compose (Option A)

| Tool | Minimum Version | Check |
|---|---|---|
| Docker | 24+ | `docker --version` |
| Docker Compose | v2 (plugin) | `docker compose version` |
| Git | any | `git --version` |

> On Windows, Docker Desktop ships both Docker and the Compose plugin. Ensure "Use WSL 2 based engine" is enabled for best performance.

### Required for local dev servers (Option B)

| Tool | Minimum Version | Check |
|---|---|---|
| Node.js | 18+ | `node --version` |
| Python | 3.11+ | `python --version` |
| PostgreSQL | 15 | `psql --version` |
| Git | any | `git --version` |

### Required either way — External Services

The two services below run on the local network and are **not** started by Docker Compose. You need access to them before the backend will work fully.

| Service | Purpose | Default address in config |
|---|---|---|
| **MinIO** | Binary asset storage (images, videos, PDFs, point clouds) | `192.168.50.200:9100` |
| **Ollama + Qwen3-VL** | AI image analysis | `192.168.50.103:11434` |

MinIO is **required** — the app will not start successfully without reachable MinIO buckets. The Vision API is **optional** — analysis features degrade gracefully if it is unavailable.

---

## 2. Project Structure

The project lives in a single repository with three top-level directories that mirror the Docker Compose service layout:

```
A6-stern2/
├── frontend/          ← React + Vite app (served by Nginx in Docker)
├── backend/           ← FastAPI app (Python 3.11)
├── deployment/        ← Docker Compose file and env template
└── docs/              ← Documentation (you are here)
```

Clone the repository (or navigate to the existing working directory):

```bash
git clone <repo-url> A6-stern2
cd A6-stern2
```

The `deployment/docker-compose.yml` file uses relative paths `../frontend` and `../backend` as build contexts, so the directory layout above must be preserved.

---

## 3. MinIO — Object Storage Setup

MinIO must exist and be reachable **before** you start the backend. The backend's startup sequence calls `storage_service.ensure_buckets()`, which creates the five required buckets if they are missing — but it needs a live connection to do so.

### If MinIO is already running on your LAN (Synology NAS)

1. Log in to the MinIO Console (default: `http://192.168.50.200:9101`).
2. Create a dedicated access key + secret key for the app (or reuse an existing one).
3. Note the API port (default `9100`) — this is **not** the same as the console port.
4. The backend will create the buckets automatically on first startup. You do not need to create them manually.

### If you are running MinIO locally for development

```bash
# Pull and start MinIO in Docker (adjust ports if needed)
docker run -d \
  --name minio-dev \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -v minio_data:/data \
  quay.io/minio/minio server /data --console-address ":9001"
```

Then use:
- `MINIO_ENDPOINT=localhost` (or `host.docker.internal` from inside Docker)
- `MINIO_API_PORT=9000`
- `MINIO_ACCESS_KEY=minioadmin`
- `MINIO_SECRET_KEY=minioadmin`

---

## 4. Environment Variables Explained

There are two separate env files:

| File | Used by | When |
|---|---|---|
| `deployment/.env` (copied from `.env.docker`) | Docker Compose | Option A |
| `backend/.env` (copied from `.env.example`) | FastAPI directly | Option B (local dev) |

Both files configure the same backend settings. The Docker Compose file additionally sets `DB_HOST=db` (the container service name) which overrides whatever is in `.env`.

---

### 4.1 Create the env file(s)

**For Docker Compose:**

```bash
cd deployment
cp .env.docker .env
```

**For local dev:**

```bash
cd backend
cp .env.example .env
```

---

### 4.2 Full variable reference

#### Database

| Variable | Default | Description |
|---|---|---|
| `DB_NAME` | `a6_stern` | PostgreSQL database name |
| `DB_USER` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | _(empty)_ | PostgreSQL password. **Set this.** In Docker Compose the default fallback is `change_me`. |
| `DB_HOST` | `localhost` | Hostname of the PostgreSQL server. Docker Compose overrides this to `db` (the service name). |
| `DB_PORT` | `5432` | PostgreSQL port inside the container. The host-side mapping is `5433`. |
| `DATABASE_URL` | _(empty)_ | Full SQLAlchemy URL. If set, overrides all `DB_*` variables. Format: `postgresql+psycopg2://user:pass@host:port/dbname` |

> In Docker Compose, `DB_HOST` is hard-coded to `db` in the compose file and cannot be overridden by `.env`. This is intentional — the backend must always talk to the `db` container by its service name.

---

#### MinIO Object Storage

| Variable | Default | Description |
|---|---|---|
| `MINIO_ENDPOINT` | `192.168.50.200` | IP or hostname of the MinIO server. Change to `localhost` for a local MinIO. |
| `MINIO_API_PORT` | `9100` | MinIO S3 API port. **Not** the console/web UI port. |
| `MINIO_CONSOLE_PORT` | `9101` | MinIO web console port. Used only for documentation — the backend does not connect to this port. |
| `MINIO_ACCESS_KEY` | _(empty)_ | MinIO access key (username). **Must be set.** |
| `MINIO_SECRET_KEY` | _(empty)_ | MinIO secret key (password). **Must be set.** |
| `MINIO_USE_SSL` | `false` | Set to `true` if MinIO is behind HTTPS. |
| `MINIO_PUBLIC_UPLOAD_BASE_URL` | _(empty)_ | Optional. If set, presigned PUT URLs for direct point cloud uploads are rewritten to use this base URL. Useful when the browser cannot reach MinIO's internal address directly. Example: `http://192.168.50.200:9100` |
| `MINIO_BUCKET_IMAGES` | `construction-images` | Bucket for original images and videos. |
| `MINIO_BUCKET_THUMBNAILS` | `construction-thumbnails` | Bucket for auto-generated 400×300 thumbnails. |
| `MINIO_BUCKET_POINTCLOUDS` | `construction-pointclouds` | Bucket for LAZ/LAS originals and Potree output files. |
| `MINIO_BUCKET_PDFS` | `construction-pdfs` | Bucket for PDF file assets uploaded by users. |
| `MINIO_BUCKET_REPORTS` | `construction-reports` | Bucket for generated report PDFs. |

> All five buckets are created automatically on backend startup if they do not already exist.

---

#### Authentication

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `dev-only-change-me` | Signing key for all JWT tokens. **Must be changed before any production or shared deployment.** Use a long random string (e.g. `openssl rand -hex 32`). |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm. No reason to change this. |
| `JWT_EXPIRE_MINUTES` | `10080` | Token lifetime in minutes. Default is 7 days (10 080 minutes). Tokens cannot be revoked before expiry — keep this value reasonable. |

---

#### Vision AI

| Variable | Default | Description |
|---|---|---|
| `VISION_API_URL` | `http://192.168.50.103:11434/v1/chat/completions` | OpenAI-compatible chat completions endpoint. Change to any Ollama instance or hosted provider. |
| `VISION_API_KEY` | _(empty)_ | Bearer token for the Vision API. Leave empty for local Ollama (no auth). Set for cloud providers like OpenAI or Hyperbolic. |
| `VISION_MODEL` | `qwen3-vl:8b` | Model name passed in every request. Must be a vision-capable model available on the server. |
| `HYPERBOLIC_API_KEY` | _(empty)_ | Legacy variable for the Hyperbolic cloud AI provider. Kept for compatibility — maps to `VISION_API_KEY` if that is empty. |

> If the Vision API is unreachable, the `/api/ai/analyze` endpoint returns HTTP 500. All other features continue to work normally.

---

#### Upload and Processing

| Variable | Default | Description |
|---|---|---|
| `MAX_UPLOAD_SIZE_BYTES` | `5368709120` | Maximum allowed upload size in bytes. Default is 5 GB, sized for large LAZ point cloud files. Nginx's `client_max_body_size` is also set to 5G. |
| `DELETE_ORIGINAL_POINTCLOUD_AFTER_CONVERSION` | `true` | When `true`, the original LAZ/LAS file is deleted from MinIO after successful Potree conversion. Set to `false` to keep originals for re-conversion or archiving. |

---

#### Thumbnails

| Variable | Default | Description |
|---|---|---|
| `THUMBNAIL_WIDTH` | `400` | Width in pixels of auto-generated image thumbnails. |
| `THUMBNAIL_HEIGHT` | `300` | Height in pixels. |
| `THUMBNAIL_QUALITY` | `82` | JPEG quality (1–95). |

---

#### CORS and Frontend

| Variable | Default | Description |
|---|---|---|
| `FRONTEND_URL` | `http://localhost:5173` | Added to the CORS allow-list. In Docker Compose this is hard-coded to `http://localhost` (port 80). |
| `CORS_EXTRA_ORIGINS` | _(empty)_ | Comma-separated list of additional allowed origins. Use this when the UI is accessed from an IP address or non-standard port, e.g. `http://192.168.1.10:3003`. No spaces around commas. |

---

#### Debug and Runtime

| Variable | Default | Description |
|---|---|---|
| `DEBUG` | `false` | When `true`, Uvicorn runs with `--reload` (auto-restarts on code changes). Do not use in Docker Compose — the source is not mounted. |
| `APP_ENV` | `development` | Informational label included in health check response. |
| `HOST` | `0.0.0.0` | Uvicorn bind address. |
| `PORT` | `3001` | Uvicorn port inside the container. The Docker Compose host mapping is `3002:3001`. |
| `LEGACY_FRONTEND_PUBLIC_DIR` | `/legacy-frontend-public` | Mount path for the legacy frontend public directory. In Docker Compose the volume `../frontend/public:/legacy-frontend-public:ro` satisfies this. Leave as-is unless you change the volume mount. |

---

#### Frontend (build-time only)

This variable is baked into the React bundle at `npm run build` time. It is **not** a runtime env var.

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | Base URL for all API calls from the browser. The default `/api` works for same-origin deployments (browser hits Nginx, Nginx proxies to backend). Override to a full URL (e.g. `http://192.168.1.10:3002/api`) only if the frontend and backend are on different origins. |

Set it in `frontend/.env`:
```bash
# frontend/.env
VITE_API_URL=/api
```

---

## 5. Option A — Docker Compose (recommended)

This is the standard way to run the full stack. Docker Compose builds and manages all four containers (PostgreSQL, pgAdmin, FastAPI backend, Nginx + React frontend).

### Step 1 — Fill in the env file

```bash
cd deployment
cp .env.docker .env
```

Open `deployment/.env` and fill in the required values. At minimum:

```bash
# deployment/.env

DB_PASSWORD=choose_a_strong_password

MINIO_ENDPOINT=192.168.50.200      # IP of your MinIO server
MINIO_API_PORT=9100                # MinIO S3 API port (not console port)
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key

JWT_SECRET=replace_with_a_long_random_string   # openssl rand -hex 32

# Optional — set if your LAN IP isn't captured by the defaults
# CORS_EXTRA_ORIGINS=http://192.168.1.50:3003

# Optional — set only if the Vision API server is at a different address
# VISION_API_URL=http://192.168.50.103:11434/v1/chat/completions
```

### Step 2 — Build and start

```bash
cd deployment
docker compose up -d --build
```

The first build downloads base images and compiles the frontend (~3–5 minutes). Subsequent builds are faster due to Docker layer caching.

**What happens in order:**
1. `a6_stern_db` (PostgreSQL) starts first.
2. `a6_stern_api` (FastAPI) waits for `db`, then:
   - Creates all database tables.
   - Seeds default projects (A6 Stern, Project X, Project Y) and rooms (Room 1–6).
   - Creates the five MinIO buckets if missing.
3. `a6_stern_frontend` (Nginx) waits for `backend`, then serves the React app.

### Step 3 — Confirm containers are running

```bash
docker compose ps
```

Expected output:

```
NAME                 STATUS          PORTS
a6_stern_db          Up              0.0.0.0:5433->5432/tcp
a6_stern_pgadmin     Up              0.0.0.0:5050->80/tcp
a6_stern_api         Up              0.0.0.0:3002->3001/tcp
a6_stern_frontend    Up              0.0.0.0:3003->80/tcp
```

All four should show `Up`. If any show `Exited`, check logs — see [Section 8](#8-verifying-everything-is-running).

### Compose volume notes

The two PostgreSQL and pgAdmin volumes are named `a6_stern_postgres_data` and `a6_stern_pgadmin_data`. These names are fixed in the compose file regardless of which directory you run `docker compose` from. This prevents accidentally creating duplicate volumes if you clone the repo to a different path.

> If you previously had data in volumes named `deployment_postgres_data` (the old Compose-generated default), you will need to either migrate or use a legacy override file.

---

## 6. Option B — Local Dev Servers (no Docker)

Use this when you need hot-reload, IDE debugging, or want to run only some services in Docker.

### Backend

**Step 1 — Create and activate a virtual environment**

```bash
cd backend
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Windows (cmd)
venv\Scripts\activate.bat
```

**Step 2 — Install dependencies**

```bash
pip install -r requirements.txt
```

The requirements are pinned:

```
fastapi==0.115.0        uvicorn[standard]==0.32.0
sqlalchemy==2.0.36      psycopg2-binary==2.9.10
minio==7.2.10           Pillow==11.0.0
httpx==0.28.1           bcrypt==4.2.1
python-jose[cryptography]==3.3.0
pydantic==2.10.3        pydantic-settings==2.6.1
python-multipart==0.0.18
python-dateutil==2.9.0  python-dotenv==1.0.1
```

**Step 3 — Configure the env file**

```bash
cp .env.example .env
```

Edit `backend/.env`. Key values to change:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=a6_stern
DB_USER=postgres
DB_PASSWORD=your_local_pg_password

MINIO_ENDPOINT=192.168.50.200
MINIO_API_PORT=9100
MINIO_ACCESS_KEY=your_key
MINIO_SECRET_KEY=your_secret

JWT_SECRET=any-non-empty-string-for-dev
FRONTEND_URL=http://localhost:5173
DEBUG=true
```

**Step 4 — Create the PostgreSQL database**

```bash
psql -U postgres -c "CREATE DATABASE a6_stern;"
```

The backend creates all tables automatically on first startup — you do not need to run any SQL scripts.

**Step 5 — Start the backend**

```bash
python run.py
```

With `DEBUG=true`, Uvicorn starts with `--reload` and restarts automatically on code changes.

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:3001 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

---

### Frontend

**Step 1 — Install dependencies**

```bash
cd frontend
npm install
```

**Step 2 — Configure the env file**

Create `frontend/.env` (this file is not committed):

```bash
# frontend/.env
VITE_API_URL=http://localhost:3001/api
```

Alternatively, leave the file absent — the default `/api` will be used, and Vite's dev proxy (`vite.config.js`) will forward `/api` requests to `http://localhost:3001`.

**Step 3 — Start the dev server**

```bash
npm run dev
```

Expected output:
```
  VITE v4.4.7  ready in 800ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

The Vite dev server proxies all `/api` requests to `http://localhost:3001`, mirroring the production Nginx proxy. No CORS issues in development.

---

## 7. First Run — Seed Data and First User

### Automatic seed data

On every startup, the backend runs `seed_defaults()` which inserts the following **only if they don't already exist**:

**Projects:**
- A6 Stern (slug: `a6-stern`)
- Project X (slug: `projectx`)
- Project Y (slug: `projecty`)

**Rooms** (all under A6 Stern):
- Room 1 through Room 6 (slugs: `room1` through `room6`)

Re-running the backend never duplicates this data.

### Creating the first user (admin)

The first user registered in the system automatically receives the `admin` role. Every subsequent registration receives `viewer`.

1. Open the app in your browser:
   - Docker Compose: `http://localhost:3003`
   - Local dev: `http://localhost:5173`
2. Click **Register** (or navigate to `/register`).
3. Enter a username and password. Email is optional.
4. Submit — you are now logged in as `admin`.

> There is no separate admin setup step. Role assignment is purely position-based: user count = 0 at registration time → `admin`, otherwise → `viewer`.

### Promoting a user to manager

There is no UI for role changes. Update the role directly in the database:

```bash
# Docker Compose
docker compose exec db psql -U postgres a6_stern \
  -c "UPDATE users SET role='manager' WHERE username='alice';"

# Local dev
psql -U postgres -d a6_stern \
  -c "UPDATE users SET role='manager' WHERE username='alice';"
```

---

## 8. Verifying Everything Is Running

Work through each check in order. A failure at one level means there is no point checking the levels above it.

### 1 — PostgreSQL is up

```bash
# Docker Compose
docker compose exec db psql -U postgres -c "\l"

# Local dev
psql -U postgres -c "\l"
```

Expected: lists databases including `a6_stern`.

---

### 2 — Backend health check

```bash
# Docker Compose (via host port)
curl http://localhost:3002/api/health

# Local dev
curl http://localhost:3001/api/health
```

Expected response:

```json
{
  "status": "ok",
  "app": "A6 Stern API",
  "environment": "development",
  "storage": true
}
```

`"storage": true` confirms the backend reached MinIO successfully. If it is `false`, MinIO credentials or endpoint are wrong — check backend logs.

---

### 3 — Backend API docs

Open in a browser:

- Docker Compose: `http://localhost:3002/api/docs`
- Local dev: `http://localhost:3001/api/docs`

You should see the FastAPI Swagger UI with all routes listed. If the page is blank or returns a 502, the backend container is not running.

---

### 4 — Frontend loads

Open in a browser:

- Docker Compose: `http://localhost:3003`
- Local dev: `http://localhost:5173`

You should see the login page. Register your first account (this user becomes admin).

---

### 5 — Frontend reaches backend

After logging in, open the browser developer tools → Network tab. Navigate to the home page. You should see requests to `/api/projects/` and `/api/rooms/` returning `200` with JSON payloads.

If these requests return `502`, Nginx cannot reach the `backend` container — check that `a6_stern_api` is running.

If they return `401`, the JWT token was not sent correctly — try logging out and back in.

---

### 6 — MinIO buckets created

Log in to the MinIO Console:

- Production NAS: `http://192.168.50.200:9101`
- Local dev Docker: `http://localhost:9001`

You should see five buckets:

```
construction-images
construction-thumbnails
construction-pointclouds
construction-pdfs
construction-reports
```

If the buckets are missing, the backend failed to connect to MinIO on startup. Check backend logs:

```bash
docker compose logs backend | grep -i minio
```

---

### 7 — End-to-end upload test

1. Log in as admin.
2. Navigate to a room (e.g. Room 1) and select any date.
3. Upload a small JPEG image.
4. Confirm the thumbnail appears in the gallery.
5. Click the image to open the static viewer.
6. Click "Analyze with AI" — if the Vision API is reachable you should receive a structured description.

---

### Quick-reference check commands

```bash
# Container status
docker compose ps

# Tail logs for a specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Backend health (Docker)
curl http://localhost:3002/api/health

# Backend health (local dev)
curl http://localhost:3001/api/health

# Check database tables exist
docker compose exec db psql -U postgres a6_stern -c "\dt"

# Check seeded projects
docker compose exec db psql -U postgres a6_stern \
  -c "SELECT name, slug FROM projects;"

# Check MinIO buckets (requires mc CLI)
mc alias set local http://localhost:9000 minioadmin minioadmin
mc ls local/
```

---

## 9. Common Problems and Fixes

### Backend exits immediately with a database connection error

```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Cause:** PostgreSQL is not ready yet, or `DB_PASSWORD` is wrong.

**Fix:** The `depends_on` in Docker Compose waits for the container to start but not for Postgres to be fully ready to accept connections. Restart the backend container after a few seconds:

```bash
docker compose restart backend
```

For a permanent fix, add a healthcheck to the `db` service or use a startup retry loop.

---

### `"storage": false` in health check

**Cause:** The backend started but cannot reach MinIO.

**Fix:** Check the values in `.env`:
- `MINIO_ENDPOINT` — must be reachable from inside the Docker network (use the NAS IP, not `localhost`)
- `MINIO_API_PORT` — must be the S3 API port (e.g. `9100`), not the console port
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` — must match credentials in the MinIO console

```bash
docker compose logs backend | grep -i "minio\|storage\|bucket"
```

---

### 502 Bad Gateway on all `/api/` requests

**Cause:** The Nginx frontend container cannot reach `backend:3001`.

**Fix:** The `backend` container is not running or crashed on startup.

```bash
docker compose logs backend
docker compose restart backend
```

---

### CORS errors in the browser console

```
Access-Control-Allow-Origin header missing
```

**Cause:** The browser origin (e.g. `http://192.168.1.50:3003`) is not in the backend's CORS allow-list.

**Fix:** Add the origin to `CORS_EXTRA_ORIGINS` in `deployment/.env`:

```bash
CORS_EXTRA_ORIGINS=http://192.168.1.50:3003
```

Then rebuild:

```bash
docker compose up -d --build backend
```

---

### Point cloud stuck at "processing" or "pending"

**Cause:** PotreeConverter failed or is not installed in the backend image.

**Fix:** Check the backend logs for converter output:

```bash
docker compose logs backend | grep -i "potree\|converter\|conversion"
```

Verify the converter is present inside the container:

```bash
docker compose exec backend which PotreeConverter
docker compose exec backend PotreeConverter --version
```

If missing, the Dockerfile failed to download it during build. Rebuild with no cache:

```bash
docker compose build --no-cache backend
```

---

### `JWT_SECRET` mismatch — all requests return 401

**Cause:** The backend was restarted with a different `JWT_SECRET` than the one used to sign existing tokens.

**Fix:** Users must log out and log back in to get new tokens signed with the current secret. This is expected behaviour — changing `JWT_SECRET` invalidates all existing sessions.

---

### Frontend shows blank page after `docker compose up`

**Cause:** The Vite build failed silently, or Nginx is serving an empty `dist/` directory.

**Fix:** Check the frontend build logs:

```bash
docker compose logs frontend
```

Rebuild the frontend image:

```bash
docker compose build --no-cache frontend
docker compose up -d frontend
```

---

## 10. Daily Workflow Commands

```bash
# Start the full stack (detached)
docker compose up -d

# Start with a fresh build (after code changes)
docker compose up -d --build

# Rebuild only one service (faster)
docker compose up -d --build backend
docker compose up -d --build frontend

# Stop everything (data volumes are preserved)
docker compose down

# Stop and delete all data volumes (destructive — wipes the database)
docker compose down -v

# View running containers
docker compose ps

# Tail logs (Ctrl+C to stop)
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# Open a psql shell
docker compose exec db psql -U postgres a6_stern

# Database backup
docker compose exec db \
  pg_dump -U postgres a6_stern > backup_$(date +%Y%m%d).sql

# Database restore
cat backup_20260101.sql | \
  docker compose exec -T db psql -U postgres a6_stern

# Open a shell in the backend container
docker compose exec backend bash

# Run a one-off Python command in the backend context
docker compose exec backend python -c "from app.config import get_settings; print(get_settings().minio_server)"
```
