import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import {
  createProject,
  createRoom,
  listProjectRooms,
  listProjects,
  updateRoom,
  uploadFloorplan,
  type ApiProject,
  type ApiProjectCreateRequest,
  type ApiRoom,
} from '../../services/apiClient';
import PageTitle from '../../components/PageTitle';
import HeaderProfileMenu from '../../components/Header/HeaderProfileMenu';

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
};

const STATUS_COLOR: Record<string, string> = {
  active: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  on_hold: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
  completed: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  archived: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
};

const autoSlug = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ProjectsDashboard: React.FC = () => {
  const { user } = useAuth();
  const { setActiveProjectSlug } = useProject();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { setActiveProjectSlug(null); }, [setActiveProjectSlug]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-white dark:bg-boxdark-2">
      <PageTitle title="Projects" />
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-stroke bg-white px-6 py-4 dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center gap-3">
          <img className="h-8 dark:hidden" src="/Logo/LogoforWhite.png" alt="Logo" />
          <img className="hidden h-8 dark:block" src="/Logo/LogoforDark.png" alt="Logo" />
        </div>
        <HeaderProfileMenu />
      </header>
    <div className="px-6 py-8">

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">Projects</h1>
          {!loading && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          )}
        </div>
        {user?.is_admin && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <span className="text-lg leading-none">+</span>
            New project
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-600 dark:bg-boxdark">
          <p className="text-sm text-gray-500 dark:text-gray-400">No projects yet.</p>
          {user?.is_admin && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Create the first one
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.slug}`}
              className="flex flex-col gap-3 rounded-lg border border-stroke bg-white p-5 shadow-sm transition-colors hover:border-primary dark:border-strokedark dark:bg-boxdark dark:hover:border-primary"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-black transition-colors group-hover:text-primary dark:text-white">{p.name}</h2>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLOR[p.status] ?? STATUS_COLOR.archived
                  }`}
                >
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>
              {p.description && (
                <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{p.description}</p>
              )}
              {p.location && (
                <p className="text-xs text-gray-400 dark:text-gray-500">📍 {p.location}</p>
              )}
              <p className="mt-auto text-xs font-mono text-gray-400 dark:text-gray-500">/{p.slug}</p>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onCreated={(p) => setProjects((prev) => [p, ...prev])}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Shared field wrapper
