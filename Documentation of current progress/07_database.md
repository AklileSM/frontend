# Database Schema Reference

This document covers every table in the A6-stern2 PostgreSQL database: all columns, their types and purpose, relationships between tables, and constraints worth knowing about.

---

## How the schema is managed

SQLAlchemy is used with the declarative ORM (`DeclarativeBase`). The schema is applied at startup via `Base.metadata.create_all(bind=engine)` in the FastAPI lifespan handler — there is no Alembic or migration framework. `create_all` is additive only: it creates missing tables but never alters existing ones.

One manual migration exists: `services/db_migrations.py:ensure_comparison_drafts_state_json` runs after `create_all` and uses `ALTER TABLE` to add the `state_json` column to `comparison_drafts` on deployments that predate it.

**Engine settings**: `pool_pre_ping=True`, `future=True`. No connection pool size override — SQLAlchemy defaults apply.

---

## Table overview

| Table | Purpose | Rows added by |
|---|---|---|
| `users` | User accounts and roles | `POST /api/auth/register` |
| `projects` | Top-level projects | Bootstrap seed on startup |
| `rooms` | Rooms within a project | Bootstrap seed on startup |
| `file_assets` | Every uploaded media file | Upload endpoints |
| `comparison_drafts` | Draft reports from Compare viewer | `POST /api/reports/comparison-drafts` |
| `viewer_report_drafts` | Draft reports from all other viewers | `POST /api/reports/viewer-drafts` |
| `reports` | Published field observation reports | `POST /api/reports/` |
| `annotations` | Spatial annotations on media files | `POST /api/annotations/` |

---

## Table: `users`

Stores every registered account.

| Column | SQL type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(36)` | NO | `uuid4()` | Primary key. UUID v4 string. |
| `username` | `VARCHAR(64)` | NO | — | Login name. Unique, indexed. Pattern: `^[a-zA-Z0-9._-]+$`, 3–64 chars. |
| `email` | `VARCHAR(255)` | YES | `NULL` | Optional email. Unique when present. |
| `password_hash` | `VARCHAR(255)` | NO | — | bcrypt hash of the user's password. Never returned by any API endpoint. |
| `role` | `VARCHAR(20)` | NO | `'viewer'` | Authorization role. One of `admin`, `manager`, `viewer`. |
| `is_active` | `BOOLEAN` | NO | `True` | Reserved for soft-disable; not currently checked by any route handler. |
| `created_at` | `TIMESTAMP` | NO | `utcnow()` | Row creation time (UTC). |

**Constraints:**
- `username` has a `UNIQUE` constraint and a B-tree index.
- `email` has a `UNIQUE` constraint (nullable unique — two `NULL` values are allowed by PostgreSQL).

**Relationships:** None — no FK columns point at `users`. Ownership is tracked loosely: `file_assets.metadata_json["uploaded_by_user_id"]` and every `created_by` column store a user `id` as a plain string, with no FK constraint.

**Role assignment logic:** The first user to call `POST /api/auth/register` receives `role = "admin"` (checked via `SELECT COUNT(*) FROM users == 0`). All subsequent registrations receive `role = "viewer"`. Role can only be changed by direct database edit — no API endpoint exists for it.

**Important:** Every authenticated request re-fetches the user's row from this table to read `role`. The JWT `role` claim is never used for authorization. Role changes take effect on the next request without requiring a new token.

---

## Table: `projects`

Top-level grouping for rooms and files.

| Column | SQL type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(36)` | NO | `uuid4()` | Primary key. UUID v4 string. |
| `name` | `VARCHAR(255)` | NO | — | Display name (e.g. `"A6 Stern"`). |
| `slug` | `VARCHAR(100)` | NO | — | URL-safe identifier (e.g. `"a6-stern"`). Unique. |
| `created_at` | `TIMESTAMP` | NO | `utcnow()` | Row creation time (UTC). |

**Constraints:**
- `slug` has a `UNIQUE` constraint.

**Relationships:**
- `rooms` → `Room` (one-to-many, `cascade="all, delete-orphan"`)

