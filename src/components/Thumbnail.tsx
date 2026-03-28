import React, { useRef, useEffect } from 'react';

interface ThumbnailProps {
  src: string;
  type: 'image' | 'video' | 'pointcloud' | 'pdf';
  altText?: string;
}

const Thumbnail: React.FC<ThumbnailProps> = ({ src, type, altText }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (type === 'video' && videoRef.current) {
      const handleLoadedData = () => {
        videoRef.current!.currentTime = 1; // Capture a frame at 1 second
        videoRef.current!.pause(); // Pause the video to show the frame
      };

      videoRef.current.addEventListener('loadeddata', handleLoadedData);

      return () => videoRef.current?.removeEventListener('loadeddata', handleLoadedData);
    }
  }, [type]);

  const renderThumbnailContent = () => {
    switch (type) {
      case 'image':
        return <img src={src} alt={altText || 'Image thumbnail'} className="w-full h-48 object-cover rounded-md" />;
      case 'video':
        return (
          <div className="relative">
            <video
              ref={videoRef}
              src={src}
              className="w-full h-48 object-cover rounded-md"
              muted
              playsInline
              controls={false} // Hide controls
            />
            {/* Video Icon Overlay with Circle Background */}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-25 rounded-md">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-black bg-opacity-60">
                <svg
                  className="w-8 h-8 text-white opacity-90"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M8 5v14l11-7L8 5z" /> {/* Play icon */}
                </svg>
              </div>
            </div>
          </div>
        );
      case 'pointcloud':
        return (
          <div className="w-full h-48 flex items-center justify-center rounded-lg">
            <img src="/Images/thumbnails/svg/pointcloudIcon.svg" alt="Pointcloud icon" className="w-35 h-35 rounded-lg" />
          </div>
        );
      case 'pdf':
        return (
          <div className="w-full h-48 flex flex-col items-center justify-center rounded-md border border-stroke bg-gray-100 dark:border-strokedark dark:bg-gray-800">
            <svg className="h-14 w-14 text-red-600 dark:text-red-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 12h8v2H8v-2zm0 4h8v2H8v-2zm0-8h3v2H8v-2z" />
            </svg>
            <span className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">PDF</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-2">
      {renderThumbnailContent()}
    </div>
  );
};

export default Thumbnail;
