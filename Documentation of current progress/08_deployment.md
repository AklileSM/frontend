# Deployment Guide

This document covers how the A6-stern2 stack is deployed, what each service does, how data is persisted, how Nginx is configured, and what to think about for production.

---

## Repository layout expected on the host

The Docker Compose file uses relative `build: context` paths, so the three repos must be siblings on disk:

```
/opt/a6-stern/          ← or any parent directory
  backend/
  frontend/
  deployment/           ← run docker compose from here
```

The `backend` service builds from `../backend` and the `frontend` service builds from `../frontend`, both relative to `deployment/`.

---

## Quick start

```bash
cd deployment
cp .env.docker .env
# Fill in credentials — at minimum DB_PASSWORD, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, JWT_SECRET
docker compose up -d --build
```

---

## Services

Four containers are defined. All are on the default bridge network created by Compose, so they address each other by service name.

### `db` — PostgreSQL 15

| Property | Value |
|---|---|
| Image | `postgres:15-alpine` |
| Container name | `a6_stern_db` |
| Internal port | `5432` |
| External port | `5433` |
| Data volume | `a6_stern_postgres_data` → `/var/lib/postgresql/data` |

The external port is `5433` (not the standard `5432`) to avoid conflicts with a locally-installed PostgreSQL instance on the host.

Environment variables read from `.env`:

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_DB` | `a6_stern` | Database name created at first start |
| `POSTGRES_USER` | `postgres` | Superuser login |
| `POSTGRES_PASSWORD` | `change_me` | Superuser password — **must be changed** |

The schema is never managed by this container directly. Tables are created by the backend at startup via `Base.metadata.create_all`.

---

### `pgadmin` — pgAdmin 4

| Property | Value |
|---|---|
| Image | `dpage/pgadmin4:latest` |
| Container name | `a6_stern_pgadmin` |
| Internal port | `80` |
| External port | `5050` |
| Data volume | `a6_stern_pgadmin_data` → `/var/lib/pgadmin` |
| Depends on | `db` |

Browser access: `http://<host>:5050`

When logging in for the first time, add a server connection using:
- Host: `db` (the Docker service name, reachable inside the network)
- Port: `5432`
- Database: value of `DB_NAME` (default `a6_stern`)
- Username/Password: values of `DB_USER` / `DB_PASSWORD`

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `PGADMIN_DEFAULT_EMAIL` | `admin@example.com` | Login email for pgAdmin UI |
| `PGADMIN_DEFAULT_PASSWORD` | `admin` | Login password for pgAdmin UI |

> **Note:** pgAdmin validates the email field — `.test` domains are rejected. Use a normal-looking address like `admin@example.com` even for development.

---

### `backend` — FastAPI / Uvicorn

| Property | Value |
|---|---|
| Build context | `../backend` |
| Container name | `a6_stern_api` |
| Internal port | `3001` |
| External port | `3002` |
| Depends on | `db` |

The backend container is built from `backend/Dockerfile` each time `--build` is passed. In production, omit `--build` to use the cached image and only rebuild when the code changes.

**What runs:** `python run.py`, which starts `uvicorn app.main:app` on `0.0.0.0:3001`. Hot reload (`--reload`) is enabled only when `DEBUG=true`.

**Startup sequence** (runs before the first request):
1. `Base.metadata.create_all(bind=engine)` — creates all tables that don't exist yet
2. `ensure_comparison_drafts_state_json(engine)` — adds `state_json` column to `comparison_drafts` if absent (backward-compat migration)
3. `seed_defaults(db)` — inserts the 3 default projects and 6 rooms if not present
4. `storage_service.ensure_buckets()` — creates the 5 MinIO buckets if they don't exist

Environment variables passed by Compose (sourced from `.env`):

| Variable | Hardcoded/default | Purpose |
|---|---|---|
| `DB_HOST` | `db` (hardcoded) | PostgreSQL hostname — always the `db` service |
| `DB_PORT` | `5432` | PostgreSQL port inside Docker network |
| `DB_NAME` | `a6_stern` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `change_me` | Database password |
| `MINIO_ENDPOINT` | (required) | IP or hostname of the MinIO server (e.g. `192.168.50.200`) |
| `MINIO_API_PORT` | (required) | MinIO S3 API port (e.g. `9100`) |
| `MINIO_CONSOLE_PORT` | (required) | MinIO web console port (e.g. `9101`) |
| `MINIO_ACCESS_KEY` | (required) | MinIO access key |
| `MINIO_SECRET_KEY` | (required) | MinIO secret key |
| `MINIO_USE_SSL` | `false` | Set to `true` if MinIO is behind HTTPS |
| `MINIO_PUBLIC_UPLOAD_BASE_URL` | (empty) | Override base URL for presigned PUT URLs — use when the browser can't reach `MINIO_ENDPOINT` directly |
| `HYPERBOLIC_API_KEY` | (empty) | API key for the Hyperbolic cloud vision service (optional; local Ollama is the default) |
| `FRONTEND_URL` | `http://localhost` | Allowed CORS origin — must match the browser-facing URL |
| `CORS_EXTRA_ORIGINS` | (empty) | Comma-separated additional CORS origins (e.g. `http://192.168.1.50:3003`) |
| `JWT_SECRET` | `change-me-in-production` | HMAC-HS256 signing key — **must be changed** |
| `LEGACY_FRONTEND_PUBLIC_DIR` | `/legacy-frontend-public` | Path inside the container to the mounted legacy frontend public dir |
| `DEBUG` | `false` | Enables Uvicorn hot reload and verbose logging when `true` |
| `DELETE_ORIGINAL_POINTCLOUD_AFTER_CONVERSION` | `true` | Deletes the uploaded LAZ/LAS from MinIO after PotreeConverter succeeds |

