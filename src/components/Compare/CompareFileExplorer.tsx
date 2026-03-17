import React, { useState } from 'react';
import Thumbnail from '../../components/Thumbnail';
import { FaCalendarAlt } from 'react-icons/fa';

interface CompareFileExplorerProps {
  selectedDate: string; // Date passed in for this specific view
  onFileSelect: (fileUrl: string) => void; // Function to handle file selection for comparison
  disabledFile: string | null;
  className?: string;
  onBackToCalendar: () => void; // Function to trigger going back to the calendar
}

const CompareFileExplorer: React.FC<CompareFileExplorerProps> = ({ selectedDate, onFileSelect, disabledFile, className, onBackToCalendar }) => {
  const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'pointclouds'>('images');
  const [collapsedRooms, setCollapsedRooms] = useState<{ [room: string]: boolean }>({});

  // Updated data structure with room-based organization
  const thumbnailDataByDate: {
    [date: string]: {
      rooms: {
        [room: string]: {
          images?: { src: string; type: 'image' }[];
          videos?: { src: string; type: 'video' }[];
          pointclouds?: { src: string; type: 'pointcloud' }[];
        };
      };
    };
  } = {
    "2024-10-09": {
      rooms: {
        // "Room 1": {
        //   images: [],videos: [],pointclouds: []
        // },
        "Room 2": {
          images: [{ src: "/Images/thumbnails/20241009/room02.jpg", type: "image" },],
          videos: [],
          pointclouds: [{ src: "/PCD/20241009/room02.glb", type: "pointcloud" }]
        },
        "Room 3": {
          images: [{ src: "/Images/thumbnails/20241009/room03.jpg", type: "image" }],
          videos: [],
          pointclouds: []
        },
        "Room 4": {
          images: [{ src: "/Images/thumbnails/20241009/room04.jpg", type: "image" },],videos: [],pointclouds: []
        },
        "Room 5": {
          images: [{ src: "/Images/thumbnails/20241009/room05.jpg", type: "image" },],videos: [],pointclouds: []
        },
        "Room 6": {
          images: [{ src: "/Images/thumbnails/20241009/room06.jpg", type: "image" },],videos: [],pointclouds: []
        },
      }
    },
    "2024-10-11": {
      rooms: {
        // "Room 1": {
        //   images: [],videos: [],pointclouds: []
        // },
        "Room 2": {
          images: [{ src: "/Images/thumbnails/20241011/room02.jpg", type: "image" },],
          videos: [],
          pointclouds: []
        },
        "Room 3": {
          images: [{ src: "/Images/thumbnails/20241011/room03.jpg", type: "image" }],
          videos: [],
          pointclouds: []
        },
        "Room 4": {
          images: [{ src: "/Images/thumbnails/20241011/room04.jpg", type: "image" },],videos: [],pointclouds: []
        },
        // "Room 5": {
        //   images: [],videos: [],pointclouds: []
        // },
        "Room 6": {
          images: [{ src: "/Images/thumbnails/20241011/room06.jpg", type: "image" },],videos: [],pointclouds: []
        },
      }
    },
    "2024-10-14": {
      rooms: {
        // "Room 1": {
        //   images: [],videos: [],pointclouds: []
        // },
        "Room 2": {
          images: [{ src: "/Images/thumbnails/20241014/room02.jpg", type: "image" },],
          videos: [],
          pointclouds: []
        },
        "Room 3": {
          images: [{ src: "/Images/thumbnails/20241014/room03.jpg", type: "image" }],
          videos: [],
          pointclouds: []
        },
        "Room 4": {
          images: [{ src: "/Images/thumbnails/20241014/room04.jpg", type: "image" },],videos: [],pointclouds: []
        },
        // "Room 5": {
        //   images: [],videos: [],pointclouds: []
        // },
        "Room 6": {
          images: [{ src: "/Images/thumbnails/20241014/room06.jpg", type: "image" },],videos: [],pointclouds: []
        },
      }
    },
  };

  const thumbnailsForSelectedDate = selectedDate
    ? thumbnailDataByDate[selectedDate]?.rooms || {}
    : {};

  const toggleRoomCollapse = (room: string) => {
    setCollapsedRooms((prevState) => ({
      ...prevState,
      [room]: !prevState[room],
    }));
  };

  const renderThumbnails = (thumbnails: { src: string; type: 'image' | 'video' | 'pointcloud' }[]) => {
    return thumbnails.map((thumbnail, index) => {
      const fileName = thumbnail.src.split('/').pop();
      const hdImagePath = thumbnail.src.replace('/thumbnails/', '/panoramas/');

      const isDisabled = thumbnail.src === disabledFile;

      return (
        <div
          key={index}
          className={`flex flex-col cursor-pointer ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
          onClick={() => {
            if (!isDisabled) {
              if (thumbnail.type === 'pointcloud') {
                onFileSelect(thumbnail.src);
              } else {
                onFileSelect(hdImagePath);
              }
            }
          }}
        >
          <Thumbnail src={thumbnail.src} type={thumbnail.type} />
          <p className="text-sm text-center text-gray-600 dark:text-gray-200 mt-2">{fileName}</p>
        </div>
      );
    });
  };

  const renderRoomContent = () => {
    return Object.entries(thumbnailsForSelectedDate).map(([room, media]) => (
      <div key={room} className="mb-4">
        <div
          onClick={() => toggleRoomCollapse(room)}
          className="flex items-center cursor-pointer bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-md shadow hover:shadow-lg transition duration-200 ease-in-out"
        >
          <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 flex-grow">
            {room}
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              ({(media[activeTab as keyof typeof media] || []).length})
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
          {(media[activeTab as keyof typeof media] || []).length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {renderThumbnails(media[activeTab as keyof typeof media] || [])}
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
      {/* Top Bar with Title and Back Button */}
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

      {/* Tabs */}
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
        {Object.keys(thumbnailsForSelectedDate).length
          ? renderRoomContent()
          : <p className="text-center text-bodydark dark:text-gray-400">No files available</p>}
      </div>

    </div>
  );
};

export default CompareFileExplorer;
