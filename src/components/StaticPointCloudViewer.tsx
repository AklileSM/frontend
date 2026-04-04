import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { extractDateFromImageRef, stripQueryLastPathSegment } from '../utils/imageViewerMeta';

export type StaticPointCloudViewerState = {
  modelUrl: string;
  fileId?: string;
  displayFileName?: string;
  roomLabel?: string;
  captureDate?: string;
  /** Room explorer: back navigates to RoomExplorer with this slug */
  room?: string;
};

const StaticPointCloudViewer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as StaticPointCloudViewerState;
  const modelUrl = state.modelUrl || '';
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewingFileName =
    (state.displayFileName && state.displayFileName.trim()) || stripQueryLastPathSegment(modelUrl);
  const formattedDate =
    (state.captureDate && state.captureDate.trim().slice(0, 10)) ||
    extractDateFromImageRef(modelUrl) ||
    'Unknown Date';

  let roomNumber = 'Unknown Room';
  if (state.roomLabel && state.roomLabel.trim()) {
    roomNumber = state.roomLabel.trim();
  } else {
    const roomMatch = viewingFileName.match(/room(\d+)/i);
    if (roomMatch) {
      roomNumber = `Room ${parseInt(roomMatch[1], 10)}`;
    }
  }

  const iframeSrc =
    modelUrl.length > 0
      ? `/potree/examples/viewer.html?url=${encodeURIComponent(modelUrl)}`
      : '';

  const goBack = () => {
    if (state.room) {
      navigate('/RoomExplorer', { state: { room: state.room } });
    } else {
      navigate(-1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  return (
    <div className="w-full max-w-screen-3xl bg-white rounded-md shadow-default dark:bg-boxdark dark:text-white p-4 mx-auto mt-6">
      <div className="flex justify-between items-center border-b border-gray-300 dark:border-strokedark pb-4">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white">Static viewer</h1>
          <p className="mt-1 text-sm text-black dark:text-gray-400">
            Viewing: <span className="font-semibold">{viewingFileName || 'Point cloud'}</span>
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {roomNumber}, (Date: {formattedDate})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-strokedark dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-meta-4"
          >
            {isFullscreen ? 'Exit fullscreen' : 'Fullscreen viewer'}
          </button>
          <button
            type="button"
            onClick={goBack}
            className="bg-primary text-white font-semibold py-2 px-3 rounded-lg shadow-lg transition-transform duration-300 hover:scale-105 flex items-center justify-center"
            aria-label="Back"
          >
            <svg
              fill="#ffffff"
              height="24px"
              width="24px"
              viewBox="0 0 288.312 288.312"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M127.353,3.555c-4.704-4.74-12.319-4.74-17.011,0L15.314,99.653 
                      c-4.74,4.788-4.547,12.884,0.313,17.48l94.715,95.785c4.704,4.74,12.319,4.74,17.011,0
                      c4.704-4.74,4.704-12.427,0-17.167l-74.444-75.274h199.474v155.804
                      c0,6.641,5.39,12.03,12.03,12.03c6.641,0,12.03-5.39,12.03-12.03V108.231
                      c0-6.641-5.39-12.03-12.03-12.03H52.704l74.648-75.49
                      C132.056,15.982,132.056,8.295,127.353,3.555z" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={viewerRef}
        className="relative w-full h-[70vh] mt-4 bg-gray-700 rounded-lg overflow-hidden shadow-lg"
      >
        {iframeSrc ? (
          <iframe
            title="Point cloud"
            src={iframeSrc}
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-300">
            No point cloud URL. Open this page from the file explorer.
          </div>
        )}
      </div>
    </div>
  );
};

export default StaticPointCloudViewer;
