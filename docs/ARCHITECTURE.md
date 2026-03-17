# ARCHITECTURE

This document describes the proposed production system we are building.

It is based on the requirements we agreed on:
- the current React frontend remains the UI
- the API layer is FastAPI
- the codebase is managed as **three separate repositories**
- the preferred production setup is **containerized**
- the **frontend runs in its own container**
- the **backend runs in its own container**
- **PostgreSQL runs in its own container**
- all three containers live on the Ubuntu VM
- MinIO already exists on the Synology NAS

## 1. High-Level Architecture

The system has six main parts:

1. **Frontend container**
2. **Backend container**
3. **PostgreSQL container**
4. **Existing MinIO on Synology NAS**
5. **Windows Lab VM for development and access**
6. **Three separate Git repositories**

## 2. System Architecture Diagram

```text
┌──────────────────────────────┐
│       Windows Lab VM         │
│------------------------------│
│ - Edit code                  │
│ - GitHub / repo access       │
│ - Browser testing            │
└──────────────┬───────────────┘
               │
               │ HTTP / SSH
               │
┌──────────────▼────────────────────────────────────────────────────────────────────────────┐
│                                     Ubuntu VM                                             │
│-------------------------------------------------------------------------------------------│
│                                                                                           │
│  Docker Engine                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           Docker Network                                            │  │
│  │                                                                                     │  │
│  │  ┌──────────────────────────────┐                                                   │  │
│  │  │ Frontend Container           │                                                   │  │
│  │  │------------------------------│                                                   │  │
│  │  │ React production build       │                                                   │  │
│  │  │ Nginx serves frontend        │                                                   │  │
│  │  │ Public port: 80              │                                                   │  │
│  │  │ Proxies /api → backend:3001  │                                                   │  │
│  │  └───────────────┬──────────────┘                                                   │  │
│  │                  │                                                                  │  │
│  │                  │ internal Docker network                                           │  │
│  │                  ▼                                                                  │  │
│  │  ┌──────────────────────────────┐                                                   │  │
│  │  │ Backend Container            │                                                   │  │
│  │  │------------------------------│                                                   │  │
│  │  │ FastAPI + Uvicorn            │                                                   │  │
│  │  │ Internal API service         │                                                   │  │
│  │  │ Container port: 3001         │                                                   │  │
│  │  │ Handles uploads, AI, reports │                                                   │  │
│  │  └───────┬────────────────┬─────┘                                                   │  │
│  │          │                │                                                         │  │
│  │          │ metadata       │ object storage API calls                                │  │
│  │          ▼                ▼                                                         │  │
│  │  ┌────────────────────┐   External Network                                          │  │
│  │  │ PostgreSQL         │-------------------------------------------------------------┼──┐
│  │  │ Container          │                                                             │  │
│  │  │--------------------│                                                             │  │
│  │  │ projects           │                                                             │  │
│  │  │ rooms              │                                                             │  │
│  │  │ file_assets        │                                                             │  │
│  │  │ reports            │                                                             │  │
│  │  │ annotations        │                                                             │  │
│  │  └────────────────────┘                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                           │
                                                                                           │
                                        ┌──────────────────────────────────────────────────▼────────┐
                                        │                     Synology NAS                           │
                                        │-----------------------------------------------------------│
                                        │ Existing MinIO                                             │
                                        │ - API Port: your existing MinIO API port                   │
                                        │ - Console Port: your existing MinIO Console port           │
                                        │                                                           │
                                        │ Buckets used by this project:                             │
                                        │ - construction-images                                     │
                                        │ - construction-thumbnails                                 │
                                        │ - construction-pointclouds                                │
                                        │ - construction-reports                                    │
                                        └───────────────────────────────────────────────────────────┘
```

## 3. What Lives Where

### Windows Lab VM

Used for:
- editing code
- reading documentation
- pushing code to GitHub
- accessing the Ubuntu VM
- opening the app in a browser

You access both the Ubuntu VM and the Synology NAS from here.

You also manage the three Git repositories from here.

### Ubuntu VM

Runs Docker containers for:
- frontend container
- backend container
- PostgreSQL container

The VM is the host.
The app services are separated from each other by container boundaries.

### Synology NAS

Already runs:
- MinIO

You access the NAS from the same RDP session on the Windows Lab VM.

It stores:
- original images
- generated thumbnails
- pointcloud files
- report files

## 4. Responsibilities of Each Layer

### Frontend Container

The frontend is responsible for:
- rendering the floorplan and room navigation
- showing date-based and room-based file explorers
- opening viewers for images and pointclouds
- requesting AI analysis
- collecting report inputs from the user

The frontend container includes:
- the built React app
- Nginx serving the app
- reverse proxy rules for `/api`

The frontend should **not**:
- store secrets
- call Hyperbolic directly with an exposed API key
- be the source of truth for room/file data

### Backend Container

The backend is responsible for:
- serving the API
- reading metadata from PostgreSQL
- generating MinIO presigned URLs
- receiving uploads
- proxying AI requests to Hyperbolic
- storing reports and annotations
- seeding default rooms and project records

The backend container is the only application service that talks to:
- PostgreSQL
- MinIO
- Hyperbolic

### PostgreSQL Container

PostgreSQL stores metadata only:
- project names
- room definitions
- file records
- upload metadata
- report records
- annotation records

It does **not** store the file binaries themselves.

It is kept separate so:
- database state is isolated from application code
- database restarts do not require rebuilding the backend
- the backend can be replaced without replacing the database

### MinIO

MinIO stores the actual files:
- image files
- thumbnails
- pointcloud files
- generated report outputs

