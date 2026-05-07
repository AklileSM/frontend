import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import {
  createProject,
  createRoom,
  deleteRoom,
  listProjects,
  updateProject,
  updateRoom,
  uploadFloorplan,
  type ApiProject,
  type ApiProjectCreateRequest,
  type ApiRoom,
} from '../../services/apiClient';
import PageTitle from '../../components/PageTitle';
import HeaderProfileMenu from '../../components/Header/HeaderProfileMenu';

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

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
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const INPUT_CLASS =
  'w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none placeholder:text-gray-400 focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary';

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
    try { setProjects(await listProjects()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load projects'); }
    finally { setLoading(false); }
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
              <button type="button" onClick={() => setShowCreate(true)} className="mt-3 text-sm font-medium text-primary hover:underline">
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
                  <h2 className="font-semibold text-black dark:text-white">{p.name}</h2>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[p.status] ?? STATUS_COLOR.archived}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
                {p.description && <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{p.description}</p>}
                {p.location && <p className="text-xs text-gray-400 dark:text-gray-500">📍 {p.location}</p>}
                <p className="mt-auto text-xs font-mono text-gray-400 dark:text-gray-500">/{p.slug}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onCreated={(p) => setProjects((prev) => [p, ...prev])}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEP_LABELS = ['Details', 'Floorplan', 'Rooms', 'Hotspots'];

function StepBar({
  current,
  maxReached,
  onGoTo,
}: {
  current: number;
  maxReached: number;
  onGoTo: (s: number) => void;
}) {
  return (
    <div className="flex items-center px-6 py-4 border-b border-stroke dark:border-strokedark">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        const reachable = n < current && n <= maxReached;
        return (
          <React.Fragment key={n}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onGoTo(n)}
              className={`flex items-center gap-2 ${reachable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done
                    ? reachable
                      ? 'bg-primary text-white hover:opacity-80'
                      : 'bg-primary text-white'
                    : active
                    ? 'border-2 border-primary text-primary'
                    : 'border-2 border-gray-300 text-gray-400 dark:border-gray-600'
                }`}
              >
                {done ? '✓' : n}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  active ? 'text-black dark:text-white' : reachable ? 'text-primary' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {label}
              </span>
            </button>
            {i < STEP_LABELS.length - 1 && (
              <div className={`mx-2 h-px flex-1 transition-colors ${done ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — project details (create or edit)
// ---------------------------------------------------------------------------

function Step1({
  project,
  onCreated,
  onUpdated,
  onNext,
  onClose,
}: {
  project: ApiProject | null;
  onCreated: (p: ApiProject) => void;
  onUpdated: (p: ApiProject) => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const isEdit = project !== null;
  const [name, setName] = useState(project?.name ?? '');
  const [slug, setSlug] = useState(project?.slug ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [location, setLocation] = useState(project?.location ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        const updated = await updateProject(project.id, {
          name: name.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
        });
        onUpdated(updated);
      } else {
        const body: ApiProjectCreateRequest = {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
        };
        onCreated(await createProject(body));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
          Project name <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(autoSlug(e.target.value)); }}
          placeholder="A6-Stern Extension"
          className={INPUT_CLASS}
          required
        />
      </div>

      {!isEdit && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
            Slug <span className="text-danger">*</span>
            <span className="ml-2 text-xs font-normal text-gray-400">Lowercase, numbers, hyphens</span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
            placeholder="a6-stern-ext"
            pattern="^[a-z0-9-]+$"
            className={`${INPUT_CLASS} font-mono`}
            required
          />
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Brief project description…"
          className={`${INPUT_CLASS} resize-none`}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Berlin, Germany"
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={isEdit ? onNext : onClose}
          className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-gray-700"
        >
          {isEdit ? 'Continue without saving →' : 'Cancel'}
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim() || (!isEdit && !slug.trim())}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEdit ? 'Save & continue' : 'Create project'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — floorplan upload (required)
// ---------------------------------------------------------------------------

function Step2({
  project,
  onUploaded,
  onBack,
}: {
  project: ApiProject;
  onUploaded: (p: ApiProject) => void;
  onBack: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      onUploaded(await uploadFloorplan(project.id, file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setUploading(false);
    }
  };

  if (project.floorplan_url) {
    return (
      <div className="p-6 space-y-5">
        <img src={project.floorplan_url} alt="Floorplan" className="max-h-48 w-full rounded-lg border border-stroke object-contain dark:border-strokedark" />
        <div className="flex items-center justify-between">
          <label className="cursor-pointer rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-black hover:border-primary dark:border-strokedark dark:text-white dark:hover:border-primary">
            Replace image
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={onBack} className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-gray-700">
              ← Back
            </button>
            <button type="button" onClick={() => onUploaded(project)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              Next →
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>}
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
        {uploading
          ? <p className="text-sm text-gray-500">Uploading…</p>
          : <>
              <p className="text-sm font-medium text-black dark:text-white">Drop your floorplan here, or click to browse</p>
              <p className="text-xs text-gray-400">JPEG, PNG, or WebP</p>
            </>
        }
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 dark:text-gray-500">A floorplan is required to enable the interactive map.</p>
        <button type="button" onClick={onBack} className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-gray-700">
          ← Back
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — define rooms
// ---------------------------------------------------------------------------

function Step3({
  project,
  rooms,
  setRooms,
  onNext,
  onBack,
}: {
  project: ApiProject;
  rooms: ApiRoom[];
  setRooms: React.Dispatch<React.SetStateAction<ApiRoom[]>>;
  onNext: () => void;
  onBack: () => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const r = await createRoom(project.id, { name: name.trim(), slug: slug.trim(), sort_order: rooms.length });
      setRooms((prev) => [...prev, r]);
      setName('');
      setSlug('');
      setSlugTouched(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add room');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (roomId: string) => {
    try {
      await deleteRoom(project.id, roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete room');
    }
  };

  return (
    <div className="p-6 space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Add the rooms or zones that exist in this project. You'll place them on the floorplan in the next step.
      </p>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>}

      {/* Room list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {rooms.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">No rooms yet.</p>
        )}
        {rooms.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-md border border-stroke bg-gray-50 px-3 py-2 dark:border-strokedark dark:bg-meta-4/20">
            <span className="flex-1 text-sm font-medium text-black dark:text-white">{r.name}</span>
            <span className="text-xs font-mono text-gray-400">/{r.slug}</span>
            <button
              type="button"
              onClick={() => handleDelete(r.id)}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add room form */}
      <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(autoSlug(e.target.value)); }}
          placeholder="Room name"
          className={`${INPUT_CLASS} flex-1 min-w-[140px]`}
        />
        <input
          type="text"
          value={slug}
          onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
          placeholder="slug"
          pattern="^[a-z0-9-]+$"
          className={`${INPUT_CLASS} w-28 font-mono`}
        />
        <button
          type="submit"
          disabled={adding || !name.trim() || !slug.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {adding ? '…' : 'Add'}
        </button>
      </form>

      <div className="flex justify-between pt-2 border-t border-stroke dark:border-strokedark">
        <button type="button" onClick={onBack} className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-gray-700">
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {rooms.length === 0 ? 'Skip →' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hotspot editor modal (large)
// ---------------------------------------------------------------------------

interface HotspotDraft { x: number; y: number; width: number; height: number; }

function HotspotEditorModal({
  project,
  rooms,
  onRoomUpdated,
  onClose,
}: {
  project: ApiProject;
  rooms: ApiRoom[];
  onRoomUpdated: (r: ApiRoom) => void;
  onClose: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<HotspotDraft | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const getPct = (e: React.MouseEvent) => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const p = getPct(e);
    if (!p) return;
    setDrawStart(p);
    setDraft(null);
    setSelectedRoomId('');
    setSaveError(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawStart) return;
    const p = getPct(e);
    if (!p) return;
    setDraft({
      x: Math.min(drawStart.x, p.x),
      y: Math.min(drawStart.y, p.y),
      width: Math.abs(p.x - drawStart.x),
      height: Math.abs(p.y - drawStart.y),
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drawStart) return;
    const p = getPct(e);
    if (p) {
      const d = {
        x: Math.min(drawStart.x, p.x),
        y: Math.min(drawStart.y, p.y),
        width: Math.abs(p.x - drawStart.x),
        height: Math.abs(p.y - drawStart.y),
      };
      if (d.width >= 1 && d.height >= 1) {
        setDraft(d);
      } else {
        setDraft(null);
      }
    }
    setDrawStart(null);
  };

  const handleSave = async () => {
    if (!draft || !selectedRoomId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateRoom(project.id, selectedRoomId, { floor_plan_coordinates: { ...draft } });
      onRoomUpdated(updated);
      setDraft(null);
      setSelectedRoomId('');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleClearHotspot = async (roomId: string) => {
    try {
      const updated = await updateRoom(project.id, roomId, { floor_plan_coordinates: null });
      onRoomUpdated(updated);
    } catch { /* ignore */ }
  };

  const COLORS = ['#3C50E0', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-5xl flex-col rounded-xl border border-stroke bg-white shadow-2xl dark:border-strokedark dark:bg-boxdark" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark shrink-0">
          <div>
            <h3 className="font-semibold text-black dark:text-white">Hotspot editor</h3>
            <p className="text-xs text-gray-400 mt-0.5">Draw a zone on the floorplan, then assign it to a room.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-black dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Floorplan canvas */}
          <div className="relative flex-1 overflow-auto bg-gray-900 select-none">
            <img
              ref={imgRef}
              src={project.floorplan_url!}
              alt="Floorplan"
              className="block w-full"
              draggable={false}
            />

            {/* Placed hotspots */}
            {rooms.filter((r) => r.floor_plan_coordinates).map((r, i) => {
              const c = r.floor_plan_coordinates!;
              const color = COLORS[i % COLORS.length];
              return (
                <div
                  key={r.id}
                  style={{ position: 'absolute', top: `${c.y}%`, left: `${c.x}%`, width: `${c.width}%`, height: `${c.height}%`, borderColor: color }}
                  className="border-2 rounded pointer-events-none"
                >
                  <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-xs font-medium text-white truncate" style={{ backgroundColor: color + 'cc' }}>
                    {r.name}
                  </div>
                </div>
              );
            })}

            {/* Draft zone */}
            {draft && (
              <div
                style={{ position: 'absolute', top: `${draft.y}%`, left: `${draft.x}%`, width: `${draft.width}%`, height: `${draft.height}%` }}
                className="border-2 border-dashed border-yellow-400 bg-yellow-400/20 rounded pointer-events-none"
              />
            )}

            {/* Draw overlay */}
            <div
              className="absolute inset-0 cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { if (drawStart) { setDrawStart(null); } }}
            />

            {/* Instruction */}
            {!draft && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-medium text-white pointer-events-none">
                Click and drag to draw a zone
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="w-64 shrink-0 flex flex-col border-l border-stroke dark:border-strokedark overflow-y-auto">
            {/* Zone assignment */}
            <div className="p-4 border-b border-stroke dark:border-strokedark">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Assign zone</p>
              {draft ? (
                <div className="space-y-3">
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary"
                  >
                    <option value="">Select a room…</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  {saveError && <p className="text-xs text-red-500">{saveError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setDraft(null); setSelectedRoomId(''); }}
                      className="flex-1 rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!selectedRoomId || saving}
                      className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? '…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">Draw a rectangle on the floorplan to assign it to a room.</p>
              )}
            </div>

            {/* Room list with hotspot status */}
            <div className="p-4 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Rooms</p>
              <div className="space-y-2">
                {rooms.map((r, i) => (
                  <div key={r.id} className="rounded-md border border-stroke dark:border-strokedark p-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="flex-1 text-xs font-medium text-black dark:text-white truncate">{r.name}</span>
                    </div>
                    {r.floor_plan_coordinates ? (
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-xs text-green-600 dark:text-green-400">Hotspot set</span>
                        <button
                          type="button"
                          onClick={() => handleClearHotspot(r.id)}
                          className="text-xs text-gray-400 hover:text-red-500"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">No hotspot yet</p>
                    )}
                  </div>
                ))}
                {rooms.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">No rooms defined. Go back to add rooms first.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — hotspot placement
// ---------------------------------------------------------------------------

function Step4({
  project,
  rooms,
  onRoomUpdated,
  onDone,
  onBack,
}: {
  project: ApiProject;
  rooms: ApiRoom[];
  onRoomUpdated: (r: ApiRoom) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  const hasAnyHotspot = rooms.some((r) => r.floor_plan_coordinates);

  return (
    <div className="p-6 space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Place each room on the floorplan so users can click into them from the project home.
      </p>

      {/* Room summary */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {rooms.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No rooms defined. Go back to add rooms first.</p>
        ) : (
          rooms.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-md border border-stroke bg-gray-50 px-3 py-2 dark:border-strokedark dark:bg-meta-4/20">
              <span className="flex-1 text-sm font-medium text-black dark:text-white">{r.name}</span>
              {r.floor_plan_coordinates
                ? <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Hotspot set</span>
                : <span className="text-xs text-gray-400">No hotspot</span>
              }
            </div>
          ))
        )}
      </div>

      {rooms.length > 0 && (
        <button
          type="button"
          onClick={() => setEditorOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
          </svg>
          Open hotspot editor
        </button>
      )}

      <div className="flex justify-between pt-2 border-t border-stroke dark:border-strokedark">
        <button type="button" onClick={onBack} className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-gray-700">
          ← Back
        </button>
        <button
          type="button"
          onClick={() => hasAnyHotspot ? onDone() : setShowSkipWarning(true)}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {hasAnyHotspot ? 'Done' : 'Skip for now'}
        </button>
      </div>

      {/* Hotspot editor modal */}
      {editorOpen && (
        <HotspotEditorModal
          project={project}
          rooms={rooms}
          onRoomUpdated={onRoomUpdated}
          onClose={() => setEditorOpen(false)}
        />
      )}

      {/* Skip warning */}
      {showSkipWarning && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
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
              <button type="button" onClick={() => setShowSkipWarning(false)} className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-gray-700">
                Go back
              </button>
              <button type="button" onClick={onDone} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
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
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [project, setProject] = useState<ApiProject | null>(null);
  const [rooms, setRooms] = useState<ApiRoom[]>([]);

  const goTo = (s: number) => {
    setStep(s);
    setMaxReached((prev) => Math.max(prev, s));
  };

  const handleCreated = (p: ApiProject) => {
    onCreated(p);
    setProject(p);
    goTo(2);
  };

  const handleUpdated = (p: ApiProject) => {
    setProject(p);
  };

  const handleRoomUpdated = (updated: ApiRoom) => {
    setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleFinish = () => {
    onClose();
    if (project) navigate(`/projects/${project.slug}`);
  };

  const isNarrow = step === 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget && step === 1) onClose(); }}
    >
      <div className={`w-full rounded-xl border border-stroke bg-white shadow-2xl dark:border-strokedark dark:bg-boxdark transition-all duration-200 ${isNarrow ? 'max-w-md' : 'max-w-2xl'}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
          <h2 className="font-semibold text-black dark:text-white">New project</h2>
          {step === 1 && (
            <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-black dark:hover:bg-gray-700 dark:hover:text-white">
              ✕
            </button>
          )}
        </div>

        <StepBar current={step} maxReached={maxReached} onGoTo={goTo} />

        {step === 1 && (
          <Step1
            project={project}
            onCreated={handleCreated}
            onUpdated={handleUpdated}
            onNext={() => goTo(2)}
            onClose={onClose}
          />
        )}
        {step === 2 && project && (
          <Step2
            project={project}
            onUploaded={(p) => { setProject(p); goTo(3); }}
            onBack={() => goTo(1)}
          />
        )}
        {step === 3 && project && (
          <Step3
            project={project}
            rooms={rooms}
            setRooms={setRooms}
            onNext={() => goTo(4)}
            onBack={() => goTo(2)}
          />
        )}
        {step === 4 && project && (
          <Step4
            project={project}
            rooms={rooms}
            onRoomUpdated={handleRoomUpdated}
            onDone={handleFinish}
            onBack={() => goTo(3)}
          />
        )}
      </div>
    </div>
  );
}

export default ProjectsDashboard;
