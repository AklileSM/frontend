import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listReports, type ApiReport } from '../services/apiClient';

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function truncate(s: string | null | undefined, max: number): string {
  if (s == null || s === '') return '—';
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ApiReport[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await listReports();
      setReports(data);
    } catch (e) {
      setReports(null);
      setError(e instanceof Error ? e.message : 'Could not load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-8 border-b border-stroke pb-6 dark:border-strokedark">
        <h1 className="text-2xl font-bold text-black dark:text-white">Profile</h1>
        {user ? (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            <p>
              <span className="font-medium text-gray-800 dark:text-gray-200">Username:</span>{' '}
              {user.username}
            </p>
            {user.email ? (
              <p className="mt-1">
                <span className="font-medium text-gray-800 dark:text-gray-200">Email:</span> {user.email}
              </p>
            ) : null}
            <p className="mt-1 capitalize">
              <span className="font-medium text-gray-800 dark:text-gray-200">Role:</span> {user.role}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold text-black dark:text-white">Your field observation reports</h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Reports you published while signed in (linked to a file from the explorer). Download links are temporary and
        refresh when you reload this page.
      </p>

      {error ? (
        <div
          className="rounded-lg border border-danger bg-danger bg-opacity-10 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {loading && !reports ? (
        <p className="text-gray-600 dark:text-gray-300">Loading reports…</p>
      ) : null}

      {!loading && reports && reports.length === 0 ? (
        <div className="rounded-lg border border-stroke bg-gray-50 p-8 text-center dark:border-strokedark dark:bg-gray-800">
          <p className="text-gray-700 dark:text-gray-200">No reports stored for your account yet.</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Open an image from the room explorer, publish a report from the viewer, and stay signed in.
          </p>
          <Link
            to="/A6_stern"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Go to projects
          </Link>
        </div>
      ) : null}

      {reports && reports.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
          <table className="min-w-full divide-y divide-stroke dark:divide-strokedark">
            <thead className="bg-gray-50 dark:bg-meta-4">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                  File
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                  Summary
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                  Flags
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                  PDF
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke bg-white dark:divide-strokedark dark:bg-boxdark">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-meta-4">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                    {formatWhen(r.created_at)}
                  </td>
                  <td className="max-w-[140px] px-4 py-3">
                    <span className="font-mono text-xs text-gray-700 dark:text-gray-300" title={r.file_id}>
                      {r.file_id.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="max-w-md px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    <div className="space-y-1">
                      {r.ai_description ? (
                        <p>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">AI / visual: </span>
                          {truncate(r.ai_description, 120)}
                        </p>
                      ) : null}
                      {r.manual_observations ? (
                        <p>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Notes: </span>
                          {truncate(r.manual_observations, 120)}
                        </p>
                      ) : null}
                      {!r.ai_description && !r.manual_observations ? (
                        <span className="text-gray-400">—</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(r.flags ?? []).length === 0 ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        r.flags.map((f) => (
                          <span
                            key={f}
                            className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/25"
                          >
                            {f}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {r.pdf_url ? (
                      <a
                        href={r.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Open PDF
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">No file</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default ProfilePage;