**Bind mount:**

```
../frontend/public → /legacy-frontend-public  (read-only)
```

This makes the frontend's static assets (panorama images, PDFs, etc.) accessible to the backend's legacy migration script without a separate volume. The path inside the container is controlled by `LEGACY_FRONTEND_PUBLIC_DIR`.

---

### `frontend` — React / Nginx

| Property | Value |
|---|---|
| Build context | `../frontend` |
| Container name | `a6_stern_frontend` |
| Internal port | `80` |
| External port | `3003` |
| Depends on | `backend` |

The frontend container uses a two-stage Docker build:
1. **Build stage** (`node:18-alpine`): runs `npm ci` then `npm run build`, producing `/app/dist`
2. **Serve stage** (`nginx:1.27-alpine`): copies `nginx.conf` and `/app/dist` into the Nginx image

The Nginx process runs inside the container on port 80. All API traffic is reverse-proxied to the `backend` service at `http://backend:3001`.

---

## Volumes and persistent storage

Two named Docker volumes hold the only data that persists across container restarts and rebuilds:

| Volume name | Attached to | Container path | Contents |
|---|---|---|---|
| `a6_stern_postgres_data` | `db` | `/var/lib/postgresql/data` | All PostgreSQL data files |
| `a6_stern_pgadmin_data` | `pgadmin` | `/var/lib/pgadmin` | pgAdmin settings and saved server connections |

Media files (images, videos, point clouds, PDFs) are stored in MinIO, which is external to Docker Compose. They are not in any Docker volume.

**Volume naming is stable** — the names are explicitly set in the Compose file and do not depend on which directory `docker compose` is run from:

```yaml
volumes:
  postgres_data:
    name: a6_stern_postgres_data
  pgadmin_data:
    name: a6_stern_pgadmin_data
```

### Legacy volume migration

If the stack was originally deployed before the stable naming was added, Docker will have created volumes named `deployment_postgres_data` and `deployment_pgadmin_data` (prefixed with the Compose project folder name). To reattach those volumes without losing data, use the override file:

```bash
docker compose -f docker-compose.yml -f docker-compose.legacy-volumes.yml up -d
```

This override marks the old volume names as `external: true`, so Compose uses them instead of creating new ones. Do not use this file for fresh deployments.

### Backing up the database

```bash
# Dump to a file on the host
docker exec a6_stern_db pg_dump -U postgres a6_stern > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i a6_stern_db psql -U postgres a6_stern < backup_20240101.sql
```

### Backing up MinIO

MinIO data is on an external NAS at `192.168.50.200`. Back it up using MinIO's own tools (`mc mirror`) or the NAS's backup mechanism — it is outside the scope of Docker Compose.

---

## Nginx configuration

`frontend/nginx.conf` is the only Nginx config file. It is copied into the image at build time and replaced the default `/etc/nginx/conf.d/default.conf`.

### Global settings

```nginx
client_max_body_size 5G;
client_body_timeout 3600s;
```

These allow file uploads up to 5 GB (matching `MAX_UPLOAD_SIZE_BYTES` in the backend) and prevent Nginx from timing out during large uploads over slow connections.

### Location 1: Static SPA (`/`)

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Serves the React app from `/usr/share/nginx/html`. Any URL that doesn't match a real file falls back to `index.html`, which lets React Router handle client-side navigation. Without this, a browser refresh on `/RoomExplorer` would return a 404.

### Location 2: Point cloud binary files (`/api/files/<id>/pointcloud/…`)

```nginx
location ~ ^/api/files/[^/]+/pointcloud/ {
    proxy_pass http://backend:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Range $http_range;
    proxy_request_buffering off;
    proxy_buffering off;
    proxy_send_timeout 3600s;
    proxy_read_timeout 3600s;
    send_timeout 3600s;
}
```

