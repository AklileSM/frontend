// ComparePCDViewer.tsx
import React, { useEffect, useRef, useState } from 'react';
import 'aframe';
import { extractDateFromImageRef, stripQueryLastPathSegment } from '../../utils/imageViewerMeta';

interface ComparePCDViewerProps {
  modelUrl: string;
  onClose: () => void;
  displayFileName?: string;
  roomLabel?: string;
  captureDate?: string;
}

const ComparePCDViewer: React.FC<ComparePCDViewerProps> = ({
  modelUrl,
  onClose,
  displayFileName: displayFileNameProp,
  roomLabel: roomLabelProp,
  captureDate: captureDateProp,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  const viewingFileName =
    (displayFileNameProp && displayFileNameProp.trim()) || stripQueryLastPathSegment(modelUrl);
  const formattedDate =
    (captureDateProp && captureDateProp.trim().slice(0, 10)) ||
    extractDateFromImageRef(modelUrl) ||
    'Unknown Date';

  let roomNumber: string;
  if (roomLabelProp && roomLabelProp.trim()) {
    roomNumber = roomLabelProp.trim();
  } else {
    roomNumber = 'Unknown Room';
    const roomMatch = viewingFileName.match(/room(\d+)/i);
    if (roomMatch) {
      roomNumber = `Room ${parseInt(roomMatch[1], 10)}`;
    }
  }

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
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div ref={viewerRef} className="w-full h-full relative bg-gray-700 rounded-lg overflow-hidden shadow-lg">
      {/* Display File Name and Date */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md z-999">
        <p className="text-sm text-black dark:text-gray-300">
          Viewing: <span className="font-semibold">{viewingFileName}</span>
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {roomNumber}, (Date: {formattedDate})
        </p>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute z-999 top-4 left-4 bg-primary text-white p-2 rounded-full shadow-lg transition-transform duration-300 hover:scale-110"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* A-Frame Viewer */}
      <div ref={viewerRef} className="relative flex w-full h-[70vh] bg-gray-700 rounded-lg overflow-hidden shadow-lg">
        <a-scene embedded>
          <a-entity gltf-model={modelUrl} position="0 0 -3" rotation="0 180 0" scale="0.5 0.5 0.5"></a-entity>
          <a-camera></a-camera>
        </a-scene>
      </div>
    </div>
  );
};

export default ComparePCDViewer;
