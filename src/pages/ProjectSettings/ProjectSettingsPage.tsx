import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import {
  addProjectMember,
  createRoom,
  deleteFloorplan,
  deleteRoom,
  getProjectBySlug,
  listAdminUsers,
  listProjectMembers,
  listProjectRooms,
  removeProjectMember,
  updateProject,
  updateProjectMember,
  updateRoom,
  uploadFloorplan,
  type ApiAdminUser,
  type ApiProject,
  type ApiProjectMember,
  type ApiRoom,
} from '../../services/apiClient';
import PageTitle from '../../components/PageTitle';
import HeaderProfileMenu from '../../components/Header/HeaderProfileMenu';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const autoSlug = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const INPUT_CLASS =
  'w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none placeholder:text-gray-400 focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary';

const SELECT_CLASS =
  'rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  editor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  viewer: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

// ---------------------------------------------------------------------------
// Tab: Info
// ---------------------------------------------------------------------------

function InfoTab({ project, onUpdated }: { project: ApiProject; onUpdated: (p: ApiProject) => void }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [location, setLocation] = useState(project.location ?? '');
  const [status, setStatus] = useState(project.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        status,
      });
      onUpdated(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
      )}
      <Field label="Project name" required>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={INPUT_CLASS}
          required
        />
      </Field>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={`${INPUT_CLASS} resize-none`}
          placeholder="Brief project description…"
        />
      </Field>
      <Field label="Location">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={INPUT_CLASS}
          placeholder="Berlin, Germany"
        />
      </Field>
      <Field label="Status">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT_CLASS}>
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </Field>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Tab: Setup — floorplan + rooms + hotspot editor
// ---------------------------------------------------------------------------

interface HotspotDraft {
  x: number;
  y: number;
  width: number;
  height: number;
}

