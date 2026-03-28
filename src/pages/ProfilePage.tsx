import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from '../auth/authSession';
import {
  deleteFileAsset,
  deleteReport,
  listMyUploads,
  listReports,
  type ApiMyUpload,
  type ApiReport,
} from '../services/apiClient';

/** Same navigation contract as FileExplorer → StaticViewer / PCD. */
function openUploadedMedia(navigate: ReturnType<typeof useNavigate>, u: ApiMyUpload): void {
  const url = u.full_src ?? u.src;
  if (!url) return;

  if (u.media_type === 'image') {
    const cap =
      typeof u.capture_date === 'string' && u.capture_date.length >= 10
        ? u.capture_date.slice(0, 10)
        : u.capture_date;
    navigate('/staticViewer', {
      state: {
        imageUrl: url,
        fileId: u.id,
        displayFileName: u.file_name,
        roomLabel: u.room_name,
        captureDate: cap,
      },
    });
    return;
  }

  if (u.media_type === 'pointcloud') {
    navigate('/PCD', { state: { modelUrl: url, fileId: u.id } });
    return;
  }

  if (u.media_type === 'pdf') {
    navigate('/pdfViewer', { state: { pdfUrl: url, title: u.file_name } });
    return;
  }

  // Video: StaticViewer is image-only; load the asset in this tab (browser video player). Back returns to the app.
  if (u.media_type === 'video') {
    window.location.assign(url);
    return;
  }

  window.location.assign(url);
}

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

function safeDownloadBasename(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').replace(/[/\\?*:|"<>]/g, '_') || 'download';
  return base;
}

async function triggerFileDownload(url: string, filename: string): Promise<void> {
  const basename = safeDownloadBasename(filename);
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = basename;
    a.click();
    URL.revokeObjectURL(href);
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.download = basename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }
}

function canDeleteFiles(authUser: AuthUser | null): boolean {
  return Boolean(authUser && (authUser.role === 'admin' || authUser.role === 'manager'));
}

const PROFILE_MENU_PANEL_CLASS =
  'min-w-[10rem] rounded-lg border border-stroke bg-white py-1 shadow-lg dark:border-strokedark dark:bg-boxdark';

