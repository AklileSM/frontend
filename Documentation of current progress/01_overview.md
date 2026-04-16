# A6 Stern — Project Overview

> For new developers joining the project. Last updated: 2026-04-14.

---

## What the System Does

**A6 Stern** is a browser-based platform for capturing, organizing, analyzing, and reviewing construction project documentation over time. Think of it as a "living memory" of a construction site — it brings together four types of evidence in one searchable, room-aware interface:

| Evidence Type | Format | Purpose |
|---|---|---|
| Photos & videos | JPEG, MP4 | On-site visual progress captures |
| 3D point clouds | LAS/LAZ → Potree | Spatial geometry and measurements |
| Field reports | PDF | Inspection observations and notes |
| AI descriptions | Text | Structured scene, quality, and safety observations |

A user opens the app, selects a project, navigates to a room, picks a date, and instantly sees all media captured there — along with AI-generated observations and any linked reports. They can also compare captures across dates, view panoramas in 360°, and fly through point clouds in the browser.

---

## Who the Users Are

The platform serves three main audiences on a construction project:

- **Site managers and engineers** — track room-by-room progress across weeks, compare before/after states, and document completed work.
- **HSE and quality teams** — generate consistent safety and quality observations tied to photographic evidence.
- **Executives and stakeholders** — read-only visibility into up-to-date site status from any browser.

All users authenticate via a login page and receive a JWT token. No VPN or native app is required.

---

## The Three Roles

Roles are stored on the `User` model (`backend/app/models.py`) and enforced by FastAPI dependencies (`backend/app/api/deps.py`) on the backend and route guards (`frontend/src/components/Auth/ProtectedRoute.tsx`) on the frontend.

### `admin`

The first user to register is automatically promoted to admin. All subsequent registrations default to `viewer`.

| Capability | Allowed |
|---|---|
| Upload images, videos, PDFs | ✅ |
| Upload point clouds | ✅ |
| Delete any file asset | ✅ |
| Create / edit / delete reports | ✅ |
| Create / edit / delete comparison drafts | ✅ |
| Create / edit / delete viewer field drafts | ✅ |
| View upload history | ✅ |
| View all project media | ✅ |
| Request AI image analysis | ✅ |
| Create annotations | ✅ |

### `manager`

Managers can do everything except upload new files.

| Capability | Allowed |
|---|---|
| Upload files | ❌ |
| Delete any file asset | ✅ |
| Create / edit / delete reports & drafts | ✅ |
| View upload history | ✅ |
| View all project media | ✅ |
| Request AI image analysis | ✅ |
| Create annotations | ✅ |

### `viewer`

Read-only access plus the ability to trigger AI analysis and add annotations.

| Capability | Allowed |
|---|---|
| Upload files | ❌ |
| Delete files or reports | ❌ |
| View upload history | ❌ |
| View all project media | ✅ |
| Request AI image analysis | ✅ |
| Create annotations | ✅ |

> **Role assignment:** Currently, roles above `viewer` must be set directly in the database. Self-registration always produces a `viewer` (except the very first user who becomes `admin`).

---

## Core Features

### File Management & Upload
- Single-file upload (image, video, PDF) tagged to a room and capture date.
- Chunked point cloud upload for large LAS/LAZ files.
- Automatic thumbnail generation (400 × 300 px) on ingest.
- Background conversion of point clouds to streaming Potree format.
- Configurable cleanup of the original point cloud after conversion.
- File deletion restricted to `admin` and `manager`.

### Browsing & Discovery
- **Date explorer** — select a day, see all rooms with media captured that day, grouped by media type.
- **Room explorer** — select a room, browse its full capture history by date.
- **Date summary** — calendar-style view showing media counts per day across all rooms.
- **Upload history** — personal log of assets uploaded by the current user (admin/manager only).

### Viewers
Six distinct visualization modes are available in the browser, all served from the same backend:

| Route | Viewer | Description |
|---|---|---|
| `/staticViewer` | Static 360° | Panoramic image with measurement tools |
| `/staticViewerRoom` | Static Room 360° | Panoramic image with room spatial context |
| `/interactiveViewer` | Interactive 360° | 3D navigable panoramic space |
| `/interactiveViewerRoom` | Interactive Room 360° | Room-specific 3D navigation |
| `/staticPointCloudViewer` | Point Cloud | In-browser point cloud render |
| `/Potree` | Potree | Full streaming Potree viewer for large datasets |
| `/pdfViewer` | PDF | In-browser PDF document viewer |

### AI Image Analysis
- `POST /api/ai/analyze` accepts an image URL or file ID.
- The backend fetches private images, encodes them as base64, and sends them to a configurable Vision API (default: local Ollama model `qwen3-vl:8b`).
- Returns a structured description with three sections: **Scene**, **Quality Issues**, **Safety Issues**.
- Responses are cached by a deterministic key to avoid duplicate API calls.
- Gracefully degrades if the Vision API is unavailable.

