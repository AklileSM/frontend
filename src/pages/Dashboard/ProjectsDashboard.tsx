import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createProject, listProjects, type ApiProject, type ApiProjectCreateRequest } from '../../services/apiClient';
import PageTitle from '../../components/PageTitle';

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
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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
    <div className="px-6 py-8">
      <PageTitle title="Projects" />

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
            <div
              key={p.id}
              className="flex flex-col gap-3 rounded-lg border border-stroke bg-white p-5 shadow-sm dark:border-strokedark dark:bg-boxdark"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-black dark:text-white">{p.name}</h2>
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
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onCreated={(p) => {
            setProjects((prev) => [p, ...prev]);
            setShowCreate(false);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
};

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

function CreateProjectModal({
  onCreated,
  onClose,
}: {
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

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(autoSlug(v));
  };

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
      onCreated(await createProject(body));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl border border-stroke bg-white shadow-2xl dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
          <h2 className="font-semibold text-black dark:text-white">New project</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-black dark:hover:bg-gray-700 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

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
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="A6-Stern Extension"
              className={INPUT_CLASS}
              required
            />
          </Field>

          <Field label="Slug" required hint="Lowercase, numbers, hyphens">
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              }}
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
              onClick={onClose}
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
      </div>
    </div>
  );
}

export default ProjectsDashboard;