/** Renders the dropdown in `document.body` so it is not clipped by table `overflow` ancestors. */
function ProfilePortalMenu({
  open,
  onClose,
  anchorRef,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{
    top: number;
    left: number;
    maxHeight?: number;
  }>({ top: 0, left: 0 });

  const clampIntoViewport = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const margin = 8;
    const gap = 4;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const a = anchor.getBoundingClientRect();
    const m = panel.getBoundingClientRect();
    const w = m.width;
    const h = m.height;

    let left = a.right - w;
    if (left < margin) left = margin;
    if (left + w > vw - margin) left = Math.max(margin, vw - margin - w);

    let top = a.bottom + gap;
    if (top + h > vh - margin) {
      const aboveTop = a.top - h - gap;
      if (aboveTop >= margin) {
        top = aboveTop;
      }
    }
    if (top < margin) top = margin;

    let maxHeight: number | undefined;
    if (top + h > vh - margin) {
      maxHeight = Math.max(80, vh - margin - top);
    }

    setPlacement({ top, left, maxHeight });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    clampIntoViewport();
  }, [open, clampIntoViewport]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => clampIntoViewport();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, clampIntoViewport]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      className={PROFILE_MENU_PANEL_CLASS}
      style={{
        position: 'fixed',
        top: placement.top,
        left: placement.left,
        zIndex: 10050,
        maxHeight: placement.maxHeight,
        overflowY: placement.maxHeight ? 'auto' : undefined,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

function ReportActionsMenu({
  report,
  onOpenPdf,
  onDownload,
  onRequestDelete,
  busy,
}: {
  report: ApiReport;
  onOpenPdf: () => void;
  onDownload: () => void;
  onRequestDelete: () => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex justify-end">
      <button
        ref={anchorRef}
        type="button"
        disabled={busy}
        aria-label="Report actions"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-meta-4 disabled:opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
          />
        </svg>
      </button>
      <ProfilePortalMenu open={open} onClose={() => setOpen(false)} anchorRef={anchorRef}>
        <button
          type="button"
          role="menuitem"
          disabled={!report.pdf_url || busy}
          onClick={() => {
            if (report.pdf_url) onOpenPdf();
            setOpen(false);
          }}
          className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-meta-4"
        >
          Open PDF
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={!report.pdf_url || busy}
          onClick={() => {
            if (report.pdf_url) onDownload();
            setOpen(false);
          }}
          className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-meta-4"
        >
          Download
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={busy}
          onClick={() => {
            onRequestDelete();
            setOpen(false);
          }}
          className="block w-full px-4 py-2 text-left text-sm text-danger hover:bg-gray-100 dark:hover:bg-meta-4"
        >
          Delete
        </button>
      </ProfilePortalMenu>
    </div>
  );
}

function UploadActionsMenu({
  upload,
  onView,
  onRequestDelete,
  busy,
}: {
  upload: ApiMyUpload;
  onView: () => void;
  onRequestDelete: () => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const url = upload.full_src ?? upload.src;

  return (
    <div className="flex justify-end">
      <button
        ref={anchorRef}
        type="button"
        disabled={busy}
        aria-label="Upload actions"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-meta-4 disabled:opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
          />
        </svg>
      </button>
      <ProfilePortalMenu open={open} onClose={() => setOpen(false)} anchorRef={anchorRef}>
        <button
          type="button"
          role="menuitem"
          disabled={!url || busy}
          onClick={() => {
            onView();
            setOpen(false);
          }}
          className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-meta-4"
        >
          View
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={busy}
          onClick={() => {
            onRequestDelete();
            setOpen(false);
          }}
          className="block w-full px-4 py-2 text-left text-sm text-danger hover:bg-gray-100 dark:hover:bg-meta-4"
        >
          Delete
        </button>
      </ProfilePortalMenu>
    </div>
  );
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const showUploads = useMemo(() => user?.role === 'admin' || user?.role === 'manager', [user?.role]);

  const [reports, setReports] = useState<ApiReport[] | null>(null);
  const [uploads, setUploads] = useState<ApiMyUpload[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadsError, setUploadsError] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [reportPendingDelete, setReportPendingDelete] = useState<ApiReport | null>(null);
  const [reportDeleteModalError, setReportDeleteModalError] = useState<string | null>(null);
  const [uploadPendingDelete, setUploadPendingDelete] = useState<ApiMyUpload | null>(null);
  const [uploadDeleteModalError, setUploadDeleteModalError] = useState<string | null>(null);
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);

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

  const closeReportDeleteModal = () => {
    if (deletingReportId) return;
    setReportPendingDelete(null);
    setReportDeleteModalError(null);
  };

  const confirmDeleteReport = async () => {
    const r = reportPendingDelete;
    if (!r) return;
    setReportDeleteModalError(null);
    setDeletingReportId(r.id);
    try {
      await deleteReport(r.id);
      setReportPendingDelete(null);
      setReports((prev) => (prev ? prev.filter((x) => x.id !== r.id) : null));
    } catch (e) {
      setReportDeleteModalError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingReportId(null);
    }
  };

  const closeUploadDeleteModal = () => {
    if (deletingUploadId) return;
    setUploadPendingDelete(null);
    setUploadDeleteModalError(null);
  };

  const confirmDeleteUpload = async () => {
    const u = uploadPendingDelete;
    if (!u || !canDeleteFiles(user)) return;
    setUploadDeleteModalError(null);
    setDeletingUploadId(u.id);
    try {
      await deleteFileAsset(u.id);
      setUploadPendingDelete(null);
      setUploads((prev) => (prev ? prev.filter((x) => x.id !== u.id) : null));
    } catch (e) {
      setUploadDeleteModalError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingUploadId(null);
    }
  };

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
              Open an image from the room explorer and publish a report from the viewer.
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
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                    Actions
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
                      <ReportActionsMenu
                        report={r}
                        busy={deletingReportId === r.id}
                        onOpenPdf={() =>
                          navigate('/pdfViewer', {
                            state: {
                              pdfUrl: r.pdf_url!,
                              title: `Observation report ${r.id.slice(0, 8)}…`,
                            },
                          })
                        }
                        onDownload={() =>
                          void triggerFileDownload(
                            r.pdf_url!,
                            `observation-report-${r.id.slice(0, 8)}.pdf`,
                          )
                        }
                        onRequestDelete={() => {
                          setReportDeleteModalError(null);
                          setReportPendingDelete(r);
                        }}
                      />
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
            Files you uploaded (images, videos, point clouds, PDFs).
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
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                      Actions
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
                        <UploadActionsMenu
                          upload={u}
                          busy={deletingUploadId === u.id}
                          onView={() => openUploadedMedia(navigate, u)}
                          onRequestDelete={() => {
                            if (!canDeleteFiles(user)) return;
                            setUploadDeleteModalError(null);
                            setUploadPendingDelete(u);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      {reportPendingDelete ? (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-report-delete-title"
            className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900"
          >
            <h2
              id="profile-report-delete-title"
              className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-200"
            >
              Delete report
            </h2>
            <p className="mb-6 text-lg text-gray-900 dark:text-gray-200">
              Delete observation report{' '}
              <span className="font-mono">{reportPendingDelete.id.slice(0, 8)}…</span>? This cannot be
              undone.
            </p>
            {reportDeleteModalError ? (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{reportDeleteModalError}</p>
            ) : null}
            <div className="mt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeReportDeleteModal}
                disabled={!!deletingReportId}
                className="rounded-lg bg-gray-300 px-4 py-2 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteReport()}
                disabled={!!deletingReportId}
                className="rounded-lg bg-red-600 px-4 py-2 text-white shadow-md hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingReportId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {uploadPendingDelete && canDeleteFiles(user) ? (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-upload-delete-title"
            className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900"
          >
            <h2
              id="profile-upload-delete-title"
              className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-200"
            >
              Delete file
            </h2>
            <p className="mb-6 text-lg text-gray-900 dark:text-gray-200">
              Delete &quot;{uploadPendingDelete.file_name}&quot;? This cannot be undone.
            </p>
            {uploadDeleteModalError ? (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{uploadDeleteModalError}</p>
            ) : null}
            <div className="mt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeUploadDeleteModal}
                disabled={!!deletingUploadId}
                className="rounded-lg bg-gray-300 px-4 py-2 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteUpload()}
                disabled={!!deletingUploadId}
                className="rounded-lg bg-red-600 px-4 py-2 text-white shadow-md hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingUploadId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProfilePage;
