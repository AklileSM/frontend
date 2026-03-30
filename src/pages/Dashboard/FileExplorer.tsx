import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const { getDateForScope } = useSelectedDate();
  const dateScope = filterProjectSlug ?? EXPLORER_DATE_SCOPE_A6;
  const selectedDate = getDateForScope(dateScope);
  const { user } = useAuth();
  const canUpload = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'pointclouds' | 'pdfs'>('images');
  const [collapsedRooms, setCollapsedRooms] = useState<{ [room: string]: boolean }>({});
  const [roomsForDate, setRoomsForDate] = useState<Record<string, ApiRoomMediaGroup>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  const [roomOptions, setRoomOptions] = useState<ApiRoom[]>([]);
  const [roomSlug, setRoomSlug] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState<string | null>(null);
  const [roomsFetchError, setRoomsFetchError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filePendingDelete, setFilePendingDelete] = useState<ApiMediaFile | null>(null);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'images' && activeTab !== 'pdfs') return;
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [activeTab]);

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
        out.push({ id: slug, name, slug, project_id: '' });
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
    Boolean(authUser && (authUser.role === 'admin' || authUser.role === 'manager'));

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

  const handleUpload = async () => {
    if (!selectedDate || !file || !roomSlug) return;
    if (activeTab !== 'images' && activeTab !== 'pdfs') return;
    const mediaType = activeTab === 'pdfs' ? 'pdf' : 'image';
    setUploadError(null);
    setUploadOk(null);
    setUploading(true);
    try {
      await uploadSingleFile({
        file,
        roomSlug,
        mediaType,
        captureDate: selectedDate,
      });
      setUploadOk(`Uploaded “${file.name}”.`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveTab(activeTab === 'pdfs' ? 'pdfs' : 'images');
      reloadExplorer();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
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
                  navigate('/PCD', {
                    state: { modelUrl: thumbnail.full_src || thumbnail.src, fileId: thumbnail.id },
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
            </div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <p className="text-center text-bodydark dark:text-gray-400">Loading files...</p>;
    }

    if (error) {
      return <p className="text-center text-red-500">{error}</p>;
    }

    if (Object.keys(thumbnailsForSelectedDate).length === 0) {
      return <p className="text-center text-bodydark dark:text-gray-400">No files available</p>;
    }

    return Object.entries(thumbnailsForSelectedDate).map(([room, media]) => (
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
    ));
  };

  const breadcrumbLabel =
    projectLabel && selectedDate
      ? `${projectLabel} · ${selectedDate}`
      : projectLabel || selectedDate || 'Explorer';

  return (
    <>
      <Breadcrumb pageName={breadcrumbLabel} />
      <div className="w-full bg-white rounded-md shadow-default dark:bg-boxdark dark:text-white">
        <div className="p-4 border-b border-gray-300 dark:border-strokedark">
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

        {selectedDate && canUpload && (activeTab === 'images' || activeTab === 'pdfs') && (
          <div className="p-4 border-b border-gray-300 dark:border-strokedark bg-gray-50 dark:bg-meta-4/30">
            <h2 className="text-sm font-semibold text-black dark:text-white mb-3">
              {activeTab === 'pdfs' ? 'Upload PDF' : 'Upload image'}
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
                    {activeTab === 'pdfs' ? 'PDF file' : 'Image file'}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={activeTab === 'pdfs' ? 'application/pdf,.pdf' : 'image/*'}
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
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
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
    </>
  );
};

export default FileExplorer;
