import React, { useRef, useEffect } from 'react';

interface ThumbnailProps {
  src: string;
  type: 'image' | 'video' | 'pointcloud';
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