function SetupTab({
  project,
  onProjectUpdated,
}: {
  project: ApiProject;
  onProjectUpdated: (p: ApiProject) => void;
}) {
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [floorplanError, setFloorplanError] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  // New room form
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomSlug, setNewRoomSlug] = useState('');
  const [newRoomSlugTouched, setNewRoomSlugTouched] = useState(false);
  const [addingRoom, setAddingRoom] = useState(false);

  // Hotspot editor
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HotspotDraft | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const loadRooms = useCallback(() => {
    setLoadingRooms(true);
    listProjectRooms(project.id)
      .then(setRooms)
      .catch(() => setRooms([]))
      .finally(() => setLoadingRooms(false));
  }, [project.id]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // Floorplan upload
  const handleFloorplanDrop = async (file: File) => {
    setUploading(true);
    setFloorplanError(null);
    try {
      const updated = await uploadFloorplan(project.id, file);
      onProjectUpdated(updated);
    } catch (e) {
      setFloorplanError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFloorplanDelete = async () => {
    if (!confirm('Remove floorplan? All hotspot overlays will still be saved on the rooms.')) return;
    try {
      const updated = await deleteFloorplan(project.id);
      onProjectUpdated(updated);
    } catch (e) {
      setFloorplanError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  // Add room
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !newRoomSlug.trim()) return;
    setAddingRoom(true);
    setRoomError(null);
    try {
      const room = await createRoom(project.id, {
        name: newRoomName.trim(),
        slug: newRoomSlug.trim(),
        sort_order: rooms.length,
      });
      setRooms((prev) => [...prev, room]);
      setNewRoomName('');
      setNewRoomSlug('');
      setNewRoomSlugTouched(false);
    } catch (e) {
      setRoomError(e instanceof Error ? e.message : 'Failed to create room');
    } finally {
      setAddingRoom(false);
    }
  };

  // Delete room
  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Delete this room? All files in this room will also be deleted.')) return;
    try {
      await deleteRoom(project.id, roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      if (editingRoomId === roomId) setEditingRoomId(null);
    } catch (e) {
      setRoomError(e instanceof Error ? e.message : 'Failed to delete room');
    }
  };

  // Hotspot drawing
  const getPctCoords = (e: React.MouseEvent): { x: number; y: number } | null => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (!editingRoomId) return;
    e.preventDefault();
    const pos = getPctCoords(e);
    if (!pos) return;
    setDrawStart(pos);
    setDraft(null);
  };

  const handleOverlayMouseMove = (e: React.MouseEvent) => {
    if (!drawStart) return;
    const pos = getPctCoords(e);
    if (!pos) return;
    setDraft({
      x: Math.min(drawStart.x, pos.x),
      y: Math.min(drawStart.y, pos.y),
      width: Math.abs(pos.x - drawStart.x),
      height: Math.abs(pos.y - drawStart.y),
    });
  };

  const handleOverlayMouseUp = async () => {
    if (!drawStart || !draft || !editingRoomId) {
      setDrawStart(null);
      return;
    }
    if (draft.width < 1 || draft.height < 1) {
      setDrawStart(null);
      setDraft(null);
      return;
    }
    const coords = { x: draft.x, y: draft.y, width: draft.width, height: draft.height };
    setDrawStart(null);
    setDraft(null);
    try {
      const updated = await updateRoom(project.id, editingRoomId, { floor_plan_coordinates: coords });
      setRooms((prev) => prev.map((r) => (r.id === editingRoomId ? updated : r)));
      setEditingRoomId(null);
    } catch {
      setRoomError('Failed to save hotspot');
    }
  };

  const handleClearHotspot = async (room: ApiRoom) => {
    try {
      const updated = await updateRoom(project.id, room.id, { floor_plan_coordinates: null });
      setRooms((prev) => prev.map((r) => (r.id === room.id ? updated : r)));
    } catch {
      setRoomError('Failed to clear hotspot');
    }
  };

  return (
    <div className="space-y-10">

      {/* Floorplan section */}
      <section>
        <h3 className="mb-4 text-base font-semibold text-black dark:text-white">Floorplan image</h3>
        {floorplanError && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{floorplanError}</p>
        )}
        {project.floorplan_url ? (
          <div className="space-y-3">
            <img
              src={project.floorplan_url}
              alt="Current floorplan"
              className="max-h-48 rounded-lg border border-stroke object-contain dark:border-strokedark"
            />
            <div className="flex gap-3">
              <label className="cursor-pointer rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-black hover:border-primary dark:border-strokedark dark:text-white dark:hover:border-primary">
                Replace
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFloorplanDrop(e.target.files[0])}
                />
              </label>
              <button
                type="button"
                onClick={handleFloorplanDelete}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <FloorplanDropZone onFile={handleFloorplanDrop} uploading={uploading} />
        )}
      </section>

      {/* Rooms section */}
      <section>
        <h3 className="mb-4 text-base font-semibold text-black dark:text-white">Rooms</h3>
        {roomError && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{roomError}</p>
        )}

        {loadingRooms ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : (
          <div className="space-y-2 mb-5">
            {rooms.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">No rooms yet. Add one below.</p>
            )}
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center gap-3 rounded-md border border-stroke bg-white px-3 py-2 dark:border-strokedark dark:bg-boxdark"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-black dark:text-white">{room.name}</span>
                  <span className="ml-2 text-xs font-mono text-gray-400">/{room.slug}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {room.floor_plan_coordinates ? (
                    <>
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Hotspot set
                      </span>
                      {project.floorplan_url && (
                        <button
                          type="button"
                          onClick={() => setEditingRoomId(room.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleClearHotspot(room)}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        Clear
                      </button>
                    </>
                  ) : (
                    project.floorplan_url ? (
                      <button
                        type="button"
                        onClick={() => setEditingRoomId(room.id)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Place hotspot
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">No hotspot</span>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteRoom(room.id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    title="Delete room"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add room form */}
        <form onSubmit={handleAddRoom} className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => {
              setNewRoomName(e.target.value);
              if (!newRoomSlugTouched) setNewRoomSlug(autoSlug(e.target.value));
            }}
            placeholder="Room name"
            className={`${INPUT_CLASS} max-w-xs`}
            required
          />
          <input
            type="text"
            value={newRoomSlug}
            onChange={(e) => {
              setNewRoomSlugTouched(true);
              setNewRoomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
            }}
            placeholder="slug"
            pattern="^[a-z0-9-]+$"
            className={`${INPUT_CLASS} max-w-[140px] font-mono`}
            required
          />
          <button
            type="submit"
            disabled={addingRoom || !newRoomName.trim() || !newRoomSlug.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {addingRoom ? 'Adding…' : 'Add room'}
          </button>
        </form>
      </section>

      {/* Hotspot editor */}
      {editingRoomId && project.floorplan_url && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-black dark:text-white">
              Placing hotspot for:{' '}
              <span className="text-primary">
                {rooms.find((r) => r.id === editingRoomId)?.name}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => { setEditingRoomId(null); setDraft(null); setDrawStart(null); }}
              className="text-sm text-gray-400 hover:text-black dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Click and drag on the floorplan to draw the hotspot rectangle.
          </p>
          <div className="relative inline-block select-none rounded-lg border border-stroke dark:border-strokedark overflow-hidden">
            <img
              ref={imgRef}
              src={project.floorplan_url}
              alt="Floorplan"
              className="block max-w-full"
              draggable={false}
            />
            {/* Existing hotspots (other rooms) */}
            {rooms
              .filter((r) => r.floor_plan_coordinates && r.id !== editingRoomId)
              .map((r) => {
                const c = r.floor_plan_coordinates!;
                return (
                  <div
                    key={r.id}
                    style={{
                      position: 'absolute',
                      top: `${c.y}%`,
                      left: `${c.x}%`,
                      width: `${c.width}%`,
                      height: `${c.height}%`,
                    }}
                    className="border-2 border-primary bg-primary/10 rounded pointer-events-none"
                  >
                    <span className="absolute bottom-0 left-0 rounded bg-black/60 px-1 text-xs text-white">
                      {r.name}
                    </span>
                  </div>
                );
              })}
            {/* Draft rectangle being drawn */}
            {draft && (
              <div
                style={{
                  position: 'absolute',
                  top: `${draft.y}%`,
                  left: `${draft.x}%`,
                  width: `${draft.width}%`,
                  height: `${draft.height}%`,
                }}
                className="border-2 border-dashed border-yellow-400 bg-yellow-400/20 rounded pointer-events-none"
              />
            )}
            {/* Transparent draw overlay */}
            <div
              ref={overlayRef}
              className="absolute inset-0 cursor-crosshair"
              onMouseDown={handleOverlayMouseDown}
              onMouseMove={handleOverlayMouseMove}
              onMouseUp={handleOverlayMouseUp}
              onMouseLeave={() => { setDrawStart(null); setDraft(null); }}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function FloorplanDropZone({ onFile, uploading }: { onFile: (f: File) => void; uploading: boolean }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-8 py-12 text-center cursor-pointer transition-colors ${
        dragOver
          ? 'border-primary bg-primary/5'
          : 'border-gray-300 hover:border-primary dark:border-gray-600 dark:hover:border-primary'
      }`}
    >
      <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      {uploading ? (
        <p className="text-sm text-gray-500">Uploading…</p>
      ) : (
        <>
          <p className="text-sm font-medium text-black dark:text-white">Drop a floorplan image here</p>
          <p className="text-xs text-gray-400">JPEG, PNG, or WebP</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Members
// ---------------------------------------------------------------------------

function MembersTab({ project }: { project: ApiProject }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<ApiProjectMember[]>([]);
  const [allUsers, setAllUsers] = useState<ApiAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<'editor' | 'viewer'>('editor');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    Promise.all([listProjectMembers(project.id), user?.is_admin ? listAdminUsers() : Promise.resolve([])])
      .then(([m, u]) => { setMembers(m); setAllUsers(u); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load members'))
      .finally(() => setLoading(false));
  }, [project.id, user?.is_admin]);

  const nonMembers = allUsers.filter((u) => !members.some((m) => m.user_id === u.id));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserId) return;
    setAdding(true);
    setError(null);
    try {
      const m = await addProjectMember(project.id, { user_id: addUserId, role: addRole });
      setMembers((prev) => [...prev, m]);
      setAddUserId('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const updated = await updateProjectMember(project.id, userId, { role });
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? updated : m)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update role');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await removeProjectMember(project.id, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove member');
    }
  };

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
      )}

      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.user_id}
            className="flex items-center gap-3 rounded-md border border-stroke bg-white px-4 py-3 dark:border-strokedark dark:bg-boxdark"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm text-black dark:text-white">{m.username}</span>
              {m.email && <span className="ml-2 text-xs text-gray-400">{m.email}</span>}
            </div>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[m.role] ?? ROLE_BADGE.viewer}`}>
              {m.role}
            </span>
            {user?.is_admin && m.user_id !== user.id && (
              <>
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                  className={`${SELECT_CLASS} py-1 text-xs`}
                >
                  <option value="owner">owner</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleRemove(m.user_id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title="Remove member"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {user?.is_admin && nonMembers.length > 0 && (
        <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
          <select
            value={addUserId}
            onChange={(e) => setAddUserId(e.target.value)}
            className={`${SELECT_CLASS} flex-1 min-w-[180px]`}
            required
          >
            <option value="">Select user to add…</option>
            {nonMembers.map((u) => (
              <option key={u.id} value={u.id}>{u.username}{u.email ? ` (${u.email})` : ''}</option>
            ))}
          </select>
          <select
            value={addRole}
            onChange={(e) => setAddRole(e.target.value as 'editor' | 'viewer')}
            className={SELECT_CLASS}
          >
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>
          <button
            type="submit"
            disabled={adding || !addUserId}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Add member'}
          </button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type Tab = 'info' | 'setup' | 'members';

const ProjectSettingsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { setActiveProjectSlug } = useProject();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [project, setProject] = useState<ApiProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locationState = location.state as { tab?: Tab } | null;
  const initialTab: Tab = locationState?.tab ?? 'info';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (slug) setActiveProjectSlug(slug);
  }, [slug, setActiveProjectSlug]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getProjectBySlug(slug)
      .then(setProject)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load project'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (!slug) return <Navigate to="/projects" replace />;
  if (!user?.is_admin) return <Navigate to={`/projects/${slug}`} replace />;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'setup', label: 'Setup' },
    { id: 'members', label: 'Members' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-boxdark-2">
      <PageTitle title={project ? `${project.name} — Settings` : 'Settings'} />

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-stroke bg-white px-6 py-4 dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/projects/${slug}`)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-black dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {project && (
            <Link to={`/projects/${slug}`} className="font-semibold text-black hover:opacity-80 dark:text-white">
              {project.name}
            </Link>
          )}
          <span className="text-gray-400">/</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Settings</span>
        </div>
        <HeaderProfileMenu />
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error || !project ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-red-500">{error ?? 'Project not found'}</p>
          <Link to="/projects" className="text-sm font-medium text-primary hover:underline">Back to projects</Link>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Tabs */}
          <div className="mb-8 flex border-b border-stroke dark:border-strokedark">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'info' && (
            <InfoTab project={project} onUpdated={(p) => setProject(p)} />
          )}
          {activeTab === 'setup' && (
            <SetupTab project={project} onProjectUpdated={(p) => setProject(p)} />
          )}
          {activeTab === 'members' && (
            <MembersTab project={project} />
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectSettingsPage;
