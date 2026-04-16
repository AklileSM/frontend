# A6 Stern — Frontend Developer Guide

> A comprehensive reference for the React/TypeScript frontend. Covers every page, component, and data-flow pattern. Last updated: 2026-04-14.

---

## Table of Contents

1. [Tech Stack and Entry Points](#1-tech-stack-and-entry-points)
2. [Page Structure and Routing](#2-page-structure-and-routing)
3. [App Shell — DefaultLayout](#3-app-shell--defaultlayout)
4. [State Management and Providers](#4-state-management-and-providers)
5. [API Client](#5-api-client)
6. [The Sidebar](#6-the-sidebar)
7. [The Header](#7-the-header)
8. [The Calendar and Date Selection](#8-the-calendar-and-date-selection)
9. [The File Explorer](#9-the-file-explorer)
10. [The FileTree (Sidebar Navigation)](#10-the-filetree-sidebar-navigation)
11. [Viewers — Overview and Common Pattern](#11-viewers--overview-and-common-pattern)
12. [StaticViewer — 360° Still Panorama](#12-staticviewer--360-still-panorama)
13. [InteractiveViewer — 3D Panorama (Three.js)](#13-interactiveviewer--3d-panorama-threejs)
14. [StaticPointCloudViewer — Point Cloud (Iframe)](#14-staticpointcloudviewer--point-cloud-iframe)
15. [PotreeViewer — Native Point Cloud](#15-potreeviewer--native-point-cloud)
16. [ComparePage — Side-by-Side Comparison](#16-comparepage--side-by-side-comparison)
17. [Reports, Drafts, and PDF Generation](#17-reports-drafts-and-pdf-generation)
18. [HomePage — Interactive Floorplan](#18-homepage--interactive-floorplan)
19. [Authentication Pages](#19-authentication-pages)
20. [Utility Modules](#20-utility-modules)
21. [Adding a New Page or Feature](#21-adding-a-new-page-or-feature)

---

## 1. Tech Stack and Entry Points

| Layer | Library | Version |
|---|---|---|
| UI framework | React | 18.2 |
| Language | TypeScript | 5.7 |
| Build tool | Vite | 4.4 |
| Routing | React Router DOM | 6.14 |
| Styling | Tailwind CSS | 3.4 |
| Global state | React Context + hooks | — |
| 3D (panoramas) | Three.js + @react-three/fiber + @react-three/drei | 0.170 |
| 360° / WebXR | A-Frame + A-Frame Extras | 1.6 |
| Point cloud | Potree (bundled in `public/potree/`) | — |
| PDF generation | jsPDF | 2.5 |
| PDF viewing | @react-pdf-viewer/core + pdfjs-dist | 3.12 |
| Notifications | react-hot-toast | 2.4 |
| Icons | react-icons | 4.10 |
| Date picker | Flatpickr | 4.6 |

### Entry points

**`frontend/src/main.tsx`**  
React root. Wraps the whole app in `<BrowserRouter>` and calls `ReactDOM.createRoot`. Nothing else lives here — no providers, no global config.

**`frontend/src/App.tsx`**  
All routing and top-level providers. See [Section 2](#2-page-structure-and-routing).

---

## 2. Page Structure and Routing

`App.tsx` defines three routing zones:

```
<AuthProvider>                    ← auth state for the whole app
  <SelectedDateProvider>          ← per-project selected date
    Public routes (no layout)
      /login  /register  /unauthorized

    Protected routes (all wrapped in <ProtectedRoute>)
      /                           ← HomePage  (full-screen, no sidebar)

      DefaultLayout (sidebar + header)
        /A6_Stern                 ← FileExplorer filtered to a6-stern
        /projectx                 ← FileExplorer filtered to projectx
        /projecty                 ← FileExplorer filtered to projecty
        /RoomExplorer             ← RoomFileViewer (date-oriented, A6 only)
        /staticViewer             ← Static 360° panorama
        /staticViewerRoom         ← Static 360° with room context
        /interactiveViewer        ← Three.js 360° panorama
        /interactiveViewerRoom    ← Three.js 360° with measurement tools
        /staticPointCloudViewer   ← Potree iframe wrapper
        /PCDViewer                ← A-Frame point cloud
        /Potree                   ← Native Potree viewer
        /Compare                  ← Side-by-side comparison
        /profile                  ← Reports + drafts list
        /pdfViewer                ← In-app PDF reader
  </SelectedDateProvider>
</AuthProvider>
```

**`ProtectedRoute`** (`components/Auth/ProtectedRoute.tsx`) guards every app route:
- Not authenticated → redirect to `/login` (preserves `location.state.from` for post-login redirect)
- Role not in `roles` prop → redirect to `/unauthorized`
- Currently **no route passes a `roles` prop** — protection is authentication-only

**Two layouts:**
- **`HomePage`** renders its own `HomeHeader` and takes the full screen. It deliberately bypasses `DefaultLayout`.
- **All other app routes** are wrapped in `DefaultLayout` which renders `Sidebar` + `Header` + `<main>`.

---

## 3. App Shell — DefaultLayout

**`frontend/src/layout/DefaultLayout.tsx`**

```tsx
const DefaultLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);  // collapsed by default
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className={`flex-1 transition-[margin-left] ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Header />
        <main>{children}</main>
      </div>
    </div>
  );
};
```

**Key details:**
- `sidebarOpen` is local state — it never persists. The sidebar starts collapsed on every page load.
- The `margin-left` on the content area transitions between `ml-16` (rail-only) and `ml-64` (full sidebar), matching the sidebar's `w-16` / `w-64` width classes.
- The same `cubic-bezier(0.22,1,0.36,1)` easing applies to both the sidebar width and the content margin, so they move in sync.
- `children` is rendered inside `mx-auto p-4 md:p-6 2xl:p-10` — a centred, padded container.

---

## 4. State Management and Providers

The app uses **React Context** for global state. There is no Redux or Zustand store — all component-level state is plain `useState`.

### AuthProvider (`context/AuthContext.tsx`)

Wraps the entire app. Exposes:

```typescript
type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login(params: { username, password, remember? }): Promise<void>;
  register(params: { username, password, email?, remember? }): Promise<void>;
  logout(): void;
};
```

**On mount:** calls `GET /api/auth/me` to re-validate any stored session. On success, refreshes the user object in state and in `localStorage` (role may have changed since last login). On failure, clears the session and treats the user as logged out.

**`useAuth()`** — call this hook in any component that needs the current user or auth actions.

### SelectedDateProvider (`components/selectedDate .tsx`)

Manages the selected calendar date independently per project scope. This is how the sidebar calendar and the file explorer stay in sync without prop drilling.

```typescript
type SelectedDateContextProps = {
  selectedDate: string | null;          // shorthand for scope 'a6-stern'
  setSelectedDate(date: string | null): void;
  getDateForScope(scope: string): string | null;
  setDateForScope(scope: string, date: string | null): void;
};
```

**Storage:** Each date is persisted to `localStorage` under `a6.explorerDate.{scope}`. The provider initialises by reading all matching keys on mount, so the selected date survives page reload.

**Scope values** match `filterProjectSlug` in `FileExplorer`: `'a6-stern'`, `'projectx'`, `'projecty'`.

**`useSelectedDate()`** — call this hook in any component that needs to read or set the date.

### Custom hooks

**`hooks/useColorMode.tsx`**  
Toggles light/dark theme. Reads `localStorage['color-theme']` on mount and applies a `dark` class to `document.body`. Exposes `[colorMode, setColorMode]`.

**`hooks/useLocalStorage.tsx`**  
Generic `useState` wrapper backed by `localStorage`. Takes a key and initial value; serialises/deserialises JSON automatically.

**`hooks/useCaptureDatesSummary.ts`**  
Fetches the dates-summary endpoint once on mount. Returns `{ dataByDate: Record<string, DateMediaCounts>, loading, error }`. Uses a `cancelled` flag to prevent stale state on unmount.

---

## 5. API Client

**`services/apiClient.ts`** — single file, ~820 lines, exports every API call the frontend makes.

### Base request

```typescript
const API_BASE = process.env.VITE_API_URL || '/api';

async function apiFetch(path: string, init?: RequestInit, withAuth = true): Promise<Response> {
  const token = getAccessToken();           // reads ephemeral first, then localStorage
  if (withAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // error parsing: extracts detail.msg[] or detail string from FastAPI responses
}
```

In development, Vite proxies `/api` to `http://localhost:3001`, so `API_BASE` defaults work for both dev and production.

### Key function groups

| Group | Functions |
|---|---|
| Auth | `apiLogin`, `apiRegister`, `apiFetchCurrentUser` |
| Projects / Rooms | `listProjects`, `listRooms` |
| Explorer | `getExplorerByDate`, `getExplorerByRoom`, `getExplorerDatesSummary` |
| Uploads | `uploadSingleFile` (wraps direct and chunked paths) |
| File ops | `deleteFileAsset`, `getConversionStatus` |
| AI | `analyzeImage` |
| Reports | `createReportWithPdf`, `listReports`, `deleteReport` |
| Viewer drafts | `createViewerFieldDraft`, `getViewerFieldDraft`, `updateViewerFieldDraft`, `deleteViewerFieldDraft`, `publishViewerFieldDraft` |
| Comparison drafts | `createComparisonDraft`, `getComparisonDraft`, `updateComparisonDraft`, `deleteComparisonDraft`, `publishComparisonDrafts`, `listComparisonDrafts` |

### Key TypeScript types

```typescript
type ApiMediaFile = {
  id: string;
  src: string;              // thumbnail URL for images, content URL for others
  full_src?: string;        // full-resolution URL
  type: 'image' | 'video' | 'pointcloud' | 'pdf';
  file_name: string;
  capture_date: string;     // YYYY-MM-DD
  uploaded_by_user_id?: string;
  conversion_status?: string;    // 'pending' | 'processing' | 'ready' | 'failed'
  conversion_error?: string;
};

type ApiRoomMediaGroup = {
  images: ApiMediaFile[];
  videos: ApiMediaFile[];
  pointclouds: ApiMediaFile[];
  pdfs: ApiMediaFile[];
};

type ExplorerByDateResponse = {
  date: string;
  rooms: Record<string, ApiRoomMediaGroup>;   // keyed by room *name* (not slug)
};
```

### Upload paths

`uploadSingleFile` chooses the upload strategy automatically:

```
Point cloud file
  → try POST /upload/pointcloud/direct-init
      → browser XHR PUT to presigned MinIO URL (no backend buffering)
      → POST /upload/pointcloud/direct-complete
  → on any error, fall back to chunked:
      → POST /upload/pointcloud/init
      → POST /upload/pointcloud/chunk  ×N  (64 MB chunks, 5 concurrent workers, 3 retries each)
      → POST /upload/pointcloud/complete

Any other file
  → POST /upload/single  (multipart)
```

The `onProgress` callback receives 0–100 and drives the progress bar in `FileExplorer`.

---

## 6. The Sidebar

**`components/Sidebar/index.tsx`**

The sidebar is a fixed `<aside>` that collapses to a 16-px icon rail or expands to a 256-px panel. The toggle button (hamburger ↔ X) always stays visible in the rail.

### Width and animation

```
collapsed:  w-16  (toggle button only; content hidden)
expanded:   w-64  (toggle + logo + nav + FileTree + Calendar)

transition: width 300ms cubic-bezier(0.22,1,0.36,1)
```

Content inside uses a separate `opacity + translateX` transition with a 100 ms delay so it fades in *after* the panel has started opening, avoiding a flash of text in the narrow column.

Heavy content (FileTree, Calendar) is mounted lazily: `heavyContentMounted` flips to `true` the first time the sidebar is opened, then never resets. This avoids the API calls for `listRooms` until the user actually opens the sidebar.

### Project navigation

On mount, `listProjects()` is called; its result is merged with `FALLBACK_PROJECT_NAV` via `mergeProjectNav()`. The fallback ensures navigation works even if the API is slow.

Three projects are rendered in fixed order: **Project X → Project Y → A6 Stern**.

Each project is a collapsible accordion (`openBySlug` state). When A6 Stern is expanded, it renders the full `<FileTree>`. Project X and Y show a placeholder "No rooms or files yet."

The sidebar auto-expands the relevant project accordion when the current route matches a project path (tracked in a `useEffect` on `pathname`).

### Calendar

A `<Calendar>` component sits pinned to the bottom of the sidebar (below the project nav). It is only mounted after the sidebar has been opened at least once.

---

## 7. The Header

**`components/Header/index.tsx`**

The header is sticky (`sticky top-0 z-9999`) and contains:

1. **Home link** — navigates to `/`
2. **Project switcher dropdown** — shows current project name; click opens a listbox of all projects fetched from the API. Selecting a project navigates to its route (A6 Stern navigates to `/RoomExplorer` with the last-used room slug from `readStoredA6Room()`).
3. **Compare / Home button** — when on any page other than `/Compare`, shows "Compare" and navigates there. When *on* `/Compare`, shows "Home" — but first opens a confirmation modal warning that unpublished reports will be lost.
4. **`HeaderProfileMenu`** — user avatar + dropdown with profile link and logout.

The project switcher uses `projectPathForPathname(pathname)` to determine which project is currently active and highlights it with a filled dot and a checkmark.

---

## 8. The Calendar and Date Selection

There are two calendar instances:

| Location | Component | Purpose |
|---|---|---|
| Sidebar bottom | `pages/Calendar.tsx` | Browse any date, sets the selected date for the active scope |
| HomePage right panel | `pages/HomeCalendar.tsx` | Same functionality, embedded in the home page layout |

Both calendars read and write through `useSelectedDate()`. When a user picks a date, `setDateForScope(scope, date)` fires, which:
1. Updates the in-memory `datesByScope` map in `SelectedDateProvider`
2. Persists the value to `localStorage` as `a6.explorerDate.{scope}`

`FileExplorer` calls `getDateForScope(filterProjectSlug)` on every render to get the currently selected date and passes it to `getExplorerByDate()`.

The result: clicking a day in the sidebar calendar immediately updates the file explorer in the main content area, with no prop drilling required.

### CalendarMonthYearControls

**`components/CalendarMonthYearControls.tsx`**

A compact month/year selector used inside calendars. Click the month label to open a 3×4 grid popover of months; click the year label to open a 4-column year grid. Year navigation arrows scroll the visible range. Props:

```typescript
{
  currentDate: Date;
  onCurrentDateChange: (next: Date) => void;
  variant?: string;
}
```

---

## 9. The File Explorer

**`pages/Dashboard/FileExplorer.tsx`**

The primary media browsing interface. Used for all three project routes with a `filterProjectSlug` prop.

### Props

```typescript
type FileExplorerProps = {
  filterProjectSlug?: string;   // 'a6-stern' | 'projectx' | 'projecty'
  projectLabel?: string;        // Label for breadcrumb
};
```

### State

| State | Type | Purpose |
|---|---|---|
| `selectedDate` | `string \| null` | From `SelectedDateContext`, drives the API query |
| `roomsForDate` | `Record<string, ApiRoomMediaGroup>` | Media grouped by room name for the current date |
| `activeTab` | `'images' \| 'videos' \| 'pointclouds' \| 'pdfs'` | Which media type is displayed |
| `collapsedRooms` | `Record<string, boolean>` | Which room sections are collapsed |
| `hiddenRooms` | `Set<string>` | Which rooms are hidden by the checkbox filter |
| `roomOptions` | `ApiRoom[]` | Available rooms for the upload form |
| `uploading` + `uploadProgress` | `boolean + number \| null` | Upload progress bar state |
| `filePendingDelete` | `ApiMediaFile \| null` | File awaiting delete confirmation |

### Data loading

```
useEffect on [selectedDate, refreshKey]
  → if no selectedDate: clear roomsForDate
  → else: getExplorerByDate(selectedDate)
       → populate roomsForDate
       → setLoading(false)
```

`refreshKey` is a counter incremented after a successful upload or delete, which re-runs the effect without changing the date.

### Upload flow

1. Admin-only: `canUpload = user?.role === 'admin'` — the upload form is not rendered for other roles.
2. User picks a file, selects a room, selects the media type (auto-detected from file extension), confirms the date (uses `selectedDate`).
3. `uploadSingleFile(file, roomSlug, mediaType, captureDate, onProgress)` is called.
4. On completion: `setRefreshKey(k => k + 1)` re-fetches the current date.

### Room filter (CheckboxDropdown)

The `CheckboxDropdown` component above the grid lets users show/hide individual rooms. State is held in `hiddenRooms` (a `Set<string>`). The "Select all" / "Clear all" shortcuts toggle the entire set.

### Thumbnail click → viewer navigation

```typescript
// Images
navigate('/staticViewer', {
  state: { imageUrl: file.full_src, fileId: file.id, displayFileName: file.file_name,
           roomLabel: room, captureDate: selectedDate }
});

// Point clouds (conversion_status === 'ready')
navigate('/staticPointCloudViewer', {
  state: { modelUrl: file.full_src, fileId: file.id, ... }
});

// PDFs
navigate('/pdfViewer', { state: { pdfUrl: file.full_src, title: file.file_name } });

// Videos
window.open(file.full_src, '_blank', 'noopener,noreferrer');
```

All state is passed via React Router's `location.state`. Viewer components read this on mount.

### RoomFileViewer (date-oriented variant)

**`pages/RoomFileViewer.tsx`** is an alternate explorer for the `/RoomExplorer` route. Instead of grouping by room for a single date, it groups by **date** for a single room. The room is read from `location.state.room` or falls back to `readStoredA6Room()` (localStorage). Switching rooms updates `writeStoredA6Room()` so the next navigation preserves the choice.

---

## 10. The FileTree (Sidebar Navigation)

**`components/FileTree.tsx`**

A hierarchical tree in the sidebar that shows all A6-Stern content:

```
Room 1  ▼                (click name → /RoomExplorer?room=room1)
  2024-03-15  ▼
    Images  ▼
      room1-20240315-001.jpg   (click → /staticViewer)
      room1-20240315-002.jpg
    PDFs  ▼
      room1-20240315-001.pdf   (click → /pdfViewer)
Room 2  ▶
...
```

### Data loading

On mount, `listRooms()` fetches all rooms, then `getExplorerByRoom(slug)` is called in parallel for each room. The results are stored as `RoomTreeEntry[]`:

```typescript
type RoomTreeEntry = {
  slug: string;
  name: string;
  dates: Record<string, ApiRoomMediaGroup>;
};
```

### Expand/collapse

`fileTreeOpen` is a flat `Record<string, boolean>` keyed by node identifiers:

| Key pattern | Node type |
|---|---|
| `"Room 2"` | Room level |
| `"Room 2-2024-03-15"` | Date level |
| `"Room 2-2024-03-15-images"` | Media type level |

Clicking the chevron icon calls `toggleNode(key)`. Files are leaf nodes — clicking them calls `openMedia()` which navigates to the appropriate viewer.

### Lazy mounting

`FileTree` is only mounted when `heavyContentMounted` is `true` in the Sidebar. Until the sidebar is opened for the first time, `FileTree` does not exist in the DOM and makes no API calls.

---

## 11. Viewers — Overview and Common Pattern

All six viewer components follow the same lifecycle:

```
1. Read route state:
   const navState = (location.state || {}) as ViewerState;
   const [ctx, setCtx] = useState(() => ({ ...navState }));

2. Check for draft in URL:
   const [searchParams] = useSearchParams();
   const draftId = searchParams.get('draft');
   if (draftId) → load draft → restore ctx from state_json

3. Display media (image/model/iframe)

4. User fills observations/notes/flags

5. Save draft:
   editingDraftId ? updateViewerFieldDraft(...) : createViewerFieldDraft(...)
   → update URL: setSearchParams({ draft: id })

6. Publish:
   buildFieldObservationPdf(input)   → PDF blob
   publishViewerFieldDraft(draftId, pdfBlob, ...)
   OR
   createReportWithPdf(pdfBlob, ...)
   → navigate to /profile on success
```

**Viewer kinds** registered in `state_json`:

| Route | `viewer_kind` value |
|---|---|
| `/staticViewer` | `static_360` |
| `/staticViewerRoom` | `static_room` |
| `/interactiveViewer` | `interactive_360` |
| `/interactiveViewerRoom` | `interactive_room` |
| `/staticPointCloudViewer` | `static_pcd` |

---

## 12. StaticViewer — 360° Still Panorama

**`components/StaticViewer.tsx`**

Displays a 360° equirectangular image as a plain `<img>` with the full width of the container. There is no 3D navigation — the user sees the whole panorama at once (suitable for large-format construction site images).

### Route state received

```typescript
type StaticViewerState = {
  imageUrl?: string;
  fileId?: string;
  displayFileName?: string;
  roomLabel?: string;
  captureDate?: string;     // YYYY-MM-DD
};
```

### AI auto-labeling

The "Auto-label" button calls `fetchImageDescription(imageUrl, fileId)` from `services/imageDescriptionLogic.ts`, which in turn calls `analyzeImage(imageUrl, fileId)` from `apiClient.ts`. The result (a multi-line text with Scene / Quality Issues / Safety Issues sections) is inserted into `autoLabelingText`.

The `autoLabelingText` and `additionalCommentsText` fields are cleaned by `formatTextForTextarea()` before display — it strips markdown fences, collapses excessive blank lines, and trims whitespace.

### Publish modal

When the user clicks Publish, a modal opens with:
- Checkboxes: "Include auto-labeling" and "Include additional comments"
- Classification flags: Safety Issue, Quality Issue, Delayed
- A preview of what will appear in the PDF

On confirm:
1. `buildFieldObservationPdf(input)` generates a `Blob`
2. If an `editingDraftId` exists: `publishViewerFieldDraft(draftId, pdfBlob, ...)`  
   Otherwise: `createReportWithPdf(pdfBlob, ...)`
3. On success: navigate to `/profile`

**`staticViewerRoom.tsx`** is identical but uses `viewer_kind: 'static_room'` and navigates back to `/RoomExplorer` with the room slug.

---

## 13. InteractiveViewer — 3D Panorama (Three.js)

**`components/InteractiveViewer.tsx`**

Renders the panorama inside a `<Canvas>` (react-three-fiber). The image is mapped as a texture onto the *inside* of a large sphere (`BackSide` material), placing the camera at the centre.

### Three.js setup

```typescript
// PanoramicSphere sub-component
const texture = useLoader(TextureLoader, imageUrl);
texture.anisotropy = gl.capabilities.getMaxAnisotropy();  // maximum quality

return (
  <mesh>
    <sphereGeometry args={[500, 60, 40]} />      // 500-unit radius sphere
    <meshBasicMaterial map={texture} side={BackSide} />
  </mesh>
);
```

`OrbitControls` (from `@react-three/drei`) handles mouse/touch pan and zoom. The camera starts at the origin looking outward.

### Screenshots

`ScreenshotHelper` is a zero-render component inside the `<Canvas>` that captures the `WebGLRenderer`, `Scene`, and `Camera` refs via `useThree`. When the user clicks the screenshot button:

```typescript
gl.render(scene, camera);
const dataUrl = gl.domElement.toDataURL('image/png');
setCapturedScreenshots(prev => [...prev, dataUrl]);
```

Screenshots are attached to the draft state and included as annexes in the generated PDF.

### Measurement tools (InteractiveViewerRoom only)

`interactiveViewerRoom.tsx` extends the base interactive viewer with four overlay tools rendered as Three.js objects on top of the sphere:

| Tool | Component | What it does |
|---|---|---|
| Marker | `MarkerTool.tsx` | Places a labelled dot at a clicked point |
| Length | `LengthTool.tsx` | Draws a line between two points, displays distance |
| Area | `AreaTool.tsx` | Draws a closed polygon, calculates 2D area |
| Angle | `AngleTool.tsx` | Measures the angle between three points |

These tools use `three.meshline` for line rendering and are included in screenshots.

---

## 14. StaticPointCloudViewer — Point Cloud (Iframe)

**`components/StaticPointCloudViewer.tsx`**

Embeds the Potree viewer as an `<iframe>` pointing to the bundled Potree HTML page:

```typescript
const iframeSrc = `/potree/examples/viewer.html?url=${encodeURIComponent(modelUrl)}`;
// modelUrl is typically: /api/files/{id}/pointcloud/metadata.json
```

The Potree page loads inside the iframe and fetches the three binary files (`metadata.json`, `hierarchy.bin`, `octree.bin`) from the backend via the same `/api/files/{id}/pointcloud/` proxy. Range requests flow through Nginx with buffering disabled.

### Fullscreen

A custom fullscreen button calls `viewerRef.current.requestFullscreen()`. The iframe expands to fill the screen; `document.exitFullscreen()` on button re-press returns to normal.

### Draft / publish

Same pattern as StaticViewer. `viewer_kind` is `'static_pcd'`. The PDF is generated without a screenshot (no canvas access from inside the iframe); notes are included as plain text.

---

## 15. PotreeViewer — Native Point Cloud

**`components/PotreeViewer.tsx`**

A simpler, non-draft viewer that loads Potree as a global `window.Potree` object (script tags in `index.html`) and creates a viewer directly in a DOM div:

```typescript
useEffect(() => {
  const Potree = (window as any).Potree;
  const viewer = new Potree.Viewer(document.getElementById('potree_render_area'));

  viewer.setEDLEnabled(false);     // no Eye-Dome Lighting
  viewer.setFOV(60);
  viewer.setPointBudget(10_000_000);
  viewer.setBackground('gradient');
  viewer.loadGUI(() => {
    viewer.setLanguage('en');
    viewer.toggleSidebar();        // show tools panel
  });

  Potree.loadPointCloud('../PCD/potree/metadata.json', 'sigeom.sa', (e) => {
    const pointcloud = e.pointcloud;
    pointcloud.material.size = 1;
    pointcloud.material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
    scene.addPointCloud(pointcloud);
    viewer.fitToScreen();
  });

  return () => {
    // cleanup: remove all children of render area
  };
}, []);
```

This viewer loads a **static, hardcoded** path (`../PCD/potree/metadata.json`). It is used for demo/legacy data in the `public/PCD/` directory, not for dynamically uploaded point clouds. For uploaded assets, use `StaticPointCloudViewer`.

---

## 16. ComparePage — Side-by-Side Comparison

**`components/Compare/ComparePage.tsx`**

The most complex page in the application. It renders two independent viewer instances side by side, with shared draft management.

### Left / Right panes

Each pane contains:
1. A `<CompareCalendar>` to select the capture date for that side
2. A `<CompareFileExplorer>` to pick a file on that date
3. A viewer instance (`<Compare360Viewer>` or `<ComparePCDViewer>`) once a file is selected

File selection determines the viewer type: images get the 360° viewer, point clouds get the PCD viewer.

### Camera sync

A "Sync cameras" toggle sets `cameraSyncEnabled`. When enabled, camera state changes from one viewer are pushed to the other, so both viewers pan/zoom together.

### Draft management

Each pair of selections (left file + right file + notes + flags) is saved as a `ComparisonDraft` via `createComparisonDraft()`. The `state_json` field stores the full `CompareDraftStateV1` object:

```typescript
type CompareDraftStateV1 = {
  version: 1;
  left: { selectedDate, selectedFile, selectedFileId, viewerMeta, ... } | null;
  right: { ... } | null;
  leftNotes: string;
  rightNotes: string;
  leftAnnex: { images: string[], text: string };
  rightAnnex: { images: string[], text: string };
  leftFlags: { safety, quality, delayed };
  rightFlags: { safety, quality, delayed };
};
```

Multiple drafts can accumulate. The "Publish" flow lets the user select which drafts to consolidate into a single PDF report via `publishComparisonDrafts(pdfBlob, draftIds, ...)`.

### PDF generation

`buildCompareDraftPdfBlob(state, ctx)` from `utils/compareDraftPdfFromState.ts` generates a side-by-side layout PDF. Each side gets its own section with observations, flags, and screenshot annexes.

---

## 17. Reports, Drafts, and PDF Generation

### Draft state versioning

Both viewer draft and comparison draft state objects carry a `version: 1` field. `isViewerFieldDraftStateV1()` in `utils/viewerFieldDraftState.ts` type-guards the loaded JSON, allowing future schema migrations without breaking existing drafts.

### PDF generation (`utils/engineeringReportPdf.ts`)

Uses `jsPDF` to produce PDF documents. The generated reports are structured as engineering field observation reports:

```
Report reference: FOR-YYYYMMDD-HHMMSS
─────────────────────────────────────
Header (company name, date, reference)
Purpose of inspection
Reference record (file name, room, capture date)
Visual assessment (AI auto-labeling if included)
Engineer's comments (manual observations)
Classification (Safety ✓, Quality ✓, Schedule impact ✓)
Limitations / disclaimers
Appendix A: Screenshot (if included)
```

`fieldObservationReportReference(date)` generates the reference string from the current timestamp.

`buildComparisonFieldObservationPdf(input)` produces the same layout but with two parallel columns.

### Publish flow (all viewers)

```
User clicks Publish
  → modal opens (confirmation + options)
  → user confirms

  if draft exists (editingDraftId):
    publishViewerFieldDraft(draftId, pdfBlob, fileId, ...)
      → API uploads PDF to MinIO
      → creates Report record
      → deletes draft
  else:
    createReportWithPdf(pdfBlob, fileId, ...)
      → API uploads PDF to MinIO
      → creates Report record (no draft to delete)

  → navigate('/profile')
```

### ProfilePage

Lists the user's published reports and unpublished drafts. Reports show a download link to `/api/reports/{id}/pdf`. Drafts show a "Continue editing" link that navigates back to the appropriate viewer with `?draft={id}` in the URL.

---

## 18. HomePage — Interactive Floorplan

**`pages/HomePage.tsx`**

Full-screen page (no sidebar/header) with two columns:

**Left (2/3 width):** The floorplan image (`/Images/floorplan.jpg`) with six invisible `<div>` hotspots positioned absolutely over each room. Hotspot positions are hard-coded as percentage-based `top`/`left`/`width`/`height` CSS values calibrated to the floorplan image.

| Room | Behaviour |
|---|---|
| Room 1 | `onClick` → `alert('No Data available for Room 1')` (disabled) |
| Rooms 2–6 | `onClick` → `navigate('/RoomExplorer', { state: { room } })` |

On hover, `hoveredRoom` state updates, which is passed to `ChartLocation` in the right column to highlight that room's data.

Project X and Y show `<FloorplanPlaceholder>` instead of the floorplan.

**Right (1/3 width):** A stacked card with:
1. `<ChartAll>` — summary chart of all capture data
2. A tab bar switching between `<ChartLocation hoveredRoom={...}>` (room-by-room breakdown) and `<HomeCalendar>` (date selector)

**Skeleton loaders:** When a non-A6 project is selected, the right column shows `<ChartSkeleton>` and `<CalendarSkeleton>` animated placeholders rather than real data.

---

## 19. Authentication Pages

### Login (`pages/Auth/Login.tsx`)

Fields: `username`, `password`, `remember` checkbox. On submit calls `auth.login()`. On success, checks `location.state.from` and navigates there if set (the `ProtectedRoute` saves the attempted URL before redirecting to login).

### Register (`pages/Auth/Register.tsx`)

Fields: `username` (3–64 chars, `[a-zA-Z0-9._-]`), `email` (optional), `password` (8+ chars), `remember` checkbox. On submit calls `auth.register()`. Notes in the UI explain that the first registration becomes admin.

### Unauthorized (`pages/Auth/Unauthorized.tsx`)

Simple message page with a "Go to dashboard" button. Rendered when `ProtectedRoute` finds a role mismatch.

### PdfViewerPage (`pages/PdfViewerPage.tsx`)

Reads `pdfUrl` and `title` from `location.state`. Uses `@react-pdf-viewer/core` with the `defaultLayoutPlugin` (zoom, search, thumbnails, print). Passes an `Authorization: Bearer` header via the viewer's `httpHeaders` option so the backend's auth check on report PDFs is satisfied.

---

## 20. Utility Modules

### `config/projectNav.ts`

Defines `FALLBACK_PROJECT_NAV` (the three hard-coded projects with their slugs and route paths). `mergeProjectNav(apiProjects)` overlays API-returned names onto the fallback — so project names can be customised in the database without a frontend rebuild.

`projectPathForPathname(pathname)` maps any current URL back to its project path for the header dropdown's "currently selected" state.

### `utils/imageViewerMeta.ts`

- `stripQueryLastPathSegment(ref)` — extracts just the filename from a URL, stripping query strings
- `extractDateFromImageRef(ref)` — finds the first `YYYY-MM-DD` or `YYYYMMDD` segment in a path string; used to populate `captureDate` when it is not passed through route state

### `utils/a6RoomPreferences.ts`

- `readStoredA6Room()` — reads `localStorage['a6.lastRoom']`, defaults to `'room1'`
- `writeStoredA6Room(slug)` — persists the currently viewed room
- `normalizeRoomSlug(raw)` — lowercases and strips spaces: `'Room 2'` → `'room2'`

Used by the Header project switcher to restore the last viewed A6 room when switching back from another project.

### `utils/viewerFieldDraftState.ts`

Defines and type-guards the `ViewerFieldDraftStateV1` schema. `mergeViewerFieldManualObservations(state)` combines `autoLabelingText` and `additionalCommentsText` into a single string for the PDF body.

### `utils/observationReportFlags.ts`

`flagsFromObservationBooleans(safety, quality, delayed)` converts three boolean checkboxes into a `string[]` for the Report `flags` field: `['safety_issue', 'quality_issue', 'schedule_delayed']`.

### `hooks/useCaptureDatesSummary.ts`

Calls `getExplorerDatesSummary()` once on mount. Returns a map of `{ [YYYY-MM-DD]: DateMediaCounts }`. Used by calendars to highlight dates that have media. Includes cancellation logic to prevent state updates after unmount.

---

## 21. Adding a New Page or Feature

### Adding a new protected route

1. Create the page component in `src/pages/`.
2. Import it in `App.tsx`.
3. Add a `<Route>` inside the `DefaultLayout` block wrapped in `<ProtectedRoute>`:

```tsx
<Route
  path="/my-new-page"
  element={
    <ProtectedRoute>
      <MyNewPage />
    </ProtectedRoute>
  }
/>
```

4. Add a navigation link in the Sidebar or Header if needed.

### Adding a new API call

Add the function to `services/apiClient.ts`. Follow the existing pattern:

```typescript
export async function myNewEndpoint(id: string): Promise<MyResponse> {
  const res = await apiFetch(`/my-resource/${id}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<MyResponse>;
}
```

### Adding a new viewer

1. Create the component in `src/components/`.
2. Define a `ViewerState` type for the route state it expects.
3. Add the route to `App.tsx`.
4. In `FileExplorer` / `FileTree`, add a `navigate('/my-viewer', { state: { ... } })` call for the relevant file type.
5. Use `viewer_kind: 'my_viewer'` in the draft state and register it in `_VIEWER_KIND_LABELS` in `backend/app/api/reports.py`.

### Adding a role-restricted route

Pass the `roles` prop to `ProtectedRoute`:

```tsx
<Route
  path="/admin-only"
  element={
    <ProtectedRoute roles={['admin']}>
      <AdminPanel />
    </ProtectedRoute>
  }
/>
```

### Persisting data to localStorage

Use `hooks/useLocalStorage.tsx` for any value you want to survive page reload:

```typescript
const [myValue, setMyValue] = useLocalStorage<string>('my.key', 'default');
```

Or for per-project scoped dates, use `setDateForScope` from `useSelectedDate()`.