### Reporting & Documentation
Three report types allow attaching observations and generating PDFs:

| Type | API prefix | Purpose |
|---|---|---|
| Report | `/api/reports/` | Attach AI descriptions, manual notes, flags, and screenshots to an image |
| Comparison Draft | `/api/reports/comparison-drafts/` | Side-by-side image comparison with observations |
| Viewer Field Draft | `/api/reports/viewer-drafts/` | Field observations captured from within any viewer |

All report types support PDF generation and storage in MinIO.

### Annotations
Lightweight JSON overlays (callouts, marks) can be added to any file asset via `POST /api/annotations/` and retrieved via `GET /api/annotations/file/{fileId}`.

### Project & Room Organization
- Projects contain rooms; rooms have stable slugs used in URLs and storage keys.
- Default projects and rooms are seeded automatically on first startup (`backend/app/services/bootstrap.py`).
- Rooms support optional floor-plan coordinate data for spatial reference.

### Authentication & Sessions
- JWT-based authentication with configurable token expiry (default 7 days).
- "Remember me" toggle for persistent vs. session-scoped tokens.
- Session state stored in browser `localStorage`.
- All media served through the backend proxy — no direct MinIO URLs are exposed to the browser.

---

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build tool | Vite 4 |
| Routing | React Router DOM 6 |
| Styling | Tailwind CSS 3 |
| State management | Zustand 5 |
| 3D rendering | Three.js 0.170 + `@react-three/fiber` + `@react-three/drei` |
| 360° / WebXR | A-Frame 1.6 + A-Frame Extras |
| Point clouds | Potree (bundled in `frontend/dist/potree/`) |
| PDF display | `@react-pdf-viewer/core` + `pdfjs-dist` |
| PDF generation | `pdf-lib` + `jspdf` |
| Notifications | react-toastify + react-hot-toast |
| Date handling | date-fns 4 + Flatpickr |
| Charts | ApexCharts 3 |

### Backend

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115 |
| Server | Uvicorn 0.32 (ASGI) |
| ORM | SQLAlchemy 2 |
| Database | PostgreSQL 15 |
| Object storage | MinIO (S3-compatible) |
| Auth | python-jose (JWT) + bcrypt |
| Image processing | Pillow 11 |
| HTTP client | httpx 0.28 (Vision API calls) |
| Config | Pydantic Settings 2 + python-dotenv |

### Infrastructure

| Layer | Technology |
|---|---|
| Containerisation | Docker + Docker Compose |
| Frontend serving | Nginx 1.27 (Alpine) |
| Database admin | pgAdmin 4 (optional) |
| Storage backend | MinIO on Synology NAS |
| Vision AI | Ollama (local, configurable) |

### Key Ports (Docker Compose defaults)

| Service | Port |
|---|---|
| Frontend (Nginx) | 3003 |
| Backend (FastAPI) | 3002 |
| PostgreSQL | 5433 |
| pgAdmin | 5050 |

---

## Project Structure at a Glance

```
A6-stern2/
├── frontend/               # React/Vite app
│   ├── src/
│   │   ├── App.tsx         # Route definitions
│   │   ├── auth/           # Token & session management
│   │   ├── context/        # Auth context (login/logout/register)
│   │   ├── services/       # apiClient.ts — all API call wrappers
│   │   ├── pages/          # Top-level page components
│   │   └── components/     # Viewers, thumbnails, annotations, etc.
│   ├── Dockerfile          # Multi-stage: build → Nginx
│   └── nginx.conf          # Proxies /api → backend
│
├── backend/                # FastAPI app
│   ├── app/
│   │   ├── main.py         # App factory + router registration
│   │   ├── models.py       # SQLAlchemy models (User, Project, Room, FileAsset, …)
│   │   ├── schemas.py      # Pydantic request/response schemas
│   │   ├── api/            # Route handlers (auth, files, upload, ai, reports, …)
│   │   ├── core/           # Security (JWT, hashing)
│   │   └── services/       # Storage, AI, point cloud conversion, seeding
│   ├── Dockerfile
│   └── requirements.txt
│
├── deployment/             # Docker Compose + env templates
│   ├── docker-compose.yml
│   └── .env.docker
│
└── docs/                   # Developer documentation
    ├── 01_overview.md      # ← you are here
    ├── A6-Stern-System-Documentation.md
    └── ONBOARDING.md
```

---

## Where to Go Next

| Goal | Resource |
|---|---|
| Get the stack running locally | `docs/ONBOARDING.md` |
| Understand the full API surface | `docs/A6-Stern-System-Documentation.md` |
| See all environment variables | `backend/.env.example` and `deployment/.env.docker` |
| Understand role enforcement code | `backend/app/api/deps.py` |
| Understand session & token flow | `frontend/src/auth/authSession.ts` |