**Seeded rows** (inserted at startup if not present):

| `name` | `slug` |
|---|---|
| `A6 Stern` | `a6-stern` |
| `Project X` | `projectx` |
| `Project Y` | `projecty` |

---

## Table: `rooms`

Physical or logical spaces within a project. Currently all six seeded rooms belong to the `a6-stern` project.

| Column | SQL type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(36)` | NO | `uuid4()` | Primary key. UUID v4 string. |
| `project_id` | `VARCHAR(36)` | NO | — | FK → `projects.id`. |
| `name` | `VARCHAR(255)` | NO | — | Display name (e.g. `"Room 1"`). Used as the key in `ExplorerByDateResponse.rooms`. |
| `slug` | `VARCHAR(100)` | NO | — | URL-safe identifier (e.g. `"room1"`). Unique across all projects. |
| `floor_plan_coordinates` | `JSON` | YES | `NULL` | Optional JSON object for hotspot placement on a floor plan. Schema is frontend-defined. |
| `sort_order` | `INTEGER` | NO | `0` | Ascending sort position. Rooms are ordered `sort_order ASC, name ASC` in list responses. |
| `created_at` | `TIMESTAMP` | NO | `utcnow()` | Row creation time (UTC). |

**Constraints:**
- `slug` has a `UNIQUE` constraint.
- `project_id` has a FK constraint (no explicit `ON DELETE` clause — SQLAlchemy default is `RESTRICT`).

**Relationships:**
- `project` → `Project` (many-to-one)
- `files` → `FileAsset` (one-to-many, `cascade="all, delete-orphan"`)

**Seeded rows** (inserted under `a6-stern` if not present):

| `name` | `slug` | `sort_order` |
|---|---|---|
| `Room 1` | `room1` | 1 |
| `Room 2` | `room2` | 2 |
| `Room 3` | `room3` | 3 |
| `Room 4` | `room4` | 4 |
| `Room 5` | `room5` | 5 |
| `Room 6` | `room6` | 6 |

---

## Table: `file_assets`

The central media registry. Every uploaded image, video, point cloud, and PDF has exactly one row here.

| Column | SQL type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(36)` | NO | `uuid4()` | Primary key. UUID v4 string. |
| `room_id` | `VARCHAR(36)` | NO | — | FK → `rooms.id`. |
| `media_type` | `VARCHAR(30)` | NO | — | Kind of file. One of `image`, `video`, `pointcloud`, `pdf`. |
| `capture_date` | `DATE` | NO | — | The date the media was captured (supplied by the uploader, not derived from file metadata). |
| `original_name` | `VARCHAR(255)` | NO | — | Filename as received from the HTTP upload (the browser's filename). |
| `display_name` | `VARCHAR(255)` | NO | — | Formatted filename shown to users. Pattern: `{room.slug}-{YYYYMMDD}-{seq:03d}{ext}` (e.g. `room2-20241007-001.jpg`). |
| `bucket_name` | `VARCHAR(255)` | NO | — | MinIO bucket holding the primary file. See bucket table below. |
| `object_name` | `VARCHAR(500)` | NO | — | Object path within `bucket_name` (e.g. `room2/20241007/room2-20241007-001.jpg`). |
| `thumbnail_bucket_name` | `VARCHAR(255)` | YES | `NULL` | MinIO bucket for the thumbnail. Set for `image` and `video` types; `NULL` for point clouds and PDFs. |
| `thumbnail_object_name` | `VARCHAR(500)` | YES | `NULL` | Object path within `thumbnail_bucket_name`. |
| `content_type` | `VARCHAR(100)` | YES | `NULL` | MIME type (e.g. `image/jpeg`, `video/mp4`, `application/octet-stream`). |
| `file_size` | `INTEGER` | YES | `NULL` | File size in bytes. Set to `NULL` for point clouds when `DELETE_ORIGINAL_POINTCLOUD_AFTER_CONVERSION=true` and the source LAZ has been removed. |
| `metadata_json` | `JSON` | YES | `NULL` | Flexible metadata dictionary. Contents vary by media type (see below). |
| `created_at` | `TIMESTAMP` | NO | `utcnow()` | Row creation time (UTC). |

**Constraints:**
- `room_id` has a FK constraint.

**Relationships:**
- `room` → `Room` (many-to-one)
- `reports` → `Report` (one-to-many, `cascade="all, delete-orphan"`)
- `annotations` → `Annotation` (one-to-many, `cascade="all, delete-orphan"`)
- `comparison_drafts` → `ComparisonDraft` (one-to-many, `cascade="all, delete-orphan"`)
- `viewer_report_drafts` → `ViewerReportDraft` (one-to-many, `cascade="all, delete-orphan"`)

**MinIO bucket mapping:**

| `media_type` | `bucket_name` | `thumbnail_bucket_name` |
|---|---|---|
| `image` | `construction-images` | `construction-thumbnails` |
| `video` | `construction-videos` | `construction-thumbnails` |
| `pointcloud` | `construction-pointclouds` | `NULL` |
| `pdf` | `construction-pdfs` | `NULL` |

**`metadata_json` structure:**

All types include the uploader identity at creation time:
```json
{
  "uploaded_by_user_id": "<user.id>",
  "uploaded_by_username": "<user.username>"
}
```

Point clouds additionally carry conversion pipeline state, written and updated by `services/pointcloud.py`:
```json
{
  "uploaded_by_user_id": "...",
  "uploaded_by_username": "...",
  "conversion_status": "pending | processing | ready | failed",
  "conversion_error": "...",
  "potree_base_object": "room2/20241007/room2-20241007-001_potree/",
  "original_removed_after_conversion": true
}
```

- `conversion_status` lifecycle: `pending` (on insert) → `processing` (conversion started) → `ready` (Potree files uploaded) or `failed` (subprocess error).
- `potree_base_object` is the MinIO prefix where `metadata.json`, `hierarchy.bin`, and `octree.bin` were stored.
- `original_removed_after_conversion` is only present when the source LAZ was deleted after successful conversion (controlled by `DELETE_ORIGINAL_POINTCLOUD_AFTER_CONVERSION` env var, default `true`).

Legacy-migrated files may have `{"source": "legacy-public"}` instead of uploader identity.

The `metadata_json.uploaded_by_user_id` field is queried directly with a PostgreSQL `JSONB` cast in `GET /api/files/my-uploads` to find files belonging to the current user.

---

## Table: `comparison_drafts`

Saved state for in-progress reports created in the Compare view (side-by-side image comparison).

| Column | SQL type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(36)` | NO | `uuid4()` | Primary key. UUID v4 string. |
| `file_id` | `VARCHAR(36)` | NO | — | FK → `file_assets.id`. The "primary" file this draft is anchored to. |
| `manual_observations` | `TEXT` | YES | `NULL` | Free-text observation notes entered by the user. |
| `flags` | `JSON` | YES | `NULL` | Array of active flag strings. Possible values: `"safety"`, `"quality"`, `"delayed"`. Example: `["safety", "delayed"]`. |
| `state_json` | `JSON` | YES | `NULL` | Full serialized Compare viewer state (left/right file selections, per-side flag booleans, etc.). Used to restore the UI when reopening a draft. |
| `pdf_bucket_name` | `VARCHAR(255)` | NO | — | MinIO bucket for the draft PDF. Always `construction-reports`. |
| `pdf_object_name` | `VARCHAR(500)` | NO | — | Object path: `{user_id}/{draft_uuid}.pdf`. |
| `created_by` | `VARCHAR(255)` | YES | `NULL` | User ID of the draft owner. Stored as a string — no FK constraint. All access checks compare this to `current_user.id`. |
| `created_at` | `TIMESTAMP` | NO | `utcnow()` | Row creation time (UTC). |

**Constraints:**
- `file_id` has a FK constraint.
- No unique constraints. A user can have multiple drafts for the same file.

**Relationships:**
- `file` → `FileAsset` (many-to-one)

**Ownership:** `created_by` is checked against the authenticated user's ID on every read, update, and delete. Even `admin` cannot access another user's draft through the API.

**Migration note:** `state_json` was not present in the original schema. The `ensure_comparison_drafts_state_json` function runs at startup and adds it via `ALTER TABLE` on existing deployments. New deployments get it from `create_all`.

---

## Table: `viewer_report_drafts`

Saved state for in-progress reports created in any viewer other than Compare (Static 360°, Interactive 360°, Room viewers, Point Cloud viewer).

| Column | SQL type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(36)` | NO | `uuid4()` | Primary key. UUID v4 string. |
| `file_id` | `VARCHAR(36)` | NO | — | FK → `file_assets.id`. The file being observed. |
| `viewer_kind` | `VARCHAR(32)` | NO | — | Identifies which viewer created the draft. See known values below. |
| `manual_observations` | `TEXT` | YES | `NULL` | Free-text observation notes entered by the user. |
| `flags` | `JSON` | YES | `NULL` | Array of active flag strings. Same values as `comparison_drafts.flags`. |
| `state_json` | `JSON` | YES | `NULL` | Full serialized viewer state. Schema is `ViewerFieldDraftStateV1` (`version: 1`) — versioned for forward-compatible migration. |
| `pdf_bucket_name` | `VARCHAR(255)` | NO | — | MinIO bucket for the draft PDF. Always `construction-reports`. |
| `pdf_object_name` | `VARCHAR(500)` | NO | — | Object path: `{user_id}/{draft_uuid}.pdf`. |
| `created_by` | `VARCHAR(255)` | YES | `NULL` | User ID of the draft owner. No FK constraint. |
| `created_at` | `TIMESTAMP` | NO | `utcnow()` | Row creation time (UTC). |

**Constraints:**
- `file_id` has a FK constraint.
- `viewer_kind` is validated at the API layer (1–32 chars, non-empty) but has no database check constraint.

**Relationships:**
- `file` → `FileAsset` (many-to-one)

**Known `viewer_kind` values:**

| Value | Viewer |
|---|---|
| `static_360` | Static panoramic viewer (single file) |
| `static_room` | Static panoramic viewer (room context) |
| `interactive_360` | Three.js interactive 360° viewer (single file) |
| `interactive_room` | Three.js interactive 360° viewer (room context) |
| `static_pcd` | Point cloud viewer (iframe-embedded Potree) |

**Ownership:** Same rules as `comparison_drafts` — `created_by` is checked against the authenticated user's ID on all operations.

---

## Table: `reports`

Published field observation reports. Represents a completed and saved report, as opposed to a still-being-edited draft.

| Column | SQL type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(36)` | NO | `uuid4()` | Primary key. UUID v4 string. |
| `file_id` | `VARCHAR(36)` | NO | — | FK → `file_assets.id`. The file this report covers. |
| `ai_description` | `TEXT` | YES | `NULL` | AI-generated description of the image, fetched from the local vision model (Qwen or Ollama-compatible). |
| `manual_observations` | `TEXT` | YES | `NULL` | Free-text notes entered by the user at report creation time. |
| `flags` | `JSON` | YES | `NULL` | Array of active flag strings. Same values as the draft tables. |
| `screenshots` | `JSON` | YES | `NULL` | Array of base64-encoded JPEG data URLs captured from the WebGL canvas (Three.js `ScreenshotHelper`). |
| `pdf_bucket_name` | `VARCHAR(255)` | YES | `NULL` | MinIO bucket for the report PDF. `NULL` when no PDF has been uploaded. Usually `construction-reports`. |
| `pdf_object_name` | `VARCHAR(500)` | YES | `NULL` | Object path for the PDF. `NULL` when no PDF has been uploaded. |
| `created_by` | `VARCHAR(255)` | YES | `NULL` | User ID of the report author. No FK constraint. |
| `created_at` | `TIMESTAMP` | NO | `utcnow()` | Row creation time (UTC). |

**Constraints:**
- `file_id` has a FK constraint.
- `pdf_bucket_name` and `pdf_object_name` are nullable (unlike in the draft tables, where they are NOT NULL because a PDF blob is always required at creation time).

**Relationships:**
- `file` → `FileAsset` (many-to-one)

**Ownership:** Same rules as drafts — `created_by` is checked against the authenticated user's ID.

**Report reference format:** The human-readable reference shown on PDFs (`FOR-YYYYMMDD-HHMMSS`) is generated client-side by `fieldObservationReportReference()` in the frontend. It is not stored in this table.

---

## Table: `annotations`

Spatial annotations attached to a media file (e.g. pins, areas, measurements drawn on an image or panorama).

| Column | SQL type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(36)` | NO | `uuid4()` | Primary key. UUID v4 string. |
| `file_id` | `VARCHAR(36)` | NO | — | FK → `file_assets.id`. The file this annotation belongs to. |
| `annotation_type` | `VARCHAR(50)` | NO | — | Category of annotation. Frontend-defined string (e.g. `"pin"`, `"area"`, `"measurement"`). Not validated by the backend. |
| `data` | `JSON` | NO | — | Annotation payload. Schema is entirely frontend-defined. Stores coordinates, labels, colours, and any other annotation-specific fields. |
| `created_at` | `TIMESTAMP` | NO | `utcnow()` | Row creation time (UTC). |

**Constraints:**
- `file_id` has a FK constraint.
- `data` is NOT NULL — an empty `{}` is accepted but `NULL` is not.

**Relationships:**
- `file` → `FileAsset` (many-to-one)

**No ownership tracking:** Annotations have no `created_by` column. They cannot be deleted through the API (no delete endpoint exists). Both the list and create endpoints are public — no authentication is required.

---

## Entity-relationship summary

```
projects
  └─── rooms (project_id → projects.id)
         └─── file_assets (room_id → rooms.id)
                ├─── reports          (file_id → file_assets.id)
                ├─── annotations      (file_id → file_assets.id)
                ├─── comparison_drafts     (file_id → file_assets.id)
                └─── viewer_report_drafts  (file_id → file_assets.id)

users  (no FK relationships — referenced by string in metadata_json and created_by)
```

All cascades go downward: deleting a `project` deletes its rooms; deleting a room deletes its file assets; deleting a file asset deletes all its reports, annotations, and drafts.

---

## Cross-cutting notes

### Primary keys
Every table uses a UUID v4 string (`VARCHAR(36)`) as primary key, generated by `lambda: str(uuid.uuid4())` in Python before insert. There are no auto-increment integer PKs.

### Timestamps
All `created_at` columns use `datetime.utcnow` as the default. There are no `updated_at` columns — update operations overwrite individual fields without recording the modification time.

### Ownership pattern
`comparison_drafts`, `viewer_report_drafts`, and `reports` each have a `created_by VARCHAR(255)` column that stores a user `id` string. This is deliberately not a FK so that deleting a user does not cascade-delete their reports. The API enforces ownership by comparing `created_by == current_user.id` in the route handler — there is no database-level row security.

### `flags` column
Present on `reports`, `comparison_drafts`, and `viewer_report_drafts`. Stored as a JSON array of strings. The three possible values are produced by `flagsFromObservationBooleans()` in the frontend:

| String value | Meaning |
|---|---|
| `"safety"` | Safety issue observed |
| `"quality"` | Quality concern observed |
| `"delayed"` | Work is behind schedule |

### `state_json` column
Present on `comparison_drafts` and `viewer_report_drafts`. Stores the full serialized viewer state so the UI can restore exactly where the user left off. The `viewer_report_drafts.state_json` follows the `ViewerFieldDraftStateV1` schema (`version: 1`), enabling future schema migration. No such versioning exists for `comparison_drafts.state_json`.

### No Alembic
Schema changes require either manual `ALTER TABLE` statements (like `ensure_comparison_drafts_state_json`) or a full table drop-and-recreate. Any new columns added to models will be created by `create_all` on fresh deployments but silently ignored on existing ones unless a migration function is added.
