# A6 Stern — Onboarding Guide

Last updated: April 8, 2026

This is the fast, practical path to get a new teammate productive: local dev running, an end‑to‑end sanity test, and the production deploy flow.

## 1) Access & Accounts
- GitHub access to three repos: `frontend`, `backend`, `deployment`.
- Ubuntu VM SSH to the target host.
- MinIO Console URL + credentials for the Synology NAS instance.
- Optional: Vision API key (if using an external provider).

## 2) Local Workspace
- Clone the repos side by side on your machine:
  - `frontend/`, `backend/`, `deployment/` (mirrors `/opt/a6-stern` in production).
- Install prerequisites:
  - Node 18+ (`node --version`)
  - Python 3.11+ (`python --version`)
  - Docker Desktop (optional for local compose)

## 3) Backend Quickstart (dev)
- From `backend/`:
  - Copy env: `cp .env.example .env` (Windows: `copy .env.example .env`)
  - Set minimum `.env` values:
    - DB: either `DATABASE_URL` or `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`
    - MinIO: `MINIO_ENDPOINT`, `MINIO_API_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_USE_SSL`
    - CORS/UI: `FRONTEND_URL` (e.g., `http://localhost:5173`)
    - Auth: `JWT_SECRET` (non-empty)
  - Create venv + install: `python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
  - Run API: `python run.py` → `http://127.0.0.1:3001`
  - Verify: open `http://127.0.0.1:3001/api/docs` and `/api/health`.

## 4) Frontend Quickstart (dev)
- From `frontend/`:
  - Copy env: `.env.example` → `.env` and set `VITE_API_URL=http://127.0.0.1:3001/api`.
  - Install + run: `npm install && npm run dev` → `http://localhost:5173`.
  - First user: register in UI (first account becomes `admin`).

## 5) Sanity Test (end-to-end)
- Ensure project/rooms exist (backend seeds defaults on startup).
- Upload one image to a room/date; confirm it renders and thumbnail appears.
- Click “Analyze with AI”; confirm a structured description returns.
- Create a field‑observation PDF and upload it; verify under Reports.
- Optional: upload a small LAZ, wait for `ready`, open the Potree view.

## 6) Production Deployment (Ubuntu VM)
- On the VM (recommended path `/opt/a6-stern`):
  - `git clone` all three repos or `git pull` updates.
  - `cd deployment && cp .env.docker .env` — fill DB + MinIO + JWT + optional AI keys.
  - `docker-compose up -d --build`
- Verify:
  - Frontend: `http://<VM-IP>:3003`
  - Backend docs: `http://<VM-IP>:3002/api/docs`
  - Health: `http://<VM-IP>:3002/api/health`

## 7) Buckets & Secrets Checklist
- MinIO buckets: `construction-images`, `construction-thumbnails`, `construction-pointclouds`, `construction-reports`.
- Backend uses MinIO API port (not Console port).
- `JWT_SECRET` set and non‑empty.

## 8) Daily Ops (fast path)
- Status: `docker-compose ps`
- Logs (one): `docker-compose logs -f backend`
- Rebuild changed svc: `docker-compose up -d --build backend`
- DB backup example: `docker-compose exec db pg_dump -U postgres a6_stern > a6_stern.sql`

## 9) Troubleshooting First
- 401s → re‑login; ensure `JWT_SECRET` consistent; check `Authorization: Bearer` header.
- “Frontend can’t reach backend” → check compose status and Nginx proxy (frontend image).
- “MinIO errors” → verify endpoint, API port, access/secret; test via backend logs.
- “Point cloud stuck” → inspect backend logs for Potree errors; ensure converter present.

## References
- Full system doc: `docs/A6-Stern-System-Documentation.md`
- Frontend: `frontend/docs/START_HERE.md`, `frontend/docs/DEPLOYMENT.md`, `frontend/nginx.conf`
- Backend: `backend/app/main.py`, `backend/app/config.py`, `backend/app/services/*`
- Compose: `deployment/docker-compose.yml`, `deployment/.env.docker`
