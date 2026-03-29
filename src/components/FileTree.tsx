import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import type { ApiMediaFile, ApiRoomMediaGroup } from '../services/apiClient';
import { getExplorerByRoom, listRooms } from '../services/apiClient';

type RoomTreeEntry = {
  slug: string;
  name: string;
  dates: Record<string, ApiRoomMediaGroup>;
};

const MEDIA_KEYS: (keyof ApiRoomMediaGroup)[] = ['images', 'videos', 'pointclouds', 'pdfs'];

function openMedia(
  navigate: ReturnType<typeof useNavigate>,
  file: ApiMediaFile,
  roomDisplayName: string,
): void {
  const url = file.full_src || file.src;
  if (file.type === 'image') {
    navigate('/staticViewer', {
      state: {
        imageUrl: url,
        fileId: file.id,
        displayFileName: file.file_name,
        roomLabel: roomDisplayName,
        captureDate: file.capture_date,
      },
    });
  } else if (file.type === 'pointcloud') {
    navigate('/PCD', {
      state: { modelUrl: url, fileId: file.id },
    });
  } else if (file.type === 'video') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else if (file.type === 'pdf') {
    navigate('/pdfViewer', { state: { pdfUrl: url, title: file.file_name } });
  }
}

const FileTree: React.FC = () => {
  const [fileTreeOpen, setFileTreeOpen] = useState<{ [key: string]: boolean }>({});
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [entries, setEntries] = useState<RoomTreeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listRooms()
      .then((rooms) =>
        Promise.all(
          rooms.map((r) =>
            getExplorerByRoom(r.slug).then((res) => ({
              slug: res.room,
              name: res.room_name || r.name,
              dates: res.dates ?? {},
            })),
          ),
        ),
      )
      .then((list) => {
        if (!cancelled) {
          setEntries(list);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load file tree.');
          setEntries([]);
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
  }, []);

  const toggleNode = (key: string) => {
    setFileTreeOpen((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleRoomClick = (e: React.MouseEvent<HTMLSpanElement>, room: string) => {
    e.stopPropagation();
    setActiveItem(room);
    const formattedRoom = room.toLowerCase().replace(/\s+/g, '');
    navigate('/RoomExplorer', { state: { room: formattedRoom } });
  };

  return (
    <div
      className="text-[#f5f5f7] rounded-lg w-full overflow-y-auto max-h-[min(480px,50vh)] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#4B5563 #1F2937' }}
    >
      <div className="ml-0 pl-0">
          {loading && (
            <p className="px-4 py-2 text-sm text-gray-400" role="status">
              Loading files…
            </p>
          )}
          {error && !loading && (
            <p className="px-4 py-2 text-sm text-amber-400" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && entries.length === 0 && (
            <p className="px-4 py-2 text-sm text-gray-400">No rooms or files yet.</p>
          )}

          {!loading &&
            entries.map(({ name: room, dates }) => {
              const sortedDates = Object.keys(dates).sort();
              return (
                <div key={room} className="mb-2">
                  <div
                    className={`flex items-center text-sm transition-colors duration-200 pl-4 ${
                      activeItem === room ? 'text-primary' : 'text-white hover:text-primary'
                    }`}
                  >
                    <span onClick={() => toggleNode(room)} className="mr-2 cursor-pointer">
                      {fileTreeOpen[room] ? <FaChevronDown /> : <FaChevronRight />}
                    </span>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M3 4a1 1 0 0 1 1-1h6.236a1 1 0 0 1 .707.293l1.414 1.414H20a1 1 0 0 1-1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z" />
                    </svg>
                    <span
                      className="font-medium cursor-pointer"
                      onClick={(e) => handleRoomClick(e, room)}
                    >
                      {room}
                    </span>
                  </div>

                  {fileTreeOpen[room] && (
                    <div className="ml-4 mt-2 border-l border-gray-600 pl-4">
                      {sortedDates.length === 0 ? (
                        <p className="pl-4 text-xs text-gray-500">No files for this room.</p>
                      ) : (
                        sortedDates.map((date) => {
                          const group = dates[date]!;
                          const dateKey = `${room}-${date}`;
                          return (
                            <div key={dateKey} className="mb-2">
                              <div
                                className={`flex items-center text-sm transition-colors duration-200 pl-4 ${
                                  activeItem === dateKey
                                    ? 'text-primary'
                                    : 'text-gray-300 hover:text-primary'
                                }`}
                                onClick={() => setActiveItem(dateKey)}
                              >
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleNode(dateKey);
                                  }}
                                  className="mr-2 cursor-pointer"
                                >
                                  {fileTreeOpen[dateKey] ? <FaChevronDown /> : <FaChevronRight />}
                                </span>
                                <svg
                                  className="w-4 h-4 mr-2"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path d="M3 4a1 1 0 0 1 1-1h6.236a1 1 0 0 1 .707.293l1.414 1.414H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z" />
                                </svg>
                                <span className="font-medium">{date}</span>
                              </div>

                              {fileTreeOpen[dateKey] && (
                                <div className="ml-4 mt-2 border-l border-gray-600 pl-4">
                                  {MEDIA_KEYS.map((typeKey) => {
                                    const files = group[typeKey] ?? [];
                                    if (files.length === 0) return null;
                                    const typeNodeKey = `${room}-${date}-${typeKey}`;
                                    const typeLabel =
                                      typeKey === 'pointclouds'
                                        ? 'Pointclouds'
                                        : typeKey === 'pdfs'
                                          ? 'PDFs'
                                          : typeKey.charAt(0).toUpperCase() + typeKey.slice(1);

                                    return (
                                      <div key={typeNodeKey} className="mt-3">
                                        <div
                                          className={`flex items-center cursor-pointer text-xs uppercase font-semibold mb-1 tracking-wide transition duration-200 ${
                                            activeItem === typeNodeKey
                                              ? 'text-primary'
                                              : 'text-gray-400 hover:text-primary'
                                          }`}
                                          onClick={() => toggleNode(typeNodeKey)}
                                        >
                                          <span className="mr-2 cursor-pointer">
                                            {fileTreeOpen[typeNodeKey] ? (
                                              <FaChevronDown />
                                            ) : (
                                              <FaChevronRight />
                                            )}
                                          </span>
                                          <svg
                                            className="w-4 h-4 mr-2"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path d="M3 4a1 1 0 0 1 1-1h6.236a1 1 0 0 1 .707.293l1.414 1.414H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z" />
                                          </svg>
                                          <span>{typeLabel}</span>
                                        </div>

                                        {fileTreeOpen[typeNodeKey] && (
                                          <ul className="ml-4 space-y-1">
                                            {files.map((file) => (
                                              <li
                                                key={file.id}
                                                className={`flex items-center text-sm hover:text-primary transition-colors duration-150 ${
                                                  activeItem === file.id
                                                    ? 'text-primary'
                                                    : 'text-gray-300'
                                                }`}
                                                onClick={() => {
                                                  setActiveItem(file.id);
                                                  openMedia(navigate, file, room);
                                                }}
                                              >
                                                <svg
                                                  className="w-4 h-4 mr-1"
                                                  viewBox="0 0 24 24"
                                                  fill="currentColor"
                                                >
                                                  {file.type === 'image' ? (
                                                    <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 1 2-2zm-9-8l3.5 4.5H8l2.5-3z" />
                                                  ) : file.type === 'video' ? (
                                                    <path d="M8 5v14l11-7L8 5zm2 3.5L15.5 12 10 15.5V8.5z" />
                                                  ) : file.type === 'pdf' ? (
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                                                  ) : (
                                                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm2-6h-4v-4h4zm-2 2a6.61 6.61 0 0 0 3.66-1.18l1.07 1.07A7.93 7.93 0 0 1 12 20a7.93 7.93 0 0 1-4.73-1.61l1.07-1.07A6.61 6.61 0 0 0 12 16z" />
                                                  )}
                                                </svg>
                                                <button
                                                  type="button"
                                                  className="text-sm transition-colors duration-150 text-left"
                                                >
                                                  {file.file_name}
                                                </button>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
};

export default FileTree;
