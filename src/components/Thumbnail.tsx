import React, { useRef, useEffect } from 'react';

interface ThumbnailProps {
  src: string;
  type: 'image' | 'video' | 'pointcloud' | 'pdf';
  altText?: string;
  conversionStatus?: string | null;
  conversionError?: string | null;
}

const Thumbnail: React.FC<ThumbnailProps> = ({ src, type, altText, conversionStatus, conversionError }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (type === 'video' && videoRef.current) {
      const handleLoadedData = () => {
        videoRef.current!.currentTime = 1;
        videoRef.current!.pause();
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
              controls={false}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-25 rounded-md">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-black bg-opacity-60">
                <svg className="w-8 h-8 text-white opacity-90" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              </div>
            </div>
          </div>
        );

      case 'pointcloud': {
        const isProcessing = conversionStatus === 'pending' || conversionStatus === 'processing';
        const isFailed = conversionStatus === 'failed';

        return (
          <div className="relative w-full h-48 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <img
              src="/Images/thumbnails/svg/pointcloudIcon.svg"
              alt="Pointcloud icon"
              className={`w-35 h-35 rounded-lg ${isProcessing || isFailed ? 'opacity-30' : ''}`}
            />

            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black bg-opacity-40">
                {/* Spinner */}
                <svg
                  className="animate-spin h-8 w-8 text-white mb-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-white text-xs font-semibold tracking-wide">
                  {conversionStatus === 'pending' ? 'Queued…' : 'Converting…'}
                </span>
              </div>
            )}

            {isFailed && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black bg-opacity-50 px-2"
                title={conversionError ?? 'Conversion failed — check backend logs'}
              >
                <svg className="h-8 w-8 text-red-400 mb-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-300 text-xs font-semibold text-center">Conversion failed</span>
                {conversionError && (
                  <span className="mt-1 text-red-200 text-[10px] text-center line-clamp-3 leading-tight">
                    {conversionError}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      }

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
