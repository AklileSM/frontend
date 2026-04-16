# A6 Stern — API Reference

> Complete reference for every HTTP endpoint. Last updated: 2026-04-14.
>
> **Base URL (Docker):** `http://localhost:3002`  
> **Base URL (dev):** `http://localhost:3001`  
> **Interactive docs:** `{base}/api/docs` (Swagger UI) · `{base}/api/redoc`

---

## Auth conventions

Endpoints marked **Auth required** expect:

```
Authorization: Bearer <access_token>
```

Tokens are issued by `POST /api/auth/login` and `POST /api/auth/register`. The default expiry is 7 days (configured by `JWT_EXPIRE_MINUTES`).

**Role symbols used in this document:**

| Symbol | Meaning |
|---|---|
| 🔓 | No authentication required |
| 🔑 | Any authenticated user |
| 🔑👑 | Admin only |
| 🔑🔑 | Admin or manager |

---

## Table of Contents

1. [Health](#1-health)
2. [Auth](#2-auth)
3. [Projects](#3-projects)
4. [Rooms](#4-rooms)
5. [Files — Explorer and Serving](#5-files--explorer-and-serving)
6. [Files — Upload](#6-files--upload)
7. [Files — Delete](#7-files--delete)
8. [AI Analysis](#8-ai-analysis)
9. [Reports](#9-reports)
10. [Comparison Drafts](#10-comparison-drafts)
11. [Viewer Drafts](#11-viewer-drafts)
12. [Annotations](#12-annotations)
13. [Common Error Responses](#13-common-error-responses)
14. [Shared Schema Reference](#14-shared-schema-reference)

---

## 1. Health

### `GET /health` · `GET /api/health`

🔓 No auth required.

Returns the current status of the API and its connection to object storage. Both paths are equivalent; `/health` is used by Nginx's upstream check.

**Response `200 OK`**

```json
{
  "status": "ok",
  "app": "A6 Stern API",
  "environment": "production",
  "storage": true
}
```

| Field | Type | Description |
|---|---|---|
| `status` | `string` | Always `"ok"` if the process is running |
| `app` | `string` | Value of `APP_NAME` env var |
| `environment` | `string` | Value of `APP_ENV` env var |
| `storage` | `boolean` | `true` if MinIO responded to `list_buckets()`; `false` if unreachable |

---

## 2. Auth

### `POST /api/auth/register`

🔓 No auth required.

Registers a new user. The **first** user to register (when the `users` table is empty) automatically receives the `admin` role. All subsequent registrations receive `viewer`.

**Request body** (JSON)

```json
{
  "username": "alice",
  "password": "secret123",
  "email": "alice@example.com"
}
```

| Field | Type | Constraints | Required |
|---|---|---|---|
| `username` | `string` | 3–64 chars, pattern `^[a-zA-Z0-9._-]+$` | Yes |
| `password` | `string` | 8–128 chars | Yes |
| `email` | `string` | Max 255 chars | No |

**Response `200 OK`** → [`TokenResponse`](#tokenresponse)

```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "username": "alice",
    "email": "alice@example.com",
    "role": "admin"
  }
}
```

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `400` | `Username or email already registered` | Duplicate `username` or `email` |
| `422` | Validation error | Constraint violation on any field |

---

### `POST /api/auth/login`

🔓 No auth required.

Authenticates an existing user and returns a JWT.

**Request body** (JSON)

```json
{
  "username": "alice",
  "password": "secret123"
}
```

| Field | Type | Constraints | Required |
|---|---|---|---|
| `username` | `string` | 1–64 chars | Yes |
| `password` | `string` | 1–128 chars | Yes |

**Response `200 OK`** → [`TokenResponse`](#tokenresponse)

```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "username": "alice",
    "email": "alice@example.com",
    "role": "admin"
  }
}
```

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `401` | `Incorrect username or password` | Wrong credentials |
| `403` | `Account disabled` | `user.is_active == false` |

---

### `GET /api/auth/me`

🔑 Auth required (any role).

Returns the currently authenticated user. Used by the frontend on page load to validate the stored token and refresh the local user object (e.g. after a role change).

**Response `200 OK`** → [`UserPublic`](#userpublic)

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "username": "alice",
  "email": "alice@example.com",
  "role": "admin"
}
```

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `401` | `Not authenticated` | No or malformed `Authorization` header |
| `401` | `Invalid or expired token` | Token signature invalid or `exp` passed |
| `403` | `Account disabled` | `user.is_active == false` |

---

## 3. Projects

### `GET /api/projects/`

🔓 No auth required.

Lists all projects ordered alphabetically by name.

**Response `200 OK`** → `ProjectResponse[]`

```json
[
  { "id": "uuid", "name": "A6 Stern",   "slug": "a6-stern"  },
  { "id": "uuid", "name": "Project X",  "slug": "projectx"  },
  { "id": "uuid", "name": "Project Y",  "slug": "projecty"  }
]
```

| Field | Type | Description |
|---|---|---|
| `id` | `string` | UUID |
| `name` | `string` | Display name |
| `slug` | `string` | URL-safe identifier used in room queries and storage paths |

---

## 4. Rooms

### `GET /api/rooms` · `GET /api/rooms/`

🔓 No auth required.

Lists all rooms across all projects, ordered by `sort_order` ascending then `name` ascending. Both paths with and without the trailing slash are accepted.

**Response `200 OK`** → `RoomResponse[]`

```json
[
  { "id": "uuid", "name": "Room 1", "slug": "room1", "project_id": "uuid" },
  { "id": "uuid", "name": "Room 2", "slug": "room2", "project_id": "uuid" },
  ...
]
```

| Field | Type | Description |
|---|---|---|
| `id` | `string` | UUID |
| `name` | `string` | Display name |
| `slug` | `string` | URL-safe identifier; used in upload, storage paths, and explorer queries |
| `project_id` | `string` | UUID of the parent project |

---

### `GET /api/rooms/{room_slug}`

🔓 No auth required.

Returns a single room by its slug.

**Path parameter**

| Parameter | Description |
|---|---|
| `room_slug` | Room slug e.g. `room2` |

**Response `200 OK`** → `RoomResponse`

```json
{ "id": "uuid", "name": "Room 2", "slug": "room2", "project_id": "uuid" }
```

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `404` | `Room not found` | No room with that slug |

---

## 5. Files — Explorer and Serving

### `GET /api/files/explorer/dates`

🔓 No auth required.

Returns a count of each media type for every date that has at least one file. Used by calendars to highlight days with content.

**Response `200 OK`** → [`ExplorerDatesSummaryResponse`](#explorerdatessummaryresponse)

```json
{
  "dates": {
    "2024-03-15": { "images": 12, "videos": 2, "pointclouds": 1, "pdfs": 0 },
    "2024-03-22": { "images": 8,  "videos": 0, "pointclouds": 0, "pdfs": 3 }
  }
}
```

---

### `GET /api/files/explorer/date/{capture_date}`

🔓 No auth required.

Returns all media for a given capture date, grouped by room. Rooms are ordered by `sort_order` ascending.

**Path parameter**

| Parameter | Format | Description |
|---|---|---|
| `capture_date` | `YYYY-MM-DD` | The capture date to query |

**Response `200 OK`** → [`ExplorerByDateResponse`](#explorerbydate response)

```json
{
  "date": "2024-03-15",
  "rooms": {
    "Room 1": {
      "images":      [ { ...MediaFileResponse }, ... ],
      "videos":      [],
      "pointclouds": [],
      "pdfs":        []
    },
    "Room 2": { ... }
  }
}
```

Room keys are room **names** (not slugs). Every room that exists in the database appears in the map; rooms with no media for that date have empty lists.

---

### `GET /api/files/explorer/room/{room_slug}`

🔓 No auth required.

Returns all media for a given room, grouped by capture date. Dates and files are ordered ascending.

**Path parameter**

| Parameter | Description |
|---|---|
| `room_slug` | Room slug e.g. `room2` |

**Response `200 OK`** → [`ExplorerByRoomResponse`](#explorerbyroom response)

```json
{
  "room": "room2",
  "room_name": "Room 2",
  "dates": {
    "2024-03-15": {
      "images":      [ { ...MediaFileResponse }, ... ],
      "videos":      [],
      "pointclouds": [],
      "pdfs":        []
    }
  }
}
```

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `404` | `Room not found` | No room with that slug |

---

### `GET /api/files/my-uploads`

🔑🔑 Admin or manager only.

Returns all file assets uploaded by the current user (identified by `metadata_json.uploaded_by_user_id`), ordered by `created_at` descending. Viewers receive `403`.

**Response `200 OK`** → `MyUploadItemResponse[]`

```json
[
  {
    "id": "uuid",
    "room_slug": "room2",
    "room_name": "Room 2",
    "media_type": "image",
    "file_name": "room2-20240315-001.jpg",
    "capture_date": "2024-03-15",
    "created_at": "2024-03-15T10:23:45",
    "src": "/api/files/uuid/thumbnail",
    "full_src": "/api/files/uuid/content",
    "conversion_status": null
  }
]
```

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `403` | `Upload history is only available for admin and manager accounts` | Role is `viewer` |

---

### `GET /api/files/{asset_id}/url`

🔓 No auth required.

Returns the serving URL for a file asset. For ready point clouds returns the Potree `metadata.json` proxy path; for all other types returns the `/content` proxy path.

**Path parameter**

| Parameter | Description |
|---|---|
| `asset_id` | File asset UUID |

**Response `200 OK`**

```json
{ "url": "/api/files/uuid/content" }
```

or for a converted point cloud:

```json
{ "url": "/api/files/uuid/pointcloud/metadata.json" }
```

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `404` | `File not found` | No asset with that ID |

---

### `GET /api/files/{asset_id}/thumbnail`

🔓 No auth required.

Returns the JPEG thumbnail for an image asset. Thumbnails are 400 × 300 px, quality 82.

**Response `200 OK`**

- `Content-Type: image/jpeg`
- `Cache-Control: public, max-age=86400`
- Body: raw JPEG bytes

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `404` | `Not found` | Asset does not exist or has no thumbnail |
| `404` | `File not found in storage` | Thumbnail object missing from MinIO |

---

### `GET /api/files/{asset_id}/content`

🔓 No auth required. Supports HTTP Range requests.

Proxies the full file from MinIO to the browser. Used for images, videos, PDFs, and point clouds not yet converted.

Files ≤ 100 MB are returned in a single `200` response. Files > 100 MB are streamed in 1 MB chunks.

**Headers (optional)**

| Header | Example | Effect |
|---|---|---|
| `Range` | `bytes=0-1048575` | Returns a `206 Partial Content` response with only the requested byte range |

**Response `200 OK`** — full file

| Header | Value |
|---|---|
| `Content-Type` | Detected from `content_type` column or filename |
| `Content-Length` | File size in bytes |
| `Accept-Ranges` | `bytes` |
| `Cache-Control` | `public, max-age=86400` |

**Response `206 Partial Content`** — range request

| Header | Value |
|---|---|
| `Content-Range` | `bytes {first}-{last}/{total}` |
| `Content-Length` | Length of returned chunk |
| `Accept-Ranges` | `bytes` |
| `Cache-Control` | `public, max-age=86400` |

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `404` | `Not found` | No asset with that ID |
| `404` | `Use pointcloud routes` | Converted point cloud — use `/pointcloud/` path instead |
| `404` | `File not found in storage` | Object missing from MinIO |
| `416` | `Range not satisfiable` | Range start ≥ file size |

---

### `GET /api/files/{asset_id}/conversion-status`

🔓 No auth required.

Returns the current Potree conversion status for a point cloud asset. The frontend polls this endpoint until `status` is `"ready"` before loading the Potree viewer.

**Response `200 OK`**

```json
{
  "status": "pending",
  "error": null
}
```

| Field | Type | Possible values |
|---|---|---|
| `status` | `string` | `"pending"` · `"processing"` · `"ready"` · `"failed"` · `"unknown"` |
| `error` | `string \| null` | Error message if `status == "failed"`, otherwise `null` |

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `404` | `File not found` | No asset with that ID |

---

### `GET /api/files/{asset_id}/pointcloud/{path}`

🔓 No auth required. Supports HTTP Range requests.

Proxies one of the three Potree binary files from MinIO. The `path` parameter must be exactly one of `metadata.json`, `hierarchy.bin`, or `octree.bin`; any other value returns `404`. Path traversal characters (`..`, leading `/`) are rejected with `400`.

Potree issues many byte-range requests against `hierarchy.bin` and `octree.bin` as it traverses the octree. Range support is identical to `/content`.

**Path parameters**

| Parameter | Description |
|---|---|
| `asset_id` | File asset UUID (must be a `pointcloud` media type) |
| `path` | One of `metadata.json`, `hierarchy.bin`, `octree.bin` |

**Response `200 OK` / `206 Partial Content`**

- `Content-Type: application/json` for `metadata.json`; `application/octet-stream` otherwise
- `Accept-Ranges: bytes`
- `Cache-Control: public, max-age=86400`

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `400` | `Invalid path` | Path traversal attempt |
| `404` | `Not found` | Asset missing or not a point cloud |
| `404` | `Point cloud not yet converted` | `potree_base_object` not set in metadata |
| `404` | `Not found` | `path` is not one of the three allowed filenames |
| `416` | `Range not satisfiable` | Range start ≥ file size |

---

## 6. Files — Upload

All upload endpoints require the `admin` role. Managers and viewers receive `403 Only administrators can upload files`.

---

### `POST /api/upload/single`

🔑👑 Admin only. Multipart form.

Uploads a single image, video, PDF, or point cloud file. For point clouds, prefer the chunked or direct-upload paths for files > ~100 MB.

**Form fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | binary | Yes | The file to upload |
| `room_slug` | `string` | Yes | Target room slug e.g. `room2` |
| `media_type` | `string` | Yes | One of `image` · `video` · `pdf` · `pointcloud` |
| `capture_date` | `YYYY-MM-DD` | Yes | Date the media was captured |

**Behaviour by type**

- **image** — uploaded to `construction-images`; 400×300 JPEG thumbnail generated and stored in `construction-thumbnails`.
- **video** — uploaded to `construction-images`.
- **pdf** — validated to be a PDF; uploaded to `construction-pdfs`.
- **pointcloud** — streamed to a temp file to avoid loading GB into RAM; uploaded to `construction-pointclouds`; conversion queued as a background task.

Display name is generated as `{room_slug}-{YYYYMMDD}-{seq:03d}{ext}`, where `seq` counts existing assets for the same room + date + media type.

**Response `200 OK`** → [`UploadResponse`](#uploadresponse)

```json
{
  "id": "uuid",
  "room": "room2",
  "media_type": "image",
  "file_name": "room2-20240315-001.jpg",
  "capture_date": "2024-03-15"
}
```

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `400` | `Invalid media_type` | Value not in allowed set |
| `400` | `Expected a PDF file` | `media_type=pdf` but file is not a PDF |
| `403` | `Only administrators can upload files` | Role is not `admin` |
| `404` | `Room not found` | No room with that slug |
| `413` | `File too large` | Exceeds `MAX_UPLOAD_SIZE_BYTES` (default 5 GB) |

---

### `POST /api/upload/pointcloud/init`

🔑👑 Admin only. Multipart form.

**Step 1 of 3** in the chunked upload path. Creates an upload session directory on disk and returns an `upload_id` and the expected `chunk_size`.

**Form fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `room_slug` | `string` | Yes | Target room slug |
| `capture_date` | `YYYY-MM-DD` | Yes | Capture date |
| `filename` | `string` | Yes | Original filename (used for extension) |
| `file_size` | `integer` | Yes | Total file size in bytes |
| `content_type` | `string` | No | MIME type; defaults to `application/octet-stream` |

**Response `200 OK`**

```json
{
  "upload_id": "a1b2c3d4e5f6...",
  "chunk_size": 33554432
}
```

| Field | Description |
|---|---|
| `upload_id` | Opaque hex string; pass to all subsequent chunk and complete calls |
| `chunk_size` | Server's preferred chunk size in bytes (32 MB) |

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `400` | `Invalid file size` | `file_size <= 0` |
| `404` | `Room not found` | No room with that slug |
| `413` | `File too large` | Exceeds `MAX_UPLOAD_SIZE_BYTES` |

---

### `POST /api/upload/pointcloud/chunk`

🔑👑 Admin only. Multipart form.

**Step 2 of 3** (repeated for each chunk). Saves one binary chunk to the upload session directory as `{chunk_index:08d}.part`. May be called concurrently for different `chunk_index` values.

**Form fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `upload_id` | `string` | Yes | Session ID from `/init` |
| `chunk_index` | `integer` | Yes | Zero-based chunk index |
| `chunk` | binary | Yes | The chunk bytes |

**Response `200 OK`**

```json
{
  "ok": true,
  "chunk_index": 0,
  "chunk_size": 67108864
}
```

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `400` | `Invalid chunk index` | `chunk_index < 0` |
| `404` | `Upload session not found` | Unknown or expired `upload_id` |

---

### `POST /api/upload/pointcloud/complete`

🔑👑 Admin only. Multipart form.

**Step 3 of 3** in the chunked upload path. Assembles all `.part` files in order, uploads the assembled LAZ to MinIO, creates the `FileAsset` record, and queues Potree conversion.

**Form fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `upload_id` | `string` | Yes | Session ID from `/init` |
| `total_chunks` | `integer` | Yes | Expected number of chunks |

**Response `200 OK`** → [`UploadResponse`](#uploadresponse)

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `400` | `Invalid total chunk count` | `total_chunks <= 0` |
| `400` | `Missing chunk {i}` | A part file is absent |
| `404` | `Upload session not found` | Unknown `upload_id` or missing manifest |
| `404` | `Room not found` | Stale session; room was deleted |
| `413` | `File too large` | Assembled file exceeds limit |

---

### `POST /api/upload/pointcloud/direct-init`

🔑👑 Admin only. Multipart form.

**Step 1 of 2** in the direct (presigned) upload path. Creates a session, generates a presigned MinIO PUT URL, and returns it for the browser to upload to directly — bypassing the backend.

**Form fields**

Identical to `/pointcloud/init`.

**Response `200 OK`**

```json
{
  "upload_id": "a1b2c3d4e5f6...",
  "upload_url": "http://192.168.50.200:9100/construction-pointclouds/room2/2024-03-15/...?X-Amz-Signature=...",
  "method": "PUT"
}
```

| Field | Description |
|---|---|
| `upload_id` | Session ID; pass to `/direct-complete` |
| `upload_url` | Presigned MinIO URL. Browser sends `PUT {file_bytes}` directly to this URL. |
| `method` | Always `"PUT"` |

**Errors** — same as `/pointcloud/init`.

---

### `POST /api/upload/pointcloud/direct-complete`

🔑👑 Admin only. Multipart form.

**Step 2 of 2** in the direct upload path. Verifies the object was uploaded to MinIO (compares declared vs stored size), downloads a copy for conversion, creates the `FileAsset` record, and queues Potree conversion.

**Form fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `upload_id` | `string` | Yes | Session ID from `/direct-init` |

**Response `200 OK`** → [`UploadResponse`](#uploadresponse)

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `400` | `Uploaded object is empty` | MinIO object has size 0 |
| `400` | `Uploaded size mismatch` | Stored size ≠ declared size |
| `400` | `Failed to prepare uploaded pointcloud` | Download for conversion failed |
| `404` | `Upload session not found` | Unknown `upload_id` |

---

## 7. Files — Delete

### `DELETE /api/files/{file_id}`

🔑🔑 Admin or manager. Returns `204 No Content`.

Deletes a file asset from both the database and MinIO. For point clouds, deletes all three Potree output files (`metadata.json`, `hierarchy.bin`, `octree.bin`) in addition to the original LAZ/LAS. For images, the thumbnail is also deleted.

**Path parameter**

| Parameter | Description |
|---|---|
| `file_id` | UUID of the file asset to delete |

**Response `204 No Content`** — empty body on success.

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `403` | `Not allowed to delete this file` | Role is `viewer` |
| `404` | `File not found` | No asset with that ID |

---

## 8. AI Analysis

### `POST /api/ai/analyze`

🔓 No auth required (see note).

Sends an image to the Vision API and returns a structured description with Scene, Quality Issues, and Safety Issues sections. Results are cached in-process for the lifetime of the backend container.

> **Note:** This endpoint has no authentication dependency. Access control relies on the frontend only rendering the button for authenticated users. Any client that can reach the backend can call this endpoint directly.

**Request body** (JSON)

```json
{
  "image_url": "https://example.com/panorama.jpg",
  "file_id": "uuid-of-the-file-asset"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `image_url` | `string` | Yes | URL or `data:image/...;base64,...` string |
| `file_id` | `string` | No | UUID of the `FileAsset`. When provided, the backend fetches the image from MinIO and base64-encodes it, so the Vision API never needs to reach private storage. |

**Image resolution logic (in priority order):**

1. `file_id` provided → fetch from MinIO → base64 data URL (cache key: `file:{id}`)
2. `image_url` is already a `data:image/...` URI → use as-is
3. Public HTTPS URL (not `localhost` or private IP) → pass URL directly to Vision API
4. Presigned / localhost URL → backend fetches bytes → base64 data URL (cache key: `fetched:{url}`)

**Response `200 OK`** → [`AnalyzeImageResponse`](#analyzeimageresponse)

```json
{
  "description": "Scene:\nThe image shows...\n\nQuality Issues:\n- ...\n\nSafety Issues:\n- ...",
  "cached": false
}
```

| Field | Type | Description |
|---|---|---|
| `description` | `string` | Multi-line text; `<think>` blocks stripped from Qwen-family models |
| `cached` | `boolean` | `true` if result came from the in-process cache |

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `400` | Error message string | Invalid input (e.g. empty URL) |
| `502` | `AI analysis failed: {detail}` | Vision API unreachable or returned an error |

---

## 9. Reports

All report endpoints require authentication. Reports are **owner-scoped** — a user can only access their own reports. No role (including admin) can access another user's reports through the API.

---

### `POST /api/reports/`

🔑 Any authenticated user.

Creates a report record without a PDF. Use `/api/reports/with-pdf` to attach a PDF in the same request.

**Request body** (JSON) → [`ReportCreateRequest`](#reportcreaterequest)

```json
{
  "file_id": "uuid",
  "ai_description": "Scene:\nThe image shows...",
  "manual_observations": "Concrete formwork incomplete on south wall.",
  "flags": ["safety_issue"],
  "screenshots": []
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `file_id` | `string` | Yes | UUID of the associated `FileAsset` |
| `ai_description` | `string` | No | AI-generated description text |
| `manual_observations` | `string` | No | User's manual notes |
| `flags` | `string[]` | No | Classification tags e.g. `["safety_issue", "quality_issue"]` |
| `screenshots` | `string[]` | No | Base64 or URL screenshot strings |

**Response `200 OK`** → [`ReportResponse`](#reportresponse)

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `404` | `File not found` | No `FileAsset` with `file_id` |

---

### `GET /api/reports/`

🔑 Any authenticated user.

Returns all reports created by the current user, ordered by `created_at` descending.

**Response `200 OK`** → `ReportResponse[]`

---

### `GET /api/reports/{report_id}/pdf`

🔑 Any authenticated user. Supports HTTP Range requests.

Proxies the report PDF from MinIO. Only the report creator can access it.

**Path parameter**

| Parameter | Description |
|---|---|
| `report_id` | Report UUID |

**Response `200 OK` / `206 Partial Content`**

- `Content-Type: application/pdf`
- `Cache-Control: private, max-age=300`

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `403` | `Not allowed to access this report` | Caller is not the creator |
| `404` | `Report not found` | No report with that ID |
| `404` | `Report PDF not available` | Report has no PDF stored |
| `404` | `Report PDF not found in storage` | MinIO object missing |

---

### `DELETE /api/reports/{report_id}`

🔑 Any authenticated user. Returns `204 No Content`.

Deletes a report and its PDF from MinIO. Only the report creator can delete it.

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `403` | `Not allowed to delete this report` | Caller is not the creator |
| `404` | `Report not found` | No report with that ID |

---

### `POST /api/reports/with-pdf`

🔑 Any authenticated user. Multipart form.

Creates a report and uploads the PDF in a single request. This is the endpoint used by viewers when publishing a field observation.

**Form fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | binary | Yes | PDF file (validated by content-type and extension) |
| `file_id` | `string` | Yes | UUID of the associated `FileAsset` |
| `ai_description` | `string` | No | AI-generated description |
| `manual_observations` | `string` | No | Manual notes |
| `flags_json` | `string` | No | JSON-encoded `string[]` e.g. `'["safety_issue"]'` |

PDF is stored at `construction-reports/{user_id}/{report_uuid}.pdf`.

**Response `200 OK`** → [`ReportResponse`](#reportresponse)

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `400` | `Empty file` | Zero-byte PDF |
| `400` | `Expected a PDF file` | File is not a PDF |
| `400` | `flags_json must be a JSON array of strings` | Malformed flags |
| `404` | `File not found` | No `FileAsset` with `file_id` |
| `413` | `File too large` | PDF exceeds `MAX_UPLOAD_SIZE_BYTES` |

---

## 10. Comparison Drafts

Comparison drafts store the state of the side-by-side comparison viewer. Like reports, they are **owner-scoped**.

---

### `GET /api/reports/comparison-drafts`

🔑 Any authenticated user.

Lists all comparison drafts owned by the current user, ordered by `created_at` ascending.

**Response `200 OK`** → `ComparisonDraftResponse[]`

```json
[
  {
    "id": "uuid",
    "file_id": "uuid",
    "label": "room2-20240315-001.jpg vs room2-20240322-001.jpg",
    "manual_observations": null,
    "flags": [],
    "pdf_url": null,
    "created_at": "2024-03-15T10:23:45"
  }
]
```

| Field | Description |
|---|---|
| `label` | Auto-generated from `state_json.left.displayFileName vs state_json.right.displayFileName`; `null` if state is empty |
| `pdf_url` | `/api/reports/comparison-drafts/{id}/pdf` if a PDF has been stored; `null` otherwise |

---

### `POST /api/reports/comparison-drafts`

🔑 Any authenticated user.

Creates a new comparison draft with an initial viewer state snapshot.

**Request body** (JSON) → [`ComparisonDraftCreateRequest`](#comparisondraftcreaterequest)

```json
{
  "file_id": "uuid",
  "manual_observations": "South wall crack visible in both views.",
  "flags": ["quality_issue"],
  "state": {
    "version": 1,
    "left": { "selectedDate": "2024-03-15", "selectedFileId": "uuid", ... },
    "right": { "selectedDate": "2024-03-22", "selectedFileId": "uuid", ... },
    "leftNotes": "", "rightNotes": "", ...
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `file_id` | `string` | Yes | UUID of the primary `FileAsset` (typically left side) |
| `manual_observations` | `string` | No | Free-text observations |
| `flags` | `string[]` | No | Classification tags |
| `state` | `object` | Yes | Full `CompareDraftStateV1` JSON object |

**Response `200 OK`** → [`ComparisonDraftDetailResponse`](#comparisondraftdetailresponse)

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `404` | `File not found` | No `FileAsset` with `file_id` |

---

### `GET /api/reports/comparison-drafts/{draft_id}`

🔑 Any authenticated user.

Returns full detail for one comparison draft, including the `state_json`.

**Response `200 OK`** → [`ComparisonDraftDetailResponse`](#comparisondraftdetailresponse)

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `403` | `Not allowed to access this draft` | Caller is not the creator |
| `404` | `Draft not found` | No draft with that ID |

---

### `PATCH /api/reports/comparison-drafts/{draft_id}`

🔑 Any authenticated user.

Partially updates a comparison draft. All fields are optional; only provided fields are updated.

**Note:** If `state` is updated, any previously stored draft PDF is deleted from MinIO (draft PDFs are considered temporary previews; the canonical PDF is generated at publish time).

**Request body** (JSON) → [`ComparisonDraftUpdateRequest`](#comparisondraftupdaterequest)

```json
{
  "manual_observations": "Updated notes.",
  "flags": ["safety_issue", "quality_issue"],
  "state": { ... }
}
```

| Field | Type | Description |
|---|---|---|
| `file_id` | `string` | Update primary file association |
| `manual_observations` | `string` | Replace observations |
| `flags` | `string[]` | Replace flags |
| `state` | `object` | Replace full state; triggers draft PDF deletion |

**Response `200 OK`** → [`ComparisonDraftDetailResponse`](#comparisondraftdetailresponse)

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `403` | `Not allowed to update this draft` | Caller is not the creator |
| `404` | `Draft not found` | No draft with that ID |
| `404` | `File not found` | Provided `file_id` does not exist |

---

### `DELETE /api/reports/comparison-drafts/{draft_id}`

🔑 Any authenticated user. Returns `204 No Content`.

Deletes a comparison draft and its stored PDF (if any).

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `403` | `Not allowed to delete this draft` | Caller is not the creator |
| `404` | `Draft not found` | No draft with that ID |

---

### `GET /api/reports/comparison-drafts/{draft_id}/pdf`

🔑 Any authenticated user. Supports HTTP Range requests.

Returns the stored draft PDF. Only available after `PATCH` has stored a PDF, or if the comparison viewer has saved a preview. Returns `404` with a descriptive message if no PDF exists yet.

**Response `200 OK`**

- `Content-Type: application/pdf`
- `Cache-Control: private, max-age=300`

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `403` | `Not allowed to access this draft` | Caller is not the creator |
| `404` | `Draft not found` | No draft with that ID |
| `404` | `This draft has no PDF. Open it in Compare to view or edit.` | No PDF stored yet |

---

### `POST /api/reports/comparison-drafts/publish`

🔑 Any authenticated user. Multipart form.

Publishes one or more comparison drafts as a single finalized Report. The caller provides the PDF blob; the specified draft rows are deleted after the report is created.

**Form fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | binary | Yes | PDF blob (must be a valid PDF) |
| `file_id` | `string` | Yes | UUID of the primary `FileAsset` |
| `draft_ids_json` | `string` | Yes | JSON array of draft UUIDs to consolidate e.g. `'["uuid1","uuid2"]'` |
| `manual_observations` | `string` | No | Final observations for the report |
| `flags_json` | `string` | No | JSON array of flag strings |

**Behaviour:**
1. Validates all `draft_ids_json` drafts belong to the current user.
2. Uploads the PDF to `construction-reports/{user_id}/{report_uuid}.pdf`.
3. Inserts a `Report` row.
4. Deletes all listed `ComparisonDraft` rows and their stored PDFs.

**Response `200 OK`** → [`ReportResponse`](#reportresponse)

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `400` | `No comparison drafts selected for publish` | `draft_ids_json` is empty |
| `400` | `Some comparison drafts were not found` | One or more IDs do not exist or do not belong to caller |
| `400` | `Empty file` | Zero-byte PDF |
| `400` | `Expected a PDF file` | Not a PDF |
| `400` | `draft_ids_json must be a JSON array of ids` | Malformed JSON |
| `404` | `File not found` | No `FileAsset` with `file_id` |
| `413` | `File too large` | PDF exceeds `MAX_UPLOAD_SIZE_BYTES` |

---

## 11. Viewer Drafts

Viewer field drafts store the state of a single-viewer field observation (static 360°, interactive 360°, or point cloud). Owner-scoped.

---

### `GET /api/reports/viewer-drafts`

🔑 Any authenticated user.

Lists all viewer drafts owned by the current user, ordered by `created_at` ascending.

**Response `200 OK`** → `ViewerDraftResponse[]`

```json
[
  {
    "id": "uuid",
    "file_id": "uuid",
    "viewer_kind": "static_360",
    "label": "Static: room2-20240315-001.jpg",
    "manual_observations": null,
    "flags": [],
    "created_at": "2024-03-15T10:23:45"
  }
]
```

| Field | Description |
|---|---|
| `viewer_kind` | `static_360` · `static_room` · `interactive_360` · `interactive_room` · `static_pcd` |
| `label` | `"{viewer label}: {displayFileName}"` from `state_json`; falls back to just the viewer label |

---

### `POST /api/reports/viewer-drafts`

🔑 Any authenticated user.

Creates a new viewer draft.

**Request body** (JSON) → [`ViewerDraftCreateRequest`](#viewerdraftcreaterequest)

```json
{
  "file_id": "uuid",
  "viewer_kind": "static_360",
  "manual_observations": "Scaffolding present on east face.",
  "flags": ["quality_issue"],
  "state": {
    "version": 1,
    "viewerKind": "static_360",
    "imageUrl": "/api/files/uuid/content",
    "fileId": "uuid",
    "displayFileName": "room2-20240315-001.jpg",
    "roomLabel": "Room 2",
    "captureDate": "2024-03-15",
    "includeAutoLabeling": true,
    "autoLabelingText": "Scene:\n...",
    "additionalCommentsText": "...",
    "safetyIssue": false,
    "qualityIssue": true,
    "delayed": false
  }
}
```

| Field | Type | Constraints | Required | Description |
|---|---|---|---|---|
| `file_id` | `string` | — | Yes | UUID of the associated `FileAsset` |
| `viewer_kind` | `string` | 1–32 chars | Yes | Viewer type identifier |
| `manual_observations` | `string` | — | No | Free-text observations |
| `flags` | `string[]` | — | No | Classification tags |
| `state` | `object` | — | Yes | Full `ViewerFieldDraftStateV1` JSON |

**Response `200 OK`** → [`ViewerDraftDetailResponse`](#viewerdraftdetailresponse)

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `404` | `File not found` | No `FileAsset` with `file_id` |

---

### `GET /api/reports/viewer-drafts/{draft_id}`

🔑 Any authenticated user.

Returns full detail for one viewer draft, including the `state_json`.

**Response `200 OK`** → [`ViewerDraftDetailResponse`](#viewerdraftdetailresponse)

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `403` | `Not allowed to access this draft` | Caller is not the creator |
| `404` | `Draft not found` | No draft with that ID |

---

### `PATCH /api/reports/viewer-drafts/{draft_id}`

🔑 Any authenticated user.

Partially updates a viewer draft. If `state` is updated, any stored draft PDF is deleted from MinIO.

**Request body** (JSON) → [`ViewerDraftUpdateRequest`](#viewerdraftupdaterequest)

```json
{
  "manual_observations": "Updated comment.",
  "flags": ["safety_issue"],
  "state": { ... }
}
```

| Field | Type | Description |
|---|---|---|
| `file_id` | `string` | Update file association |
| `viewer_kind` | `string` | Update viewer type (max 32 chars) |
| `manual_observations` | `string` | Replace observations |
| `flags` | `string[]` | Replace flags |
| `state` | `object` | Replace full state; triggers draft PDF deletion |

**Response `200 OK`** → [`ViewerDraftDetailResponse`](#viewerdraftdetailresponse)

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `403` | `Not allowed to update this draft` | Caller is not the creator |
| `404` | `Draft not found` | No draft with that ID |
| `404` | `File not found` | Provided `file_id` does not exist |

---

### `DELETE /api/reports/viewer-drafts/{draft_id}`

🔑 Any authenticated user. Returns `204 No Content`.

Deletes a viewer draft and its stored PDF (if any).

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `403` | `Not allowed to delete this draft` | Caller is not the creator |
| `404` | `Draft not found` | No draft with that ID |

---

### `POST /api/reports/viewer-drafts/{draft_id}/publish`

🔑 Any authenticated user. Multipart form.

Publishes a viewer draft as a finalized Report. The draft row is deleted after the report is created.

**Form fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | binary | Yes | PDF blob |
| `file_id` | `string` | Yes | Must match `draft.file_id` |
| `ai_description` | `string` | No | AI-generated description for the report |
| `manual_observations` | `string` | No | Final observations |
| `flags_json` | `string` | No | JSON array of flag strings |

**Behaviour:**
1. Validates `draft.created_by == current_user.id`.
2. Validates `draft.file_id == file_id`.
3. Uploads PDF to `construction-reports/{user_id}/{report_uuid}.pdf`.
4. Inserts a `Report` row.
5. Deletes the `ViewerReportDraft` row and its stored PDF.

**Response `200 OK`** → [`ReportResponse`](#reportresponse)

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `400` | `file_id does not match this draft` | `file_id` mismatch |
| `400` | `Empty file` | Zero-byte PDF |
| `400` | `Expected a PDF file` | Not a PDF |
| `403` | `Not allowed to publish this draft` | Caller is not the creator |
| `404` | `Draft not found` | No draft with that ID |
| `404` | `File not found` | No `FileAsset` with `file_id` |
| `413` | `File too large` | PDF exceeds `MAX_UPLOAD_SIZE_BYTES` |

---

## 12. Annotations

Annotations are lightweight JSON overlays attached to file assets. Both endpoints are fully public — no authentication is required at the API level.

---

### `GET /api/annotations/file/{file_id}`

🔓 No auth required.

Returns all annotations for a given file asset.

**Path parameter**

| Parameter | Description |
|---|---|
| `file_id` | UUID of the `FileAsset` |

**Response `200 OK`** → `AnnotationResponse[]`

```json
[
  {
    "id": "uuid",
    "file_id": "uuid",
    "annotation_type": "marker",
    "data": { "x": 0.35, "y": 0.62, "label": "Crack" },
    "created_at": "2024-03-15T10:23:45"
  }
]
```

---

### `POST /api/annotations/`

🔓 No auth required.

Creates a new annotation on a file asset. The `data` field is a free-form JSON object; its schema is defined by the frontend.

**Request body** (JSON) → [`AnnotationCreateRequest`](#annotationcreaterequest)

```json
{
  "file_id": "uuid",
  "annotation_type": "marker",
  "data": { "x": 0.35, "y": 0.62, "label": "Crack" }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `file_id` | `string` | Yes | UUID of the target `FileAsset` |
| `annotation_type` | `string` | Yes | Arbitrary type identifier e.g. `"marker"`, `"measurement"` |
| `data` | `object` | Yes | Annotation payload (any JSON object) |

**Response `200 OK`** → [`AnnotationResponse`](#annotationresponse)

**Errors**

| Status | Detail | Cause |
|---|---|---|
| `404` | `File not found` | No `FileAsset` with `file_id` |

---

## 13. Common Error Responses

All error responses follow FastAPI's default shape:

```json
{ "detail": "Human-readable error message" }
```

Validation errors (HTTP `422`) return an array:

```json
{
  "detail": [
    {
      "loc": ["body", "username"],
      "msg": "String should have at least 3 characters",
      "type": "string_too_short"
    }
  ]
}
```

### Auth errors that apply to all protected endpoints

| Status | Detail | Cause |
|---|---|---|
| `401` | `Not authenticated` | No `Authorization` header, or scheme is not `Bearer` |
| `401` | `Invalid or expired token` | Token signature invalid or `exp` has passed |
| `401` | `Invalid token` | Token `type` field is not `"access"` |
| `401` | `User not found` | `sub` in token does not match any user row |
| `403` | `Account disabled` | `user.is_active == false` |

---

## 14. Shared Schema Reference

### `TokenResponse`

Returned by `/register` and `/login`.

```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": { ...UserPublic }
}
```

### `UserPublic`

```json
{
  "id": "uuid",
  "username": "alice",
  "email": "alice@example.com",
  "role": "admin"
}
```

`role` is one of `"admin"` · `"manager"` · `"viewer"`.

### `MediaFileResponse`

Used inside all explorer responses.

```json
{
  "id": "uuid",
  "src": "/api/files/uuid/thumbnail",
  "full_src": "/api/files/uuid/content",
  "type": "image",
  "file_name": "room2-20240315-001.jpg",
  "capture_date": "2024-03-15",
  "uploaded_by_user_id": "uuid",
  "conversion_status": null,
  "conversion_error": null
}
```

| Field | Description |
|---|---|
| `src` | Thumbnail URL for images; content URL for everything else; Potree `metadata.json` URL for ready point clouds |
| `full_src` | Always the content or Potree URL (no thumbnail) |
| `conversion_status` | `null` for non-point-clouds; `"pending"` · `"processing"` · `"ready"` · `"failed"` for point clouds |

### `ExplorerDatesSummaryResponse`

```json
{
  "dates": {
    "2024-03-15": { "images": 12, "videos": 2, "pointclouds": 1, "pdfs": 0 }
  }
}
```

### `ExplorerByDateResponse`

```json
{
  "date": "2024-03-15",
  "rooms": {
    "Room 2": {
      "images":      [ ...MediaFileResponse ],
      "videos":      [],
      "pointclouds": [],
      "pdfs":        []
    }
  }
}
```

Room keys are room **names** (display names, not slugs).

### `ExplorerByRoomResponse`

```json
{
  "room": "room2",
  "room_name": "Room 2",
  "dates": {
    "2024-03-15": {
      "images":      [ ...MediaFileResponse ],
      "videos":      [],
      "pointclouds": [],
      "pdfs":        []
    }
  }
}
```

### `UploadResponse`

```json
{
  "id": "uuid",
  "room": "room2",
  "media_type": "image",
  "file_name": "room2-20240315-001.jpg",
  "capture_date": "2024-03-15"
}
```

### `ReportCreateRequest`

```json
{
  "file_id": "uuid",
  "ai_description": "Scene:\n...",
  "manual_observations": "...",
  "flags": ["safety_issue"],
  "screenshots": []
}
```

### `ReportResponse`

```json
{
  "id": "uuid",
  "file_id": "uuid",
  "ai_description": "Scene:\n...",
  "manual_observations": "...",
  "flags": ["safety_issue"],
  "screenshots": [],
  "created_by": "user-uuid",
  "pdf_url": "/api/reports/uuid/pdf",
  "created_at": "2024-03-15T10:23:45"
}
```

`pdf_url` is `null` if no PDF has been stored.

### `ComparisonDraftCreateRequest`

```json
{
  "file_id": "uuid",
  "manual_observations": "...",
  "flags": [],
  "state": { "version": 1, "left": { ... }, "right": { ... }, ... }
}
```

### `ComparisonDraftDetailResponse`

Extends `ComparisonDraftResponse` with `state_json`.

```json
{
  "id": "uuid",
  "file_id": "uuid",
  "label": "img-A vs img-B",
  "manual_observations": "...",
  "flags": [],
  "pdf_url": null,
  "created_at": "2024-03-15T10:23:45",
  "state_json": { "version": 1, ... }
}
```

### `ViewerDraftCreateRequest`

```json
{
  "file_id": "uuid",
  "viewer_kind": "static_360",
  "manual_observations": "...",
  "flags": ["quality_issue"],
  "state": { "version": 1, "viewerKind": "static_360", ... }
}
```

### `ViewerDraftDetailResponse`

Extends `ViewerDraftResponse` with `state_json`.

```json
{
  "id": "uuid",
  "file_id": "uuid",
  "viewer_kind": "static_360",
  "label": "Static: room2-20240315-001.jpg",
  "manual_observations": "...",
  "flags": [],
  "created_at": "2024-03-15T10:23:45",
  "state_json": { "version": 1, ... }
}
```

### `AnnotationCreateRequest`

```json
{
  "file_id": "uuid",
  "annotation_type": "marker",
  "data": { "x": 0.35, "y": 0.62, "label": "Crack" }
}
```

### `AnnotationResponse`

```json
{
  "id": "uuid",
  "file_id": "uuid",
  "annotation_type": "marker",
  "data": { "x": 0.35, "y": 0.62, "label": "Crack" },
  "created_at": "2024-03-15T10:23:45"
}
```
