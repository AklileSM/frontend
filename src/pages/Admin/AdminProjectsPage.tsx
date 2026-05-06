import React, { useCallback, useEffect, useState } from 'react';
import { deleteAdminProject, listAdminProjects, type ApiProject } from '../../services/apiClient';
import PageTitle from '../../components/PageTitle';

const STATUS_COLOR: Record<string, string> = {
  active: 'text-green-600 dark:text-green-400',
  on_hold: 'text-amber-600 dark:text-amber-400',
  completed: 'text-blue-600 dark:text-blue-400',
  archived: 'text-gray-400',
};

const AdminProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listAdminProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (p: ApiProject) => {
    if (!window.confirm(`Delete project "${p.name}"? This cannot be undone.`)) return;
    setDeleting(p.id);
    try {
      await deleteAdminProject(p.id);
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }, []);

  return (
    <div className="px-6 py-8">
      <PageTitle title="Admin · Projects" />
      <h1 className="mb-2 text-2xl font-bold text-black dark:text-white">All Projects</h1>
      {!loading && (
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'} on the platform
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke bg-gray-50 dark:border-strokedark dark:bg-gray-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-stroke/60 transition-colors hover:bg-gray-50 dark:border-strokedark/60 dark:hover:bg-gray-800/40"
                >
                  <td className="px-4 py-3 font-medium text-black dark:text-white">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-gray-500">{p.slug}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.location ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs uppercase ${STATUS_COLOR[p.status] ?? 'text-gray-400'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-gray-500">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={deleting === p.id}
                      onClick={() => handleDelete(p)}
                      title="Delete project"
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-40 dark:hover:bg-red-900/20"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No projects yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminProjectsPage;
