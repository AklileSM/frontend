# A6 Stern — Roles and Permissions Guide

> Covers every auth and authorization decision in the codebase, from token creation to route guards. Last updated: 2026-04-14.

---

## Table of Contents

1. [The Three Roles at a Glance](#1-the-three-roles-at-a-glance)
2. [How Roles Are Assigned](#2-how-roles-are-assigned)
3. [Permissions by Action](#3-permissions-by-action)
4. [How JWT Authentication Works](#4-how-jwt-authentication-works)
5. [How ProtectedRoute Works](#5-how-protectedroute-works)
6. [Backend Enforcement Layer by Layer](#6-backend-enforcement-layer-by-layer)
7. [What Is Not Protected (Public Endpoints)](#7-what-is-not-protected-public-endpoints)
8. [Reports and Drafts — Ownership Model](#8-reports-and-drafts--ownership-model)
9. [Changing a User's Role](#9-changing-a-users-role)
10. [Security Notes for Developers](#10-security-notes-for-developers)

---

## 1. The Three Roles at a Glance

The `role` field on the `User` model (`backend/app/models.py`) is a plain string constrained to three values.

| Role | Who it is | One-line summary |
|---|---|---|
| `admin` | Site operator, first registered user | Full access — the only role that can upload files |
| `manager` | Project lead, senior team member | Can manage and delete content, but cannot upload |
| `viewer` | Default for all new registrations | Read-only access plus AI analysis and annotations |

---

## 2. How Roles Are Assigned

### On registration

`backend/app/api/auth.py`, `register()`:

```python
user_count = db.scalar(select(func.count()).select_from(User)) or 0
role = "admin" if user_count == 0 else "viewer"
```

- The **first** user to register (when the `users` table is empty) automatically receives `admin`.
- Every subsequent registration receives `viewer`, regardless of who registered them.
- There is no invite system and no way to choose a role at registration time.

### Promoting a user to manager

There is no admin UI for role management. Role changes must be made directly in the database:

```sql
-- Promote a user to manager
UPDATE users SET role = 'manager' WHERE username = 'alice';

-- Promote a user to admin
UPDATE users SET role = 'admin' WHERE username = 'bob';

-- Demote back to viewer
UPDATE users SET role = 'viewer' WHERE username = 'charlie';
```

Via Docker Compose:
```bash
docker compose exec db psql -U postgres a6_stern \
  -c "UPDATE users SET role='manager' WHERE username='alice';"
```

### Disabling an account

The `is_active` boolean on `User` acts as a soft-disable. Setting it to `false` causes the backend to return `HTTP 403 Account disabled` on every authenticated request, without deleting the user's data.

```sql
UPDATE users SET is_active = false WHERE username = 'alice';
```

---

## 3. Permissions by Action

### File assets

| Action | admin | manager | viewer |
|---|---|---|---|
| Upload image / video / PDF | ✅ | ❌ | ❌ |
| Upload point cloud (chunked) | ✅ | ❌ | ❌ |
| Upload point cloud (direct presigned) | ✅ | ❌ | ❌ |
| Delete any file asset | ✅ | ✅ | ❌ |
| View file content (browse/stream) | ✅ | ✅ | ✅ |
| View thumbnails | ✅ | ✅ | ✅ |
| View upload history (own uploads) | ✅ | ✅ | ❌ |

**Where enforced (backend):**
- Upload: `require_user_can_upload` dependency in `api/upload.py` — checks `role == "admin"`, raises HTTP 403 otherwise.
- Delete: `_can_delete_file()` in `api/files.py` — returns `user.role in ("admin", "manager")`.
- Upload history: `list_my_uploads()` in `api/files.py` — raises HTTP 403 if `role not in ("admin", "manager")`.

---

### Browsing and discovery

| Action | admin | manager | viewer |
|---|---|---|---|
| Explorer — dates summary | ✅ | ✅ | ✅ |
| Explorer — by date | ✅ | ✅ | ✅ |
| Explorer — by room | ✅ | ✅ | ✅ |
| Point cloud conversion status | ✅ | ✅ | ✅ |

All explorer and file-serving endpoints require **no authentication** at the backend level. Access control is enforced by the frontend `ProtectedRoute` (see [Section 5](#5-how-protectedroute-works)) — an unauthenticated browser is redirected to `/login` before the request is ever made. See [Section 7](#7-what-is-not-protected-public-endpoints) for the full list of public endpoints.

---

### AI analysis

| Action | admin | manager | viewer |
|---|---|---|---|
| Request AI image analysis | ✅ | ✅ | ✅ |

`POST /api/ai/analyze` has no authentication dependency — it accepts any request. The frontend only renders the "Analyze" button for logged-in users, but the endpoint itself is open.

---

### Annotations

| Action | admin | manager | viewer |
|---|---|---|---|
| List annotations on a file | ✅ | ✅ | ✅ |
| Create annotation on a file | ✅ | ✅ | ✅ |

Both annotation endpoints in `api/annotations.py` have no `get_current_user` dependency. They are fully public at the API level.

---

### Reports

| Action | admin | manager | viewer |
|---|---|---|---|
| Create a report | ✅ | ✅ | ✅ |
| List own reports | ✅ | ✅ | ✅ |
| Download own report PDF | ✅ | ✅ | ✅ |
| Delete own report | ✅ | ✅ | ✅ |
| Access another user's report | ❌ | ❌ | ❌ |

Reports are scoped to the user who created them — all roles can create and manage their own reports, but no role (not even admin) can access another user's reports through the API. See [Section 8](#8-reports-and-drafts--ownership-model).

---

### Comparison drafts

| Action | admin | manager | viewer |
|---|---|---|---|
| Create a comparison draft | ✅ | ✅ | ✅ |
| List own drafts | ✅ | ✅ | ✅ |
| Update own draft | ✅ | ✅ | ✅ |
| Delete own draft | ✅ | ✅ | ✅ |
| Publish draft to report | ✅ | ✅ | ✅ |
| Access another user's draft | ❌ | ❌ | ❌ |

---

### Viewer field drafts

| Action | admin | manager | viewer |
|---|---|---|---|
| Create a viewer draft | ✅ | ✅ | ✅ |
| List own drafts | ✅ | ✅ | ✅ |
| Update own draft | ✅ | ✅ | ✅ |
| Delete own draft | ✅ | ✅ | ✅ |
| Publish draft to report | ✅ | ✅ | ✅ |
| Access another user's draft | ❌ | ❌ | ❌ |

---

### Summary — what only admins can do

Only one thing in the entire system is restricted to `admin` only: **uploading new file assets**. Every upload route (`/single`, `/pointcloud/init`, `/pointcloud/chunk`, `/pointcloud/complete`, `/pointcloud/direct-init`, `/pointcloud/direct-complete`) uses `Depends(require_user_can_upload)`.

### Summary — what admins and managers share but viewers cannot do

- Delete file assets
- View upload history (`/api/files/my-uploads`)

---

## 4. How JWT Authentication Works

### Token creation (`backend/app/core/security.py`)

When a user logs in or registers, `create_access_token()` is called:

```python
def create_access_token(*, subject: str, username: str, role: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.jwt_expire_minutes)  # default: 10 080 min = 7 days
    payload = {
        "sub": subject,       # user UUID (primary key)
        "username": username,
        "role": role,         # "admin" | "manager" | "viewer"
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
```

**Algorithm:** HS256 (HMAC-SHA256 symmetric signing)  
**Secret:** `JWT_SECRET` env var — the same key signs and verifies all tokens  
**Expiry:** 7 days by default (`JWT_EXPIRE_MINUTES=10080`). There is no refresh token mechanism; once a token expires, the user must log in again.

The `"type": "access"` claim exists to distinguish access tokens from any future token types.

### Token storage (frontend — `frontend/src/auth/authSession.ts`)

After receiving the token from the API, the frontend stores it in one of two places depending on the "Remember me" checkbox:

```
storeSession(session, persist=true)
  → localStorage['a6_auth_v2'] = JSON.stringify({ accessToken, user })

storeSession(session, persist=false)
  → ephemeralAccessToken = session.accessToken  ← module-level variable only
```

- **Persistent** (remember me checked): survives page reload and browser restart.
- **Ephemeral** (remember me unchecked): lives only in module memory; lost on page reload or tab close.

The storage key `a6_auth_v2` replaced a legacy key `a6_auth_v1`. The `clearSession()` function removes both keys to handle upgrades cleanly.

### Token transmission

Every API call from `frontend/src/services/apiClient.ts` goes through `apiFetch()`:

```typescript
const token = getAccessToken();  // reads ephemeral first, then localStorage
if (withAuth && token) {
  headers['Authorization'] = `Bearer ${token}`;
}
```

The token is sent as a `Bearer` token in the `Authorization` header on every authenticated request.

### Token verification (backend — `backend/app/api/deps.py`)

The `get_current_user` FastAPI dependency runs on every protected route:

```python
def get_current_user(creds, db) -> User:
    # 1. Header present?
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(401, "Not authenticated")

    # 2. Signature valid and not expired?
    try:
        payload = decode_access_token(creds.credentials)
    except ValueError:
        raise HTTPException(401, "Invalid or expired token")

    # 3. Correct token type?
    if payload.get("type") != "access":
        raise HTTPException(401, "Invalid token")

    # 4. User still in the database?
    user = db.scalar(select(User).where(User.id == payload["sub"]))
    if user is None:
        raise HTTPException(401, "User not found")

    # 5. Account still active?
    if not user.is_active:
        raise HTTPException(403, "Account disabled")

    return user  # injected into the route handler
```

Steps 4 and 5 mean that disabling an account (`is_active = false`) or deleting the user row immediately invalidates all of their tokens — even unexpired ones — without any token blacklist.

### Session refresh on page load (`frontend/src/context/AuthContext.tsx`)

On startup, `AuthProvider` immediately re-validates the stored session against the backend:

```typescript
useEffect(() => {
  const session = readSession();
  if (!session) return;

  apiFetchCurrentUser()         // GET /api/auth/me
    .then((raw) => {
      const nextUser = normalizeUser(raw);
      setUser(nextUser);
      storeSession({ accessToken: session.accessToken, user: nextUser }, true);
    })
    .catch(() => {
      clearSession();
      setUser(null);
    });
}, []);
```

This serves two purposes:
1. **Role sync** — if a user's role was changed in the database since their last login, the new role is reflected immediately on next page load.
2. **Stale token detection** — if the token is expired or the user has been disabled, the session is cleared and the user is treated as logged out.

The `normalizeUser()` function in `authSession.ts` provides a safety net: if the server returns an unrecognised role string, it defaults to `'viewer'`:

```typescript
function normalizeUser(raw): AuthUser {
  const role = isRole(raw.role) ? raw.role : 'viewer';
  return { id: raw.id, username: raw.username, email: raw.email ?? null, role };
}
```

---

## 5. How ProtectedRoute Works

`frontend/src/components/Auth/ProtectedRoute.tsx` is the client-side route guard.

### Component signature

```typescript
const ProtectedRoute: React.FC<{
  children: React.ReactElement;
  roles?: Role[];   // optional role whitelist
}> = ({ children, roles }) => { ... }
```

### Logic

```
Is the user authenticated?
  NO  → <Navigate to="/login" state={{ from: location }} replace />
  YES → Does this route have a required roles list?
          NO  → render children  ✅
          YES → Is the user's role in the list?
                  YES → render children  ✅
                  NO  → <Navigate to="/unauthorized" replace />
```

When redirected to `/login`, the current location is preserved in `state.from` so the user can be returned to their original destination after logging in.

### How it is used in App.tsx

Every non-public route in the application is wrapped in `<ProtectedRoute>`:

```tsx
<Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
<Route path="/A6_Stern" element={<ProtectedRoute><FileExplorer ... /></ProtectedRoute>} />
<Route path="/staticViewer" element={<ProtectedRoute><StaticViewer /></ProtectedRoute>} />
// ... all other app routes
```

Crucially, **none** of the current routes pass a `roles` prop. This means `ProtectedRoute` is currently used purely as an **authentication gate** (must be logged in), not a **role gate** (must have a specific role).

The `roles` prop is available for future use. If you need to restrict a route to admins only, you would write:

```tsx
<Route
  path="/admin"
  element={
    <ProtectedRoute roles={['admin']}>
      <AdminPanel />
    </ProtectedRoute>
  }
/>
```

### Public routes (no ProtectedRoute)

Three routes are intentionally public — rendered outside any `ProtectedRoute`:

```tsx
<Route path="/login"        element={<Login />} />
<Route path="/register"     element={<Register />} />
<Route path="/unauthorized" element={<Unauthorized />} />
```

---

## 6. Backend Enforcement Layer by Layer

The backend has three distinct enforcement levels, applied at the FastAPI dependency layer:

### Level 1 — Authenticated (any valid JWT)

Applied via `Depends(get_current_user)`:

```
GET  /api/auth/me
GET  /api/files/my-uploads            (+ role check inside handler)
DELETE /api/files/{id}                (+ role check inside handler)
POST /api/reports/
GET  /api/reports/
GET  /api/reports/{id}/pdf
DELETE /api/reports/{id}
POST/GET/PATCH/DELETE /api/reports/comparison-drafts/*
POST/GET/PATCH/DELETE /api/reports/viewer-drafts/*
```

### Level 2 — Admin and manager (additional role check in handler body)

Applied after `get_current_user` by checking `user.role` in the handler:

```
GET  /api/files/my-uploads     → if role not in ("admin", "manager"): 403
DELETE /api/files/{id}         → if not _can_delete_file(user, asset): 403
```

`_can_delete_file` in `files.py`:
```python
def _can_delete_file(user: User, _asset: FileAsset) -> bool:
    return user.role in ("admin", "manager")
```

### Level 3 — Admin only (dedicated dependency)

Applied via `Depends(require_user_can_upload)`:

```
POST /api/upload/single
POST /api/upload/pointcloud/init
POST /api/upload/pointcloud/chunk
POST /api/upload/pointcloud/complete
POST /api/upload/pointcloud/direct-init
POST /api/upload/pointcloud/direct-complete
```

`require_user_can_upload` in `deps.py`:
```python
def require_user_can_upload(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can upload files")
    return current_user
```

---

## 7. What Is Not Protected (Public Endpoints)

The following endpoints have **no authentication dependency** at the backend level. They accept requests from anyone, authenticated or not.

| Endpoint | Reason |
|---|---|
| `GET /api/health` | Monitoring / uptime checks |
| `POST /api/auth/register` | Must be accessible before login |
| `POST /api/auth/login` | Must be accessible before login |
| `GET /api/projects/` | Project listing drives navigation |
| `GET /api/rooms/` | Room listing drives navigation |
| `GET /api/rooms/{room_slug}` | Room detail |
| `GET /api/files/explorer/dates` | Date summary calendar |
| `GET /api/files/explorer/date/{date}` | Browse media by date |
| `GET /api/files/explorer/room/{slug}` | Browse media by room |
| `GET /api/files/{id}/content` | Serve file bytes (image, video, PDF) |
| `GET /api/files/{id}/thumbnail` | Serve thumbnail |
| `GET /api/files/{id}/url` | Get proxy URL |
| `GET /api/files/{id}/conversion-status` | Poll point cloud conversion |
| `GET /api/files/{id}/pointcloud/{path}` | Serve Potree binary files |
| `POST /api/ai/analyze` | AI image analysis |
| `GET /api/annotations/file/{id}` | List annotations |
| `POST /api/annotations/` | Create annotation |

**The practical effect:** File content, browsing, AI analysis, and annotations are protected only by the frontend `ProtectedRoute`. A client that bypasses the React app and calls these endpoints directly needs no token. This is an intentional design trade-off — the deployment assumes the backend is on a private LAN and not directly exposed to the public internet.

If you need to add backend authentication to these endpoints, add `current_user: User = Depends(get_current_user)` to the function signature.

---

## 8. Reports and Drafts — Ownership Model

Reports, comparison drafts, and viewer drafts all use a `created_by` field that stores the user's UUID. Every read, update, delete, and publish operation checks `record.created_by == current_user.id` and returns HTTP 403 if they do not match.

This is a **flat ownership model** — not a hierarchical admin-override model:

```python
# Example from reports.py — get_report_pdf()
if report.created_by != current_user.id:
    raise HTTPException(status_code=403, detail="Not allowed to access this report")
```

The same pattern appears in every report, comparison draft, and viewer draft handler. **Even an admin cannot read another user's report PDF through the API.**

The only way an admin can access another user's reports is directly via the database (e.g. through pgAdmin).

---

## 9. Changing a User's Role

### Promote to manager (most common)

```bash
docker compose exec db psql -U postgres a6_stern \
  -c "UPDATE users SET role='manager' WHERE username='alice';"
```

The change takes effect on the user's **next page load** — the `AuthProvider` calls `GET /api/auth/me` on startup which re-validates and re-stores the session with the current role from the database.

If the user is currently logged in and does not reload, their session still carries the old role in the React state. However, the backend always reads the role from the JWT, and the JWT role is set at **login time** — so a user who was `viewer` at login and is promoted to `manager` in the database will not gain delete access until they log out and log back in (which issues a new token with `role: manager`).

### Role vs. token role

The JWT embeds the role at the time of login. The backend's `get_current_user` loads the User record from the database on every request — but uses `payload["type"]` and `payload["sub"]` from the token, not `payload["role"]`. The authorization checks then read `user.role` from the **live database row**.

This means:
- Role changes in the database take effect **immediately** on the next request — the JWT is re-validated against the live `User` row.
- The `role` field in the JWT payload is present for informational use (e.g. debugging, client-side display) but the backend never trusts the token's `role` claim for access decisions — it always reads from the DB.

---

## 10. Security Notes for Developers

### Things that are enforced correctly

- Password hashing: bcrypt with `gensalt()` — no fixed salts.
- Token expiry: python-jose validates `exp` on every decode call.
- Account disable: `is_active = false` blocks all authenticated requests immediately.
- Path traversal guard on point cloud proxy: `if ".." in path or path.startswith("/")`.
- Allowed Potree filenames are a frozenset: `{"metadata.json", "hierarchy.bin", "octree.bin"}`.

### Things to be aware of

**Most file-serving endpoints are unauthenticated.** Anyone who can reach the backend port can download any file asset, read any annotation, or call the AI endpoint. The assumption is that the backend (`localhost:3002`) is behind a firewall or reverse proxy that only allows traffic from the frontend container.

**Tokens cannot be invalidated before expiry** (no blacklist, no session table). The only early-invalidation mechanism is deleting the user row or setting `is_active = false`. If a token is leaked, the affected user should be disabled until the token expires (up to 7 days).

**`JWT_SECRET` must be set before any user logs in.** If the secret changes, all existing tokens become invalid and every user must log in again. The default value `dev-only-change-me` must never be used in a shared or production environment.

**Reports and drafts are not scoped by role, only by ownership.** A viewer can create as many reports as they like. There is no quota or rate limiting on report creation.

**Annotations have no ownership tracking.** Any authenticated user (or unauthenticated caller reaching the backend directly) can create annotations on any file. There is no delete endpoint for annotations.