This location is matched before the general `/api/` location because Nginx evaluates regex locations (`~`) ahead of prefix locations. The critical differences from the general API proxy:

- **`proxy_set_header Range $http_range`** — explicitly forwards the HTTP `Range` header from the browser to the backend. Potree makes many byte-range requests to fetch specific octree nodes from `octree.bin`. Without this, Nginx would strip the `Range` header and the backend would return the full file every time, breaking point cloud streaming.
- **`proxy_buffering off`** — disables Nginx's response buffer for this route. With buffering on, Nginx would receive the entire backend response before sending any bytes to the browser, which defeats streaming for large binary files and can exhaust Nginx's memory.
- **`proxy_request_buffering off`** — Nginx does not buffer the request body before sending it upstream. Important for chunked uploads.
- Timeouts set to 3600 seconds to accommodate slow network transfers of large binary files.

### Location 3: General API proxy (`/api/`)

```nginx
location /api/ {
    proxy_pass http://backend:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_request_buffering off;
    proxy_buffering off;
    proxy_send_timeout 3600s;
    proxy_read_timeout 3600s;
    send_timeout 3600s;
}
```

Proxies all `/api/` requests to the backend. Buffering is also disabled here to support large multipart file uploads that stream directly through Nginx without being buffered in memory.

### Location 4: Health check shortcut (`/health`)

```nginx
location /health {
    proxy_pass http://backend:3001/health;
}
```

Forwards `/health` (no `/api/` prefix) to the backend's health endpoint. Both `/health` and `/api/health` are valid — this exists so monitoring tools can hit the shorter URL without knowing the API prefix.

### What Nginx does NOT do

- No TLS termination — SSL must be handled upstream (a reverse proxy or load balancer in front of port 3003)
- No authentication or access control at the Nginx layer
- No caching of API responses
- No compression (`gzip`) configured — can be added for static assets if needed

---

## Backend Dockerfile

```dockerfile
FROM python:3.11-slim

RUN apt-get install -y libgomp1 libstdc++6 libtbb12 liblaszip-dev ...

ARG POTREE_CONVERTER_URL="https://github.com/potree/PotreeConverter/releases/download/2.1.2/..."
RUN wget "$POTREE_CONVERTER_URL" ... && ln -sf "$POTREE_BIN" /usr/local/bin/PotreeConverter

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY scripts ./scripts
COPY run.py ./run.py

EXPOSE 3001
CMD ["python", "run.py"]
```

Key build-time steps:

1. **System libraries installed**: `libgomp1` (OpenMP, for parallel processing in PotreeConverter), `libstdc++6` (C++ STL), `libtbb12` (Intel TBB threading), `liblaszip-dev` (LAS/LAZ format support). These are required at runtime by the PotreeConverter binary.

2. **PotreeConverter 2.1.2 downloaded at build time** from the GitHub releases page. The binary is symlinked to `/usr/local/bin/PotreeConverter`. If GitHub is unreachable during build, the image build will fail. The binary path can be overridden at runtime via `POTREE_CONVERTER_PATH` env var.

3. **Python dependencies** pinned in `requirements.txt`:
   - FastAPI 0.115.0, Uvicorn 0.32.0 (ASGI server)
   - SQLAlchemy 2.0.36 + psycopg2-binary 2.9.10 (PostgreSQL)
   - minio 7.2.10 (object storage client)
   - Pillow 11.0.0 (thumbnail generation)
   - httpx 0.28.1 (async HTTP for AI service calls)
   - bcrypt 4.2.1 (password hashing)
   - python-jose[cryptography] 3.3.0 (JWT)

4. **No non-root user defined** — the process runs as root inside the container. Consider adding a dedicated user for hardened deployments.

---

## Frontend Dockerfile

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

The multi-stage build ensures the final image contains only the compiled static files and Nginx — no Node.js, no `node_modules`, no source files. The `npm ci` step installs exact versions from `package-lock.json`.

---

## Port reference

| Service | External port | Internal port | Access |
|---|---|---|---|
| Frontend (Nginx) | 3003 | 80 | Browser — main application entry point |
| Backend (Uvicorn) | 3002 | 3001 | Direct API access / debugging; normally accessed via Nginx |
| PostgreSQL | 5433 | 5432 | Database clients (psql, pgAdmin, etc.) |
| pgAdmin | 5050 | 80 | Database management UI |
| MinIO API (external NAS) | 9100 | — | S3-compatible object storage |
| MinIO Console (external NAS) | 9101 | — | MinIO web UI |

In normal use, browsers only need to reach port `3003`. All API calls are proxied through Nginx — the browser never contacts the backend on port `3002` or MinIO directly.

---

## Production checklist

These defaults are intentionally insecure for development. Change all of them before exposing the stack to a network.

