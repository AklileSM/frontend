import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CheckboxDropdown from '../../components/CheckboxDropdown';
import { EXPLORER_DATE_SCOPE_A6, useSelectedDate } from '../../components/selectedDate ';
import Thumbnail from '../../components/Thumbnail';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { useNavigate } from 'react-router-dom';
import {
  ApiMediaFile,
  ApiRoom,
  ApiRoomMediaGroup,
  deleteFileAsset,
  getExplorerByDate,
  listProjects,
  listRooms,
  retryPointcloudConversion,
  uploadSingleFile,
} from '../../services/apiClient';
import type { AuthUser } from '../../auth/authSession';
import { useAuth } from '../../context/AuthContext';

export type FileExplorerProps = {
  /** When set, only rooms belonging to this project slug are listed (empty if project missing). */
  filterProjectSlug?: string;
  /** Optional label for breadcrumb when scoped to a project. */
  projectLabel?: string;
};

const FileExplorer: React.FC<FileExplorerProps> = ({ filterProjectSlug, projectLabel }) => {
  const { getDateForScope, setDateForScope } = useSelectedDate();
  const dateScope = filterProjectSlug ?? EXPLORER_DATE_SCOPE_A6;
  const selectedDate = getDateForScope(dateScope);
  const { user } = useAuth();
  const canUpload = user?.is_admin ?? false;
  const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'pointclouds' | 'pdfs'>('images');
  const [collapsedRooms, setCollapsedRooms] = useState<{ [room: string]: boolean }>({});
  const [hiddenRooms, setHiddenRooms] = useState<Set<string>>(new Set());
  const [roomsForDate, setRoomsForDate] = useState<Record<string, ApiRoomMediaGroup>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  const [roomOptions, setRoomOptions] = useState<ApiRoom[]>([]);
  const [roomSlug, setRoomSlug] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState<string | null>(null);
  const [roomsFetchError, setRoomsFetchError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filePendingDelete, setFilePendingDelete] = useState<ApiMediaFile | null>(null);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryErrors, setRetryErrors] = useState<Record<string, string>>({});

  const committedDateRef = useRef<string | null>(selectedDate);
  const [pendingDateChange, setPendingDateChange] = useState<string | null>(null);
  const [dateChangeConfirmOpen, setDateChangeConfirmOpen] = useState(false);

  useEffect(() => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [activeTab]);

  useEffect(() => {
    if (selectedDate === committedDateRef.current) return;
    if (file || uploading) {
      setDateForScope(dateScope, committedDateRef.current);
      setPendingDateChange(selectedDate);
      setDateChangeConfirmOpen(true);
    } else {
      committedDateRef.current = selectedDate;
      setUploadError(null);
      setUploadOk(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [selectedDate]);

  useEffect(() => {
    let cancelled = false;
    setRoomsFetchError(null);
    Promise.all([listRooms(), listProjects()])
      .then(([rooms, projects]) => {
        if (cancelled) return;
        let list = rooms;
        if (filterProjectSlug) {
          const proj = projects.find((x) => x.slug === filterProjectSlug);
          list = proj ? rooms.filter((r) => r.project_id === proj.id) : [];
        }
        setRoomOptions(list);
        if (list.length > 0) {
          setRoomSlug((prev) => (prev && list.some((r) => r.slug === prev) ? prev : list[0].slug));
        } else {
          setRoomSlug('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRoomOptions([]);
          setRoomSlug('');
          setRoomsFetchError(err instanceof Error ? err.message : 'Could not load rooms.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filterProjectSlug]);

  const explorerFallbackRooms = useMemo((): ApiRoom[] => {
    const out: ApiRoom[] = [];
    for (const name of Object.keys(roomsForDate).sort((a, b) => a.localeCompare(b))) {
      const m = name.match(/^Room\s+(\d+)$/i);
      if (m) {
        const slug = `room${m[1]}`;
        out.push({ id: slug, name, slug, project_id: '', floor_plan_coordinates: null, sort_order: 0 });
      }
    }
    return out;
  }, [roomsForDate]);

  const effectiveRoomOptions =
    roomOptions.length > 0 ? roomOptions : filterProjectSlug ? [] : explorerFallbackRooms;

  useEffect(() => {
    if (effectiveRoomOptions.length === 0) return;
    setRoomSlug((prev) =>
      prev && effectiveRoomOptions.some((r) => r.slug === prev) ? prev : effectiveRoomOptions[0].slug,
    );
  }, [effectiveRoomOptions]);

  useEffect(() => {
    if (!selectedDate) {
      setRoomsForDate({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getExplorerByDate(selectedDate)
      .then((response) => {
        if (!cancelled) {
          setRoomsForDate(response.rooms || {});
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load files.');
          setRoomsForDate({});
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, refreshKey]);

  const reloadExplorer = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  /** API returns all rooms for the date; restrict to this project's rooms when filtered. */
  const thumbnailsForSelectedDate = useMemo(() => {
    if (!filterProjectSlug) return roomsForDate;
    const allowed = new Set(roomOptions.map((r) => r.name));
    const out: Record<string, ApiRoomMediaGroup> = {};
    for (const [name, group] of Object.entries(roomsForDate)) {
      if (allowed.has(name)) out[name] = group;
    }
    return out;
  }, [roomsForDate, roomOptions, filterProjectSlug]);

  const toggleRoomCollapse = (room: string) => {
    setCollapsedRooms((prevState) => ({
      ...prevState,
      [room]: !prevState[room],
    }));
  };

  const toggleRoomFilter = (roomName: string) => {
    setHiddenRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomName)) next.delete(roomName);
      else next.add(roomName);
      return next;
    });
  };

  const allRoomNames = Object.keys(thumbnailsForSelectedDate).sort();
  const visibleRooms = allRoomNames.filter((r) => !hiddenRooms.has(r));

  const selectAllRooms = () => setHiddenRooms(new Set());
  const clearAllRooms = () => setHiddenRooms(new Set(allRoomNames));

  const calculateFileCounts = () => {
    let imageCount = 0;
    let videoCount = 0;
    let pointcloudCount = 0;
    let pdfCount = 0;

    Object.values(thumbnailsForSelectedDate).forEach((room) => {
      imageCount += room.images.length;
      videoCount += room.videos.length;
      pointcloudCount += room.pointclouds.length;
      pdfCount += room.pdfs?.length ?? 0;
    });

    return { imageCount, videoCount, pointcloudCount, pdfCount };
  };

  const { imageCount, videoCount, pointcloudCount, pdfCount } = calculateFileCounts();

  useEffect(() => {
    const initialCollapsedRooms: { [room: string]: boolean } = {};

    Object.entries(thumbnailsForSelectedDate).forEach(([room, media]) => {
      const hasFiles = (media[activeTab] || []).length > 0;
      initialCollapsedRooms[room] = !hasFiles;
    });

    setCollapsedRooms(initialCollapsedRooms);
  }, [activeTab, thumbnailsForSelectedDate]);

  const canDeleteFiles = (authUser: AuthUser | null): boolean =>
    Boolean(authUser?.is_admin);

  const openDeleteModal = (f: ApiMediaFile) => {
    if (!canDeleteFiles(user) || deletingId) return;
    setDeleteModalError(null);
    setFilePendingDelete(f);
  };

  const closeDeleteModal = () => {
    if (deletingId) return;
    setFilePendingDelete(null);
    setDeleteModalError(null);
  };

  const confirmDeleteFile = async () => {
    const f = filePendingDelete;
    if (!f || !canDeleteFiles(user)) return;
    setDeleteModalError(null);
    setDeletingId(f.id);
    try {
      await deleteFileAsset(f.id);
      setFilePendingDelete(null);
      reloadExplorer();
    } catch (e) {
      setDeleteModalError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRetryConversion = async (fileId: string) => {
    setRetryingId(fileId);
    setRetryErrors((prev) => { const next = { ...prev }; delete next[fileId]; return next; });
    try {
      await retryPointcloudConversion(fileId);
      reloadExplorer();
    } catch (e) {
      setRetryErrors((prev) => ({ ...prev, [fileId]: e instanceof Error ? e.message : 'Retry failed' }));
    } finally {
      setRetryingId(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedDate || !file || !roomSlug) return;
    if (activeTab !== 'images' && activeTab !== 'pdfs' && activeTab !== 'pointclouds') return;
    const mediaType = activeTab === 'pdfs' ? 'pdf' : activeTab === 'pointclouds' ? 'pointcloud' : 'image';
    setUploadError(null);
    setUploadOk(null);
    setUploadProgress(0);
    setUploading(true);
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    try {
      await uploadSingleFile({
        file,
        roomSlug,
        mediaType,
        captureDate: selectedDate,
        onProgress: (percent) => setUploadProgress(percent),
        signal: controller.signal,
      });
      setUploadOk(activeTab === 'pointclouds' ? `Uploaded "${file.name}". Converting to Potree format \u2014 check back in a few minutes.` : `Uploaded "${file.name}".`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // stay on current tab after upload
      reloadExplorer();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // user cancelled — reset silently
      } else {
        setUploadError(e instanceof Error ? e.message : 'Upload failed');
      }
    } finally {
      uploadAbortRef.current = null;
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Refs for navigation guard — avoids stale closures in patched pushState
  const guardActiveRef = useRef(false);
  const pendingNavDestRef = useRef<string | null>(null);
  const leaveViaBackRef = useRef(false);
  const popstateHandlerRef = useRef<(() => void) | null>(null);

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  // Keep guard ref in sync with state so the patched pushState always sees current values
  useEffect(() => {
    guardActiveRef.current = file !== null || uploading;
  }, [file, uploading]);

  // Patch window.history.pushState once on mount to intercept all React Router forward navigations.
  // Restores the original on unmount.
  useEffect(() => {
    const original = window.history.pushState.bind(window.history);
    window.history.pushState = (...args: Parameters<typeof window.history.pushState>) => {
      const url = args[2];
      if (guardActiveRef.current && url != null) {
        // Only intercept navigations to a different pathname
        try {
          const dest = new URL(url.toString(), window.location.origin);
          if (dest.pathname !== window.location.pathname) {
            pendingNavDestRef.current = url.toString();
            setLeaveConfirmOpen(true);
            return;
          }
        } catch { /* unparseable URL — let it through */ }
      }
      original(...args);
    };
    return () => { window.history.pushState = original; };
  }, []);

  // Block browser back/forward when file selected or uploading
  useEffect(() => {
    if (!file && !uploading) return;
    window.history.pushState(null, ''); // guard entry
    const handler = () => {
      window.history.pushState(null, ''); // re-push to stay in place
      leaveViaBackRef.current = true;
      setLeaveConfirmOpen(true);
    };
    popstateHandlerRef.current = handler;
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      popstateHandlerRef.current = null;
    };
  }, [file, uploading]);

  // Warn before tab close / reload / external navigation
  useEffect(() => {
    if (!file && !uploading) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [file, uploading]);

  const handleCancelUpload = () => {
    uploadAbortRef.current?.abort();
    setCancelConfirmOpen(false);
  };

  const handleConfirmDateChange = () => {
    uploadAbortRef.current?.abort();
    setUploading(false);
    setUploadProgress(null);
    setUploadError(null);
    setUploadOk(null);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    committedDateRef.current = pendingDateChange;
    setDateForScope(dateScope, pendingDateChange);
    setPendingDateChange(null);
    setDateChangeConfirmOpen(false);
  };

  const handleCancelDateChange = () => {
    setPendingDateChange(null);
    setDateChangeConfirmOpen(false);
  };

  const handleConfirmLeave = () => {
    // Remove popstate handler before navigating to avoid re-triggering
    if (popstateHandlerRef.current) {
      window.removeEventListener('popstate', popstateHandlerRef.current);
      popstateHandlerRef.current = null;
    }
    guardActiveRef.current = false; // disable guard so navigate() goes through the patch
    uploadAbortRef.current?.abort();
    setLeaveConfirmOpen(false);
    if (leaveViaBackRef.current) {
      leaveViaBackRef.current = false;
      // Undo the initial guard push + the re-push in the handler, then go back one real step
      window.history.go(-3);
    } else {
      const dest = pendingNavDestRef.current;
      pendingNavDestRef.current = null;
      if (dest) {
        try {
          const parsed = new URL(dest, window.location.origin);
          navigate(parsed.pathname + parsed.search);
        } catch {
          navigate(dest);
        }
      }
    }
  };

  const handleCancelLeave = () => {
    leaveViaBackRef.current = false;
    pendingNavDestRef.current = null;
    setLeaveConfirmOpen(false);
  };

  // Auto-poll every 5 s when any visible point cloud is still converting.
  useEffect(() => {
    const hasPending = Object.values(thumbnailsForSelectedDate).some((group) =>
      group.pointclouds.some(
        (f) => f.conversion_status === 'pending' || f.conversion_status === 'processing',
      ),
    );
    if (!hasPending) return;
    const id = setInterval(() => setRefreshKey((k) => k + 1), 5000);
    return () => clearInterval(id);
  }, [thumbnailsForSelectedDate]);

  const renderThumbnails = (thumbnails: ApiMediaFile[], roomDisplayName: string) => {
    return (
      <div className="grid grid-cols-2 gap-4">
        {thumbnails.map((thumbnail) => {
          const fileName = thumbnail.file_name;
          const showDelete = canDeleteFiles(user);
          const isPointcloudReady =
            thumbnail.type !== 'pointcloud' || thumbnail.conversion_status === 'ready';
          const isPointcloudPending =
            thumbnail.type === 'pointcloud' &&
            (thumbnail.conversion_status === 'pending' || thumbnail.conversion_status === 'processing');
          const isPointcloudFailed =
            thumbnail.type === 'pointcloud' && thumbnail.conversion_status === 'failed';

          return (
            <div
              key={thumbnail.id}
              className={`flex flex-col mb-4 max-w-s ${isPointcloudPending ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => {
                if (!isPointcloudReady) return;
                if (thumbnail.type === 'image') {
                  navigate('/staticViewer', {
                    state: {
                      imageUrl: thumbnail.full_src || thumbnail.src,
                      fileId: thumbnail.id,
                      displayFileName: thumbnail.file_name,
                      roomLabel: roomDisplayName,
                      captureDate: thumbnail.capture_date,
                    },
                  });
                } else if (thumbnail.type === 'pointcloud') {
                  navigate('/staticPointCloudViewer', {
                    state: {
                      modelUrl: thumbnail.full_src || thumbnail.src,
                      fileId: thumbnail.id,
                      displayFileName: thumbnail.file_name,
                      roomLabel: roomDisplayName,
                      captureDate: thumbnail.capture_date,
                    },
                  });
                } else if (thumbnail.type === 'pdf') {
                  navigate('/pdfViewer', {
                    state: {
                      pdfUrl: thumbnail.full_src || thumbnail.src,
                      title: thumbnail.file_name,
                    },
                  });
                } else if (thumbnail.type === 'video') {
                  window.open(thumbnail.full_src || thumbnail.src, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              <div className="relative">
                <Thumbnail
                  src={thumbnail.src}
                  type={thumbnail.type}
                  conversionStatus={thumbnail.conversion_status}
                  conversionError={thumbnail.conversion_error}
                />
                {showDelete ? (
                  <button
                    type="button"
                    title="Delete file"
                    disabled={!!deletingId}
                    className="absolute right-1 top-1 rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white shadow hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteModal(thumbnail);
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
              <p className="text-sm text-center text-gray-600 dark:text-gray-200 mt-2">{fileName}</p>
              {isPointcloudFailed && canUpload && (
                <div className="mt-2 flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={retryingId === thumbnail.id}
                    onClick={() => void handleRetryConversion(thumbnail.id)}
                    className="rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {retryingId === thumbnail.id ? 'Retrying…' : 'Retry conversion'}
                  </button>
                  {retryErrors[thumbnail.id] && (
                    <p className="text-xs text-red-500 text-center">{retryErrors[thumbnail.id]}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSkeletonThumbnail = (key: number) => (
    <div key={key} className="flex flex-col mb-4">
      <div className="p-2">
        <div className="animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 h-48 w-full" />
      </div>
      <div className="animate-pulse rounded bg-gray-200 dark:bg-gray-700 h-3 w-2/3 mx-auto mt-2" />
    </div>
  );

  const renderSkeletonRoom = (thumbCount: number, key: number) => (
    <div key={key} className="mb-4">
      <div className="animate-pulse flex items-center bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-md shadow">
        <div className="flex-grow h-5 rounded bg-gray-300 dark:bg-gray-600 w-1/3" />
        <div className="h-4 w-4 rounded bg-gray-300 dark:bg-gray-600 ml-2" />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {Array.from({ length: thumbCount }, (_, i) => renderSkeletonThumbnail(i))}
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div>
          {renderSkeletonRoom(4, 0)}
          {renderSkeletonRoom(2, 1)}
        </div>
      );
    }

    if (error) {
      return <p className="text-center text-red-500">{error}</p>;
    }

    if (allRoomNames.length === 0) {
      return <p className="text-center text-bodydark dark:text-gray-400">No files available</p>;
    }

    return visibleRooms.map((room) => {
      const media = thumbnailsForSelectedDate[room]!;
      return (
      <div key={room} className="mb-4">
        <div
          onClick={() => toggleRoomCollapse(room)}
          className="flex items-center cursor-pointer bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-md shadow hover:shadow-lg transition duration-200 ease-in-out"
        >
          <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 flex-grow">
            {room}
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              ({(media[activeTab] || []).length})
            </span>
          </h3>
          <svg
            className={`transition-transform duration-200 transform ${collapsedRooms[room] ? '' : 'rotate-90'}`}
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <div
          style={{
            maxHeight: collapsedRooms[room] ? '0px' : '1000px',
            opacity: collapsedRooms[room] ? 0 : 1,
            overflow: 'hidden',
            transition: 'max-height 0.5s ease, opacity 0.5s ease',
            marginTop: collapsedRooms[room] ? '0px' : '1rem',
          }}
        >
          {(media[activeTab] || []).length > 0 ? (
            renderThumbnails(media[activeTab], room)
          ) : (
            <p className="text-center text-bodydark dark:text-gray-400 mt-2">
              No {activeTab} available for this room
            </p>
          )}
        </div>
      </div>
    );
    });
  };

  const breadcrumbLabel =
    projectLabel && selectedDate
      ? `${projectLabel} · ${selectedDate}`
      : projectLabel || selectedDate || 'Explorer';

  return (
    <>
      <Breadcrumb pageName={breadcrumbLabel} />
      <div className="w-full bg-white rounded-md shadow-default dark:bg-boxdark dark:text-white">
        <div className="flex items-start justify-between gap-4 p-4 border-b border-gray-300 dark:border-strokedark">
          <div className="min-w-0">
            {projectLabel ? (
              <p className="text-sm font-medium text-bodydark dark:text-gray-400 mb-1">{projectLabel}</p>
            ) : null}
            <h1 className="text-xl font-bold text-black dark:text-white">
              Selected Date: <span className="font-semibold">{selectedDate || 'None'}</span>
            </h1>
            <p className="text-sm text-black dark:text-gray-400 mt-2">
              Images ({imageCount}), Videos ({videoCount}), Pointcloud data ({pointcloudCount}), PDFs ({pdfCount})
            </p>
          </div>
          {allRoomNames.length > 1 && (
            <div className="flex shrink-0 items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Rooms:</span>
              <CheckboxDropdown
                label="Rooms"
                options={allRoomNames}
                hidden={hiddenRooms}
                onToggle={toggleRoomFilter}
                onSelectAll={selectAllRooms}
                onClearAll={clearAllRooms}
              />
            </div>
          )}
        </div>

        {selectedDate && canUpload && (activeTab === 'images' || activeTab === 'pdfs' || activeTab === 'pointclouds') && (
          <div className="p-4 border-b border-gray-300 dark:border-strokedark bg-gray-50 dark:bg-meta-4/30">
            <h2 className="text-sm font-semibold text-black dark:text-white mb-3">
              {activeTab === 'pdfs' ? 'Upload PDF' : activeTab === 'pointclouds' ? 'Upload point cloud (.laz)' : 'Upload image'}
            </h2>
            <p className="text-xs text-bodydark dark:text-gray-400 mb-3">
              Files are stored for this selected date and the room you pick. They appear under that room in the lists
              below (same as existing captures).
            </p>
            {effectiveRoomOptions.length === 0 ? (
              <div className="text-sm text-bodydark dark:text-gray-400 space-y-1">
                <p>No rooms available yet.</p>
                {roomsFetchError ? (
                  <p className="text-amber-600 dark:text-amber-400">
                    Room list API failed: {roomsFetchError}. Pick a date above so the explorer loads, then refresh — or
                    redeploy the backend (fix for <code className="text-xs">/api/rooms</code> trailing slash).
                  </p>
                ) : (
                  <p>Pick a date and wait for the room list below to load, or seed the database (bootstrap creates Room 1–6).</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                {roomOptions.length === 0 && explorerFallbackRooms.length > 0 ? (
                  <p className="w-full text-xs text-gray-500 dark:text-gray-400">
                    Using room list from the explorer (API <code className="text-xs">/api/rooms</code> did not return data).
                  </p>
                ) : null}
                <div className="flex flex-col gap-1 min-w-[180px]">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Room</label>
                  <select
                    value={roomSlug}
                    onChange={(e) => setRoomSlug(e.target.value)}
                    className="rounded-md border border-stroke bg-white px-3 py-2 text-sm text-black dark:border-strokedark dark:bg-gray-800 dark:text-white"
                  >
                    {effectiveRoomOptions.map((r) => (
                      <option key={r.id} value={r.slug}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {activeTab === 'pdfs' ? 'PDF file' : activeTab === 'pointclouds' ? 'LAZ file' : 'Image file'}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={activeTab === 'pdfs' ? 'application/pdf,.pdf' : activeTab === 'pointclouds' ? '.laz,.las' : 'image/*'}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                  />
                </div>
                <button
                  type="button"
                  disabled={uploading || !file}
                  onClick={handleUpload}
                  className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? (uploadProgress != null ? `Uploading… ${uploadProgress}%` : 'Uploading…') : 'Upload'}
                </button>
                {uploading && (
                  <button
                    type="button"
                    onClick={() => setCancelConfirmOpen(true)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
            {uploading && uploadProgress != null && (
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full bg-primary transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-bodydark dark:text-gray-400">
                  Upload progress: {uploadProgress}%
                </p>
              </div>
            )}
            {uploadError && <p className="mt-2 text-sm text-red-500">{uploadError}</p>}
            {uploadOk && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{uploadOk}</p>}
          </div>
        )}


        <div className="flex border-b border-gray-300 dark:border-strokedark">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'images' ? 'border-b-2 border-primary text-primary dark:text-white' : 'text-bodydark1 dark:text-gray-300 hover:text-primary'}`}
            onClick={() => setActiveTab('images')}
          >
            Images
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'videos' ? 'border-b-2 border-primary text-primary dark:text-white' : 'text-bodydark1 dark:text-gray-300 hover:text-primary'}`}
            onClick={() => setActiveTab('videos')}
          >
            Videos
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'pointclouds' ? 'border-b-2 border-primary text-primary dark:text-white' : 'text-bodydark1 dark:text-gray-300 hover:text-primary'}`}
            onClick={() => setActiveTab('pointclouds')}
          >
            Pointcloud Data
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'pdfs' ? 'border-b-2 border-primary text-primary dark:text-white' : 'text-bodydark1 dark:text-gray-300 hover:text-primary'}`}
            onClick={() => setActiveTab('pdfs')}
          >
            PDFs
          </button>
        </div>

        <div className="p-4">{renderContent()}</div>
      </div>

      {filePendingDelete && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="file-explorer-delete-title"
            className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900"
          >
            <h2
              id="file-explorer-delete-title"
              className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-200"
            >
              Delete file
            </h2>
            <p className="mb-6 text-lg text-gray-900 dark:text-gray-200">
              Delete &quot;{filePendingDelete.file_name}&quot;? This cannot be undone.
            </p>
            {deleteModalError ? (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{deleteModalError}</p>
            ) : null}
            <div className="mt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={!!deletingId}
                className="rounded-lg bg-gray-300 px-4 py-2 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteFile()}
                disabled={!!deletingId}
                className="rounded-lg bg-red-600 px-4 py-2 text-white shadow-md hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave-page Guard Modal */}
      {leaveConfirmOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-upload-title"
            className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900"
          >
            <h2 id="leave-upload-title" className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-200">
              Leave page?
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              {uploading
                ? "Your upload is still in progress. Leaving will cancel it and the file won't be saved."
                : "You have a file selected that hasn't been uploaded yet. Leaving will discard your selection."}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelLeave}
                className="rounded-lg bg-gray-300 px-4 py-2 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Change Guard Modal */}
      {dateChangeConfirmOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="date-change-title"
            className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900"
          >
            <h2 id="date-change-title" className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-200">
              Unfinished upload
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              {uploading
                ? 'An upload is in progress. Switching dates will cancel it and the file won\'t be saved.'
                : 'You have a file selected that hasn\'t been uploaded yet. Switching dates will discard your selection.'}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelDateChange}
                className="rounded-lg bg-gray-300 px-4 py-2 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={handleConfirmDateChange}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                {uploading ? 'Cancel upload & switch' : 'Discard & switch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Upload Confirmation Modal */}
      {cancelConfirmOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-upload-title"
            className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900"
          >
            <h2 id="cancel-upload-title" className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-200">
              Cancel upload?
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              The file won't be saved. This cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(false)}
                className="rounded-lg bg-gray-300 px-4 py-2 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              >
                Keep uploading
              </button>
              <button
                type="button"
                onClick={handleCancelUpload}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Cancel upload
              </button>
            </div>
          </div>
        </div>
      )}


    </>
  );
};

export default FileExplorer;
