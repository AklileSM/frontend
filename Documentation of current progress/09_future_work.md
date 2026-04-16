# Future Work

This document covers planned features, active research directions, and known gaps in the current system. It is based on a reading of the full codebase — incomplete components, benchmark scripts, dead code, and architectural constraints that imply next steps.

---

## 1. Robotics integration as a sensing agent

### Current state

All data in the system today is manually captured and uploaded by a human. An admin user photographs or scans a room, saves the files, and uploads them through the browser. The system has no concept of an automated data source.

### What the architecture already supports

The upload pipeline is already a good fit for automated ingestion:
- Uploads are keyed by `room_slug` and `capture_date` — a robot can target the correct bucket without human routing
- The chunked upload endpoint accepts streams, not just browser form posts
- The point cloud pipeline runs headlessly in a background task after upload; it doesn't require a browser session
- MinIO is a generic S3 store — robots can write directly to it if presigned PUT URLs are provisioned

### Planned direction

The natural integration path is a **robot as a sensing agent** that periodically traverses the construction site, captures 360° panoramas and LiDAR scans, and pushes the results into the platform autonomously. The platform becomes the ground truth record of site state over time, populated without manual effort.

Key integration points to build:

- **Machine upload credentials**: A non-admin service account role (or API key) that can upload to specific rooms without having full admin privileges. Currently only `admin` can upload, and there is no concept of a per-room or per-project service identity.
- **Robot-aware metadata**: `metadata_json` already stores `uploaded_by_user_id` and `uploaded_by_username`. This could be extended with structured robot identity fields: `{"source": "robot", "robot_id": "...", "mission_id": "...", "pose": {...}}` alongside the standard uploader fields.
- **Automated LiDAR ingestion**: The current point cloud pipeline accepts LAZ/LAS files. A robot carrying a LiDAR sensor (e.g. Ouster, Velodyne, or a RealSense with depth accumulation) would export to LAZ and trigger the same PotreeConverter background task. No pipeline changes are needed for this path — only the upload credential problem needs solving.
- **SLAM output integration**: If the robot runs an onboard SLAM system (e.g. RTAB-Map, Cartographer, or LIO-SAM), it produces dense point clouds as well as camera pose estimates. Storing the pose data would enable future registration of panoramas to 3D space — letting a viewer click a panorama and see its position in the point cloud.
- **Mission scheduling**: An external scheduler (the robot's task planner) could call the backend to check which rooms have been visited recently (using `GET /api/files/explorer/dates/summary`) and prioritise rooms with stale data.

### What needs to change

- Add a non-browser upload auth path (API key or robot-specific JWT claim)
- Consider a dedicated `POST /api/upload/robot` endpoint that accepts structured robot metadata alongside the file bytes
- Ensure the 600-second PotreeConverter timeout is sufficient for robot-scale point clouds (large SLAM outputs can be 10–50× the size of manual scans)

---

## 2. Data usability assessment before ingestion

### Current state

The system has no quality gate. When a file is uploaded it is immediately written to MinIO and inserted into the database. For point clouds, conversion begins asynchronously. If the file is corrupt, overexposed, or otherwise unusable, it lands in the database and is served to users with no indication of the problem (beyond a conversion failure for invalid LAZ files).

The benchmark scripts (`scripts/benchmark_vision*.py`) show active research into evaluating image quality through the vision model, but this is entirely offline — it runs against images already in storage and produces evaluation metrics to stdout or a JSON file. It is not connected to the ingestion pipeline.

### The problem in practice

- A panorama captured in a dark room or with motion blur is stored and served, but provides no useful information
- A truncated LAZ upload (network failure mid-stream) results in a `failed` conversion status that requires manual cleanup
- There is no signal to the uploader at the time of upload that a file is usable
- The vision model cache (`_cache` in `services/ai.py`) is in-memory only — it is cleared on every backend restart, so quality assessments must be rerun

### Planned direction

**Pre-ingestion assessment** would sit between the file receipt (bytes in memory or temp file) and the MinIO write:

1. **Image quality scoring**: Before inserting a `FileAsset` row, run a lightweight quality check on the image. Minimum thresholds: sharpness (Laplacian variance), brightness (histogram mean), and file size plausibility. Images that fail these checks would be rejected at upload time with a 422 response and a human-readable explanation.

2. **AI-assisted usability check**: A one-shot vision model call with a short prompt ("Is this image usable for construction documentation? Yes/No and why.") before the full three-section analysis. The result could gate whether the image is accepted or flagged as low quality. This is a natural extension of the existing `analyze_image_url` service.

3. **LAZ/LAS validation before conversion**: The PotreeConverter subprocess currently runs unconditionally on whatever bytes were uploaded. A pre-conversion step using a Python LAS library (e.g. `laspy`) to validate the file header, point count, and bounding box would catch corrupt uploads before a 10-minute conversion job begins.

4. **Persistent quality scores**: Add optional fields to `metadata_json` for quality metrics: `{"quality_score": 0.87, "quality_flags": ["underexposed"], "usability_checked_at": "2025-01-15T10:00:00Z"}`. These would be populated asynchronously after ingestion (similar to how `conversion_status` is updated for point clouds) and surfaced in the file explorer.

5. **Uploader feedback loop**: The upload response currently returns only `{id, room, media_type, file_name, capture_date}`. A usability score or warning in the response would let the frontend show an inline warning before the user navigates away.

### What the benchmark scripts reveal

The five benchmark scripts (`benchmark_vision.py`, `benchmark_vision_bert.py`, etc.) show a progression of evaluation approaches:
- ROUGE-L F1 against reference descriptions (lexical similarity)
- BERTScore F1 (semantic similarity via sentence embeddings)
- Self-consistency across multiple runs (does the model give stable answers?)
- Structure validation (do all three required sections appear?)

The most recent version (`benchmark_vision_bert_Updates2.py`) adds `top_p=0.6`, removes `frequency_penalty`, adds an explicit `"Do not show your reasoning"` instruction, and refines each section prompt to distinguish observable facts from inferences. These changes directly address failure modes found during benchmarking, suggesting the vision quality assessment loop is actively being iterated on.

---

## 3. Quantitative progress estimation for indoor trades

### Current state

The AI analysis (`services/ai.py`) produces a three-section qualitative report: SCENE, QUALITY ISSUES, SAFETY ISSUES. All three sections are free-text. The system captures observations ("drywall sheets visible", "workers laying floor tiles") but produces no numbers ("drywall: 40% complete", "floor tiles: 2 of 6 rooms done").

The flags system (`"safety"`, `"quality"`, `"delayed"`) provides a coarse binary signal per report, but no measurement of degree or scope.

### The gap

Construction projects are tracked against schedules. The meaningful question for a project manager is not "what does room 3 look like today?" but "what percentage of trade X is complete across all rooms, and are we on schedule?" The current system cannot answer this. The dashboard charts (`ChartAll`, `ChartLocation`) are hardcoded static data — they do not derive from the actual file collection or from any analysis of site state:

```typescript
// ChartAll.tsx — hardcoded dates and counts, not computed from the database
xaxis: { categories: ['2024-10-07', '2024-10-09', '2024-10-11', '2024-10-14'] },
series: [
  { name: '360 Images', data: [2, 5, 4, 4] },
  { name: 'Point Cloud', data: [2, 1, 1, 2] },
  ...
]
```

This is one of the most visible gaps in the current system.

### Planned direction

**Phase 1 — Live chart data**: Connect the charts to the API. `GET /api/files/explorer/dates/summary` already returns media counts per date. `GET /api/files/explorer/dates` returns all dates with files. The chart components need to call these endpoints instead of rendering static arrays. This is a frontend-only change with no backend work required.

**Phase 2 — Trade detection from panoramas**: Extend the vision model prompt to include a structured progress section alongside SCENE/QUALITY/SAFETY:

```
PROGRESS: For each visible trade, estimate the completion percentage as a number.
List only trades that are directly visible. Use this format:
Drywall: 60%
Floor tiling: 30%
Electrical rough-in: 90%
```

This output would be parsed server-side and stored as structured data — either as additional fields in `report.metadata_json` or as a new `TradeProgress` table keyed by `(file_id, trade_name)`. Over multiple capture dates, progress can be charted per room and per trade.

**Phase 3 — Point cloud volume analysis**: For quantitative progress estimation beyond what the camera can see, point cloud geometry provides ground truth. By comparing the mesh volume of a room's point cloud against a reference (BIM model or first complete scan), percentage of space occupied by structure can be estimated. This requires:
- Registration of successive point clouds to a common coordinate frame (ICP or SLAM-based)
- A reference model or a "done" baseline scan for each room
- A background processing step after each new point cloud lands

**Phase 4 — Schedule deviation alerting**: Once progress percentages are tracked over time, the system can compute rate of change and project completion dates. The existing `"delayed"` flag is manual — with quantitative data it becomes automatic: if the observed progress rate implies a finish date beyond the planned date, the system raises a schedule deviation.

### What already supports this

- The `flags` column on all report types already models a signal-set pattern — adding more flag values or replacing flags with a structured score is a backward-compatible extension
- The `metadata_json` JSON column on `FileAsset` can hold per-file analysis results without a schema migration
- The vision model already runs as an async service call; a richer prompt returning structured sections is technically identical to the current call
- The benchmark infrastructure tests prompt structure compliance — the `REQUIRED_SECTIONS` check could be extended to validate a PROGRESS section

---

## 4. Other gaps and planned improvements

### 4.1 Charts and dashboard

Both chart components have hardcoded data:

- `ChartAll.tsx` — stacked bar chart with dates and file-type counts as static arrays. Should call `GET /api/files/explorer/dates/summary`.
- `ChartLocation.tsx` — per-room bar chart with hardcoded counts per room. Should call `GET /api/files/explorer/room/{slug}` for each room.

Non-A6 Stern projects (`isA6 == false`) show permanent skeleton loaders because these charts have no data source other than the hardcoded A6 Stern arrays. Once charts pull from the API, Project X and Project Y will populate automatically when files are uploaded.

### 4.2 Room 1 has no data

The Room 1 hotspot on the home page floorplan calls `alert('No Data available for Room 1')` on click. This reflects that Room 1 has no captured media in the dataset, not a code-level limitation. The alert should be replaced with a proper empty-state component — or Room 1 should be seeded with data.

### 4.3 Alternative point cloud viewers

Three separate point cloud viewer approaches exist in the codebase:

| Component | Approach | Status |
|---|---|---|
| `StaticPointCloudViewer.tsx` | Potree iframe embed (`/potree/examples/viewer.html`) | Active — used by FileTree, FileExplorer, ProfilePage |
| `PotreeViewer.tsx` | `window.Potree` global with hardcoded path | Used in some contexts; path is hardcoded to `../PCD/potree/metadata.json` |
| `PointCloudViewer.tsx` | React Three Fiber + PLYLoader + WASD controls | Not routed — exists as an unused alternative |
| `Aframe_IntViewer.tsx` | A-Frame GLTF viewer | Routed at `/PCDViewer` but uses fallback path `/path/to/default/model.glb` |
| `DONTUSE_AFrameScene.tsx` | A-Frame with PLY + hardcoded room path | Explicitly marked as deprecated |
| `ComparePCDViewer.tsx` | A-Frame GLTF embed inside Compare view | Functional but uses A-Frame (different from main Potree approach) |

The PLY-based viewers (`PointCloudViewer.tsx`, `DONTUSE_AFrameScene.tsx`) predate the PotreeConverter pipeline and operate on the raw PLY format. Now that uploads go through PotreeConverter to produce octree format, these are orphaned. The A-Frame GLTF viewer (`Aframe_IntViewer.tsx`) operates on GLTF models, which are not produced by the current pipeline.

Planned: standardise on the Potree iframe approach (`StaticPointCloudViewer.tsx`) as the single point cloud rendering path and remove or archive the alternatives.

### 4.4 Measurement tools not wired to viewers

Two measurement tools exist as standalone components (`AngleTool.tsx`, `LengthTool.tsx`) built on Three.js geometry. They implement:
- **`LengthTool`**: Click two points → compute 3D distance → prompt user for a real-world calibration measurement → derive a scale factor for subsequent measurements
- **`AngleTool`**: Click three points → compute the angle between the two resulting vectors

Neither is currently mounted in any viewer. They are intended for the interactive 360° viewer (Three.js sphere) where accurate measurement would require a calibrated scale factor or a georeferenced point cloud. Integration work is needed to connect them to the OrbitControls raycaster and the existing `InteractiveViewer`/`interactiveViewerRoom` report flow.

### 4.5 AI analysis gaps

**In-memory cache only**: `services/ai.py` caches descriptions in a module-level `dict`. The cache is cleared on every backend restart. For the AI analysis to survive restarts, the description should be persisted — either in `report.ai_description` (already exists) or in a new `FileAsset.metadata_json["ai_description"]` field populated once and reused.

**Images only**: The `analyze_image_url` function raises `ValueError("AI vision is only supported for image files")` if `file_id` resolves to anything other than `media_type = "image"`. Video (key frames), panoramas, and even PDF pages are not analysable through the current path.

**No Hyperbolic fallback logic**: `HYPERBOLIC_API_KEY` is wired into the backend but the code makes a single call to `VISION_API_URL`. There is no retry on the local Ollama endpoint, no fallback to Hyperbolic if the local model is down, and no circuit breaker.

**Single prompt**: All images receive the same construction-inspector prompt regardless of room context, capture date, or file type. A prompt that includes the room name and the capture date ("This is a panorama of Room 3 taken on 2024-10-14 …") would give the model useful context for assessing change over time.

### 4.6 Authentication and user management

**No admin UI for roles**: The only way to change a user's role is a direct `UPDATE users SET role = '...'` in the database. An admin-facing user management page (`GET /api/auth/users`, `PATCH /api/auth/users/{id}/role`) does not exist.

**No token refresh**: JWTs are issued with a 7-day expiry (`jwt_expire_minutes = 10080`). There is no refresh endpoint. When a token expires the user is logged out with no automatic renewal. A standard `/api/auth/refresh` endpoint that accepts a valid (non-expired) access token and returns a new one would improve the experience for long sessions.

**No session revocation**: Because the backend validates `user.role` from the database on every request (not from the JWT), a user can be effectively deactivated by setting `is_active = false`. However, `is_active` is never checked in `get_current_user` or any route handler — it is stored but not enforced. Wiring this check would allow immediate session revocation without invalidating the JWT.

### 4.7 Annotation system

Annotations (`/api/annotations/`) are fully public — no authentication is required to create or list them. They have no ownership (`created_by`), no delete endpoint, and no schema validation on the `data` JSON field. Planned:

- Add authentication (currently leaks all annotations to unauthenticated callers)
- Add a `DELETE /api/annotations/{id}` endpoint
- Add `created_by` and soft-delete support
- Define and document the `data` schema for each `annotation_type`

### 4.8 Schema migration tooling

There is no Alembic or equivalent migration framework. All schema changes require either manual `ALTER TABLE` statements (as done for `comparison_drafts.state_json`) or `create_all` for new tables. As the schema grows, the absence of versioned migrations becomes a maintenance risk. Adopting Alembic would make production deploys safer and would document schema history.

### 4.9 Point cloud coordinate hardcode

`PotreeViewer.tsx` uses the hardcoded path `../PCD/potree/metadata.json` regardless of which file is being viewed. This works only when the viewer is accessed from a specific URL context that makes this relative path resolve to the right MinIO-proxied object. The path should be derived from `FileAsset.metadata_json["potree_base_object"]` and passed as a prop, as `StaticPointCloudViewer.tsx` already does correctly via the route state.