### Secrets

```bash
# Generate a strong JWT secret (48+ random bytes)
openssl rand -hex 48
# Add to .env:
JWT_SECRET=<output>
```

| Variable | Why it must change |
|---|---|
| `JWT_SECRET` | Default `change-me-in-production` would allow anyone to forge tokens |
| `DB_PASSWORD` | Default `change_me` is publicly known |
| `PGADMIN_DEFAULT_PASSWORD` | Default `admin` is trivially guessed |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | Must match what's configured on the MinIO server |

### CORS

`FRONTEND_URL` is hardcoded to `http://localhost` in the Compose file. If the frontend is accessed from a non-localhost origin (e.g. `http://192.168.1.50:3003`), add it:

```env
CORS_EXTRA_ORIGINS=http://192.168.1.50:3003
```

Multiple origins are comma-separated: `http://192.168.1.50:3003,https://a6.example.com`.

### TLS

Nginx inside the frontend container listens on HTTP only. For HTTPS, place a reverse proxy in front of port 3003 (Caddy, Traefik, or an upstream Nginx). The backend receives `X-Forwarded-Proto: https` from the inner Nginx and passes it upstream — no changes needed in the application code.

### Debug mode

Ensure `DEBUG=false` in production. `DEBUG=true` enables Uvicorn's `--reload` flag (watches for file changes and restarts the process) and may expose more verbose error detail in responses.

### MinIO presigned URL rewriting

If the browser cannot reach MinIO directly at `MINIO_ENDPOINT:MINIO_API_PORT` (common when MinIO is on an internal network), set:

```env
MINIO_PUBLIC_UPLOAD_BASE_URL=https://minio.example.com
```

This rewrites the hostname in presigned PUT URLs so the browser can upload directly to an externally reachable URL. Presigned GET URLs (file downloads) are not used — the backend proxies all reads.

### Point cloud storage

```env
# Keep original LAZ files for archival or re-conversion
DELETE_ORIGINAL_POINTCLOUD_AFTER_CONVERSION=false
```

Default is `true` (delete after conversion). Keeping originals doubles storage use for point clouds but allows re-running PotreeConverter if the conversion process changes.

---

## Updating services

### Rebuild a single service

```bash
# Rebuild and restart only the backend (e.g. after a code change)
docker compose up -d --build backend

# Rebuild and restart only the frontend
docker compose up -d --build frontend
```

Other running containers are not affected.

### Rebuild all services

```bash
docker compose up -d --build
```

Services restart in dependency order: `db` → `pgadmin` + `backend` → `frontend`.

### Pull a newer base image

```bash
docker compose pull db pgadmin
docker compose up -d
```

This is relevant for `pgadmin` (tagged `latest`) and `db`. The `backend` and `frontend` images are always built locally — `pull` doesn't apply to them.

### Viewing logs

```bash
# All services
docker compose logs -f

# One service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 backend
```

### Stopping without removing data

```bash
docker compose down
# Volumes are preserved — data survives
```

### Full teardown including data

```bash
docker compose down -v
# WARNING: this deletes a6_stern_postgres_data and a6_stern_pgadmin_data permanently
```

---

## Database schema changes

There is no Alembic or migration framework. Schema changes require manual intervention:

**Adding a new column** to an existing table:

1. Add the column definition to `backend/app/models.py`
2. Rebuild and restart the backend — `create_all` will NOT add the column to an existing table
3. Add a function in `backend/app/services/db_migrations.py` (following the pattern of `ensure_comparison_drafts_state_json`) that runs `ALTER TABLE ... ADD COLUMN` and call it from the lifespan handler in `main.py`

**Creating a new table:**

1. Add the model to `models.py`
2. Restart the backend — `create_all` will create the new table automatically

**Dropping a table or column:**

Must be done manually via psql or pgAdmin. `create_all` never drops anything.

---

## Legacy asset migration

A script exists to import files that were stored in the frontend's `public/` directory before MinIO was introduced:

```bash
# Run inside the backend container
docker exec -it a6_stern_api python scripts/migrate_legacy_assets.py
```

The script reads from `/legacy-frontend-public` (the bind-mounted `../frontend/public`) and uploads each file to the appropriate MinIO bucket, creating `file_assets` rows in PostgreSQL. It reads room assignments from the filename (e.g. `room02_...` → `room2`).

The bind mount is read-only — the script never modifies the source files.

---

## Health check

Both endpoints return the same response:

```
GET /health
GET /api/health
```

```json
{
  "status": "ok",
  "app": "A6 Stern API",
  "environment": "development",
  "storage": true
}
```

`storage: true` means the backend can reach MinIO. `storage: false` means MinIO is unreachable — uploads and file serving will fail. Use this endpoint for container health checks and uptime monitoring.
