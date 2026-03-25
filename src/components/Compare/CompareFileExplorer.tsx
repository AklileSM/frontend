import React, { useEffect, useMemo, useState } from 'react';
import Thumbnail from '../../components/Thumbnail';
import { FaCalendarAlt } from 'react-icons/fa';
import {
  ApiMediaFile,
  ApiRoomMediaGroup,
  getExplorerByDate,
} from '../../services/apiClient';

interface CompareFileExplorerProps {
  selectedDate: string;
  onFileSelect: (fileUrl: string) => void;
  disabledFile: string | null;
  className?: string;
  onBackToCalendar: () => void;
}

function viewerUrl(file: ApiMediaFile): string {
  return file.full_src || file.src;
}

const CompareFileExplorer: React.FC<CompareFileExplorerProps> = ({
  selectedDate,
  onFileSelect,
  disabledFile,
  className,
  onBackToCalendar,
}) => {
  const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'pointclouds'>('images');
  const [collapsedRooms, setCollapsedRooms] = useState<{ [room: string]: boolean }>({});
  const [roomsForDate, setRoomsForDate] = useState<Record<string, ApiRoomMediaGroup>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [selectedDate]);

  const thumbnailsForSelectedDate = useMemo(() => roomsForDate, [roomsForDate]);

  useEffect(() => {
    const initial: { [room: string]: boolean } = {};
    Object.entries(thumbnailsForSelectedDate).forEach(([room, media]) => {
      const hasFiles = (media[activeTab] || []).length > 0;
      initial[room] = !hasFiles;
    });
    setCollapsedRooms(initial);
  }, [activeTab, thumbnailsForSelectedDate]);

  const toggleRoomCollapse = (room: string) => {
    setCollapsedRooms((prevState) => ({
      ...prevState,
      [room]: !prevState[room],
    }));
  };

  const renderThumbnails = (thumbnails: ApiMediaFile[]) => {
    return thumbnails.map((thumbnail) => {
      const primary = viewerUrl(thumbnail);
      const isDisabled = primary === disabledFile;

      return (
        <div
          key={thumbnail.id}
          className={`flex flex-col cursor-pointer ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
          onClick={() => {
            if (!isDisabled) {
              onFileSelect(primary);
            }
          }}
        >
          <Thumbnail src={thumbnail.src} type={thumbnail.type} />
          <p className="text-sm text-center text-gray-600 dark:text-gray-200 mt-2">{thumbnail.file_name}</p>
        </div>
      );
    });
  };

  const renderRoomContent = () => {
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
              ({(media[activeTab as keyof ApiRoomMediaGroup] || []).length})
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
          {(media[activeTab as keyof ApiRoomMediaGroup] || []).length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {renderThumbnails(media[activeTab as keyof ApiRoomMediaGroup] || [])}
            </div>
          ) : (
            <p className="text-center text-bodydark dark:text-gray-400 mt-2">
              No {activeTab} available for this room
            </p>
          )}
        </div>
      </div>
    ));
  };

  return (
    <div className={`w-full h-full ${className} bg-white rounded-lg shadow-lg dark:bg-boxdark p-4 relative`}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-black dark:text-white">File Explorer</h1>
        <button
          onClick={onBackToCalendar}
          className="text-gray-300 hover:text-primary transition-transform transform hover:scale-110"
          aria-label="Back to Calendar"
        >
          <FaCalendarAlt size={20} />
        </button>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Selected Date: <span className="text-white font-semibold">{selectedDate}</span>
      </p>

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
      </div>

      <div
        className="p-4 overflow-y-auto max-h-[550px] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 dark:scrollbar-thumb-gray-400 dark:scrollbar-track-gray-700"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #1F2937',
        }}
      >
        {renderRoomContent()}
      </div>
    </div>
  );
};

export default CompareFileExplorer;