## 5. Container-to-Container Communication

Inside the Ubuntu VM:
- the **frontend container** talks to the **backend container**
- the **backend container** talks to the **PostgreSQL container**
- the **backend container** also talks out to the **Synology NAS MinIO**

Important:
- the frontend does **not** talk directly to PostgreSQL
- PostgreSQL does **not** talk directly to MinIO
- the backend is the central application layer

## 6. Core Data Flow

### A. Date-Based File Explorer

1. User selects a date in the frontend.
2. Frontend requests:

```text
GET /api/files/explorer/date/{date}
```

3. Backend queries PostgreSQL for all matching files.
4. Backend groups results by room.
5. Backend generates MinIO presigned URLs.
6. Backend returns frontend-ready file objects.
7. Frontend displays thumbnails or pointcloud entries.

### B. Room-Based File Explorer

1. User clicks a room on the floorplan.
2. Frontend requests:

```text
GET /api/files/explorer/room/{roomSlug}
```

3. Backend loads all files for that room.
4. Backend groups results by capture date.
5. Backend returns date-grouped media.
6. Frontend renders the timeline for that room.

### C. Static Viewer AI Analysis

1. User opens an image in the static viewer.
2. Frontend requests:

```text
POST /api/ai/analyze
```

3. Backend sends the image URL to Hyperbolic.
4. Backend returns the generated description.
5. Frontend shows the result in the viewer.

### D. Upload Flow

1. User uploads a file from the frontend.
2. Frontend submits to:

```text
POST /api/upload/single
```

3. Backend validates the file and room.
4. Backend uploads the file to MinIO.
5. Backend generates a thumbnail for images.
6. Backend writes metadata to PostgreSQL.
7. Frontend can now discover the file through explorer endpoints.

## 7. Metadata vs File Storage

### PostgreSQL stores

- project IDs and names
- room IDs, names, and slugs
- file metadata
- object paths
- capture dates
- report metadata
- annotation JSON

### MinIO stores

- original file contents
- generated thumbnails
- report files

This separation is important because:
- databases are best for structured searchable records
- object storage is best for large binary files

## 8. Backend Structure

The backend code lives in `backend/app/`.

Important files:
- `main.py` - FastAPI app
- `config.py` - environment/config values
- `database.py` - database setup
- `models.py` - SQLAlchemy models
- `schemas.py` - request/response schema definitions
- `api/files.py` - explorer endpoints
- `api/upload.py` - upload endpoint
- `api/ai.py` - AI proxy endpoint
- `services/storage.py` - MinIO integration
- `services/ai.py` - Hyperbolic integration
- `services/bootstrap.py` - default seed logic

## 9. Frontend Integration Points

Main frontend files now tied to the backend:
- `frontend/src/services/apiClient.ts`
- `frontend/src/services/imageDescriptionLogic.ts`
- `frontend/src/pages/Dashboard/FileExplorer.tsx`
- `frontend/src/pages/RoomFileViewer.tsx`
- `frontend/src/components/StaticViewer.tsx`
- `frontend/src/components/staticViewerRoom.tsx`

This means:
- room/date explorer data now comes from FastAPI
- AI no longer uses a client-side secret
- file URLs can come from MinIO through backend-generated presigned links

## 10. Repository Structure

The system is managed as three separate repositories:

- `frontend` repo
  - React app
  - Nginx config
  - frontend Dockerfile
  - project docs

- `backend` repo
  - FastAPI app
  - backend Dockerfile
  - backend scripts

- `deployment` repo
  - Docker Compose
  - deployment env template

Typical Ubuntu VM layout:

```text
/opt/a6-stern/
  frontend/
  backend/
  deployment/
```

## 11. Nginx Role

In this architecture, Nginx lives inside the **frontend container**.

Nginx does two jobs:

1. serves the built frontend
2. proxies `/api/*` requests to FastAPI

That is why the frontend can use:

```text
/api
```

instead of hardcoding backend addresses into the browser.

## 12. Existing MinIO Assumption

This system is designed around the fact that MinIO already exists on your Synology NAS.

That means:
- we do **not** install MinIO again
- we do **not** run MinIO on the Ubuntu VM
- we use the existing NAS MinIO endpoint

The backend must be configured with:
- NAS IP
- MinIO API port
- MinIO Console port
- MinIO access key
- MinIO secret key

Important:
- the backend uses the **API port**
- your browser uses the **Console port**

## 13. Legacy Asset Migration

If you want to move current local assets from the frontend repo's `public/` folder into MinIO and PostgreSQL, use:

```text
backend/scripts/migrate_legacy_assets.py
```

That script:
- reads a configurable frontend public directory
- uploads matching files into MinIO
- creates file metadata records in PostgreSQL

## 14. Proposed Runtime Diagram

```text
User Browser
   │
   ├── GET /                         → Frontend container (Nginx + built React app)
   ├── GET /api/files/...            → Frontend container → Backend container → PostgreSQL + MinIO
   ├── POST /api/upload/single       → Frontend container → Backend container → MinIO + PostgreSQL
   └── POST /api/ai/analyze          → Frontend container → Backend container → Hyperbolic
```

## 15. Summary

The proposed system is:
- frontend in its **own container** on the Ubuntu VM
- backend in its **own container** on the Ubuntu VM
- PostgreSQL in its **own container** on the Ubuntu VM
- MinIO on the Synology NAS

This gives you:
- a clean separation between UI, API, database, and file storage
- no secrets in the browser
- reusable shared MinIO storage
- isolated services that can be restarted separately
- a structure that matches how your current frontend actually works
