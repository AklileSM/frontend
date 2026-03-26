import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listMyUploads, listReports, type ApiMyUpload, type ApiReport } from '../services/apiClient';

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

function formatDateOnly(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
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
  const showUploads = useMemo(() => user?.role === 'admin' || user?.role === 'manager', [user?.role]);

  const [reports, setReports] = useState<ApiReport[] | null>(null);
  const [uploads, setUploads] = useState<ApiMyUpload[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadsError, setUploadsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setUploadsError(null);
    setLoading(true);
    try {
      const rep = await listReports();
      setReports(rep);
    } catch (e) {
      setReports(null);
      setError(e instanceof Error ? e.message : 'Could not load reports.');
      setUploads(null);
      setLoading(false);
      return;
    }

    if (!showUploads) {
      setUploads(null);
      setLoading(false);
      return;
    }

    try {
      const up = await listMyUploads();
      setUploads(up);
    } catch (e) {
      setUploads([]);
      setUploadsError(e instanceof Error ? e.message : 'Could not load uploads.');
    } finally {
      setLoading(false);
    }
  }, [showUploads]);

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

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold text-black dark:text-white">Activity</h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div
          className="mb-6 rounded-lg border border-danger bg-danger bg-opacity-10 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {/* Reports — all roles */}
      <section className="mb-10">
        <h3 className="mb-2 text-lg font-semibold text-black dark:text-white">Field observation reports</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          PDFs you published. Download links are temporary, refresh this page for new links.
        </p>

        {loading && !reports ? (
          <p className="text-gray-600 dark:text-gray-300">Loading reports…</p>
        ) : null}

        {!loading && reports && reports.length === 0 ? (
          <div className="rounded-lg border border-stroke bg-gray-50 p-8 text-center dark:border-strokedark dark:bg-gray-800">
            <p className="text-gray-700 dark:text-gray-200">No reports stored for your account yet.</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Open an image from the room explorer andpublish a report from the viewer.
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
      </section>

      {/* Uploads — admin & manager only */}
      {showUploads ? (
        <section>
          <h3 className="mb-2 text-lg font-semibold text-black dark:text-white">Uploaded media</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Files you uploaded (images, videos, point clouds).
          </p>

          {uploadsError ? (
            <div
              className="mb-4 rounded-lg border border-danger bg-danger bg-opacity-10 px-4 py-3 text-sm text-danger"
              role="alert"
            >
              {uploadsError}
            </div>
          ) : null}

          {loading && uploads === null ? (
            <p className="text-gray-600 dark:text-gray-300">Loading uploads…</p>
          ) : null}

          {!loading && uploads && uploads.length === 0 && !uploadsError ? (
            <div className="rounded-lg border border-stroke bg-gray-50 p-8 text-center dark:border-strokedark dark:bg-gray-800">
              <p className="text-gray-700 dark:text-gray-200">No uploads recorded under your account yet.</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Upload from the project explorer when your role allows it.
              </p>
            </div>
          ) : null}

          {uploads && uploads.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
              <table className="min-w-full divide-y divide-stroke dark:divide-strokedark">
                <thead className="bg-gray-50 dark:bg-meta-4">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                      Uploaded
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                      Room
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                      File
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                      Capture date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                      Open
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke bg-white dark:divide-strokedark dark:bg-boxdark">
                  {uploads.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-meta-4">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                        {formatWhen(u.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <span title={u.room_slug}>{u.room_name}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-700 dark:text-gray-300">
                        {u.media_type}
                      </td>
                      <td className="max-w-[200px] px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <span className="break-words">{u.file_name}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {formatDateOnly(u.capture_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <a
                          href={u.full_src ?? u.src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
};

export default ProfilePage;