// ---------------------------------------------------------------------------

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
        {hint && <span className="ml-2 text-xs font-normal text-gray-400">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLASS =
  'w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none placeholder:text-gray-400 focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary';

// ---------------------------------------------------------------------------
// Step indicators
// ---------------------------------------------------------------------------

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Project details', 'Floorplan', 'Hotspots'];
  return (
    <div className="flex items-center gap-0 px-6 py-4 border-b border-stroke dark:border-strokedark">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = current > n;
        const active = current === n;
        return (
          <React.Fragment key={n}>
            <div className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? 'bg-primary text-white'
                    : active
                    ? 'border-2 border-primary text-primary'
                    : 'border-2 border-gray-300 text-gray-400 dark:border-gray-600'
                }`}
              >
                {done ? '✓' : n}
              </div>
              <span
                className={`text-xs font-medium ${
                  active ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-3 h-px flex-1 ${done ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — project details
// ---------------------------------------------------------------------------

function Step1(props: {
  onCreated: (p: ApiProject) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const body: ApiProjectCreateRequest = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
      };
      props.onCreated(await createProject(body));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}
      <Field label="Project name" required>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(autoSlug(e.target.value)); }}
          placeholder="A6-Stern Extension"
          className={INPUT_CLASS}
          required
        />
      </Field>
      <Field label="Slug" required hint="Lowercase, numbers, hyphens">
        <input
          type="text"
          value={slug}
          onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
          placeholder="a6-stern-ext"
          pattern="^[a-z0-9-]+$"
          className={`${INPUT_CLASS} font-mono`}
          required
        />
      </Field>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Brief project description…"
          className={`${INPUT_CLASS} resize-none`}
        />
      </Field>
      <Field label="Location">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Berlin, Germany"
          className={INPUT_CLASS}
        />
      </Field>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={props.onClose}
          className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim() || !slug.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create project'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — floorplan upload
// ---------------------------------------------------------------------------

function Step2(props: {
  project: ApiProject;
  onUploaded: (p: ApiProject) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const updated = await uploadFloorplan(props.project.id, file);
      props.onUploaded(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-8 py-14 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary dark:border-gray-600 dark:hover:border-primary'
        }`}
      >
        <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        {uploading ? (
          <p className="text-sm text-gray-500">Uploading…</p>
        ) : (
          <>
            <p className="text-sm font-medium text-black dark:text-white">Drop your floorplan here, or click to browse</p>
            <p className="text-xs text-gray-400">JPEG, PNG, or WebP</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        A floorplan is required to enable the interactive map for this project.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — room creation + hotspot placement
// ---------------------------------------------------------------------------

interface HotspotDraft { x: number; y: number; width: number; height: number; }

function Step3(props: {
  project: ApiProject;
  onDone: () => void;
}) {
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [roomSlug, setRoomSlug] = useState('');
  const [roomSlugTouched, setRoomSlugTouched] = useState(false);
  const [addingRoom, setAddingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<HotspotDraft | null>(null);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    listProjectRooms(props.project.id)
      .then(setRooms)
      .catch(() => setRooms([]))
      .finally(() => setLoadingRooms(false));
  }, [props.project.id]);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !roomSlug.trim()) return;
    setAddingRoom(true);
    setRoomError(null);
    try {
      const r = await createRoom(props.project.id, { name: roomName.trim(), slug: roomSlug.trim(), sort_order: rooms.length });
      setRooms((prev) => [...prev, r]);
      setRoomName('');
      setRoomSlug('');
      setRoomSlugTouched(false);
    } catch (e) {
      setRoomError(e instanceof Error ? e.message : 'Failed to add room');
    } finally {
      setAddingRoom(false);
    }
  };

  const getPct = (e: React.MouseEvent) => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!editingRoomId) return;
    e.preventDefault();
    const p = getPct(e);
    if (p) { setDrawStart(p); setDraft(null); }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawStart) return;
    const p = getPct(e);
    if (!p) return;
    setDraft({ x: Math.min(drawStart.x, p.x), y: Math.min(drawStart.y, p.y), width: Math.abs(p.x - drawStart.x), height: Math.abs(p.y - drawStart.y) });
  };

  const handleMouseUp = async () => {
    if (!drawStart || !draft || !editingRoomId) { setDrawStart(null); return; }
    if (draft.width < 1 || draft.height < 1) { setDrawStart(null); setDraft(null); return; }
    const coords = { x: draft.x, y: draft.y, width: draft.width, height: draft.height };
    setDrawStart(null);
    setDraft(null);
    try {
      const updated = await updateRoom(props.project.id, editingRoomId, { floor_plan_coordinates: coords });
      setRooms((prev) => prev.map((r) => (r.id === editingRoomId ? updated : r)));
      setEditingRoomId(null);
    } catch {
      setRoomError('Failed to save hotspot');
    }
  };

  const editingRoom = rooms.find((r) => r.id === editingRoomId);

  return (
    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Add rooms and draw their hotspot zones on the floorplan. You can always adjust this later in project settings.
      </p>

      {/* Floorplan + drawing overlay */}
      <div className="relative inline-block w-full select-none overflow-hidden rounded-lg border border-stroke dark:border-strokedark">
        <img
          ref={imgRef}
          src={props.project.floorplan_url!}
          alt="Floorplan"
          className="block w-full"
          draggable={false}
        />
        {/* Placed hotspots */}
        {rooms.filter((r) => r.floor_plan_coordinates && r.id !== editingRoomId).map((r) => {
          const c = r.floor_plan_coordinates!;
          return (
            <div
              key={r.id}
              style={{ position: 'absolute', top: `${c.y}%`, left: `${c.x}%`, width: `${c.width}%`, height: `${c.height}%` }}
              className="border-2 border-primary bg-primary/10 rounded pointer-events-none"
            >
              <span className="absolute bottom-0 left-0 rounded bg-black/60 px-1 text-xs text-white leading-5">{r.name}</span>
            </div>
          );
        })}
        {/* Draft being drawn */}
        {draft && (
          <div
            style={{ position: 'absolute', top: `${draft.y}%`, left: `${draft.x}%`, width: `${draft.width}%`, height: `${draft.height}%` }}
            className="border-2 border-dashed border-yellow-400 bg-yellow-400/20 rounded pointer-events-none"
          />
        )}
        {/* Draw overlay — only active when placing a hotspot */}
        {editingRoomId && (
          <div
            className="absolute inset-0 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setDrawStart(null); setDraft(null); }}
          />
        )}
        {/* Instruction banner when drawing */}
        {editingRoomId && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-xs font-medium text-white pointer-events-none">
            Drawing hotspot for <strong>{editingRoom?.name}</strong> — click and drag
          </div>
        )}
      </div>

      {/* Room list */}
      {roomError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{roomError}</p>
      )}

      {loadingRooms ? (
        <div className="h-10 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center gap-3 rounded-md border border-stroke bg-gray-50 px-3 py-2 dark:border-strokedark dark:bg-boxdark">
              <span className="flex-1 text-sm font-medium text-black dark:text-white">{room.name}</span>
              {room.floor_plan_coordinates ? (
                <>
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Hotspot set</span>
                  <button type="button" onClick={() => setEditingRoomId(room.id)} className="text-xs text-primary hover:underline">Redraw</button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingRoomId(editingRoomId === room.id ? null : room.id)}
                  className={`text-xs font-medium ${editingRoomId === room.id ? 'text-yellow-600' : 'text-primary'} hover:underline`}
                >
                  {editingRoomId === room.id ? 'Cancel' : 'Place hotspot'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add room form */}
      <form onSubmit={handleAddRoom} className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={roomName}
          onChange={(e) => { setRoomName(e.target.value); if (!roomSlugTouched) setRoomSlug(autoSlug(e.target.value)); }}
          placeholder="Room name"
          className={`${INPUT_CLASS} max-w-[180px]`}
        />
        <input
          type="text"
          value={roomSlug}
          onChange={(e) => { setRoomSlugTouched(true); setRoomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
          placeholder="slug"
          pattern="^[a-z0-9-]+$"
          className={`${INPUT_CLASS} max-w-[120px] font-mono`}
        />
        <button
          type="submit"
          disabled={addingRoom || !roomName.trim() || !roomSlug.trim()}
          className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {addingRoom ? 'Adding…' : 'Add room'}
        </button>
      </form>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-stroke dark:border-strokedark">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Hotspot placement can be adjusted anytime in Settings.
        </p>
        <button
          type="button"
          onClick={() => {
            if (rooms.some((r) => r.floor_plan_coordinates)) {
              props.onDone();
            } else {
              setShowSkipWarning(true);
            }
          }}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {rooms.some((r) => r.floor_plan_coordinates) ? 'Done' : 'Skip for now'}
        </button>
      </div>

      {/* Skip warning modal */}
      {showSkipWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl border border-stroke bg-white p-6 shadow-2xl dark:border-strokedark dark:bg-boxdark">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-black dark:text-white">Floorplan won't be interactive</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Without hotspots, the floorplan image will be shown but rooms won't be clickable. You can place hotspots later in project settings.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSkipWarning(false)}
                className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-gray-700"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={props.onDone}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Skip anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wizard shell
// ---------------------------------------------------------------------------

function CreateProjectModal({
  onCreated,
  onClose,
}: {
  onCreated: (p: ApiProject) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [project, setProject] = useState<ApiProject | null>(null);

  const handleCreated = (p: ApiProject) => {
    onCreated(p);
    setProject(p);
    setStep(2);
  };

  const handleUploaded = (p: ApiProject) => {
    setProject(p);
    setStep(3);
  };

  const handleFinish = () => {
    onClose();
    if (project) navigate(`/projects/${project.slug}`);
  };

  const isWide = step > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget && step === 1) onClose(); }}
    >
      <div className={`w-full rounded-xl border border-stroke bg-white shadow-2xl dark:border-strokedark dark:bg-boxdark transition-all ${isWide ? 'max-w-2xl' : 'max-w-md'}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
          <h2 className="font-semibold text-black dark:text-white">New project</h2>
          {step === 1 && (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-black dark:hover:bg-gray-700 dark:hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <Steps current={step} />

        {step === 1 && <Step1 onCreated={handleCreated} onClose={onClose} />}
        {step === 2 && project && (
          <Step2
            project={project}
            onUploaded={handleUploaded}
          />
        )}
        {step === 3 && project && (
          <Step3
            project={project}
            onDone={handleFinish}
          />
        )}
      </div>
    </div>
  );
}

export default ProjectsDashboard;
