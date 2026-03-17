import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import 'aframe';
import jsPDF from 'jspdf';

const Aframe_IntViewer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const modelUrl = location.state?.modelUrl || "/path/to/default/model.glb"; // Use model URL from state or fallback

  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Safely extract the file name and folder name
  const fileName = modelUrl.split('/').pop() || "Unknown File"; // Default to "Unknown File" if undefined
  const folderName = modelUrl.split('/')[2] || ""; // Safely access the folder name

  // Format date only if folderName has enough characters

  const extractDateFromPath = (path: string): string => {
    const parts = path.split('/');
    const dateSegment = parts.find(segment => /^\d{8}$/.test(segment));
    if (!dateSegment) {
      throw new Error("Date not found in the path");
    }
    return `${dateSegment.slice(0, 4)}-${dateSegment.slice(4, 6)}-${dateSegment.slice(6, 8)}`;
  };
  
  let formattedDate: string;

  try {
    formattedDate = extractDateFromPath(modelUrl);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error extracting date:", error.message);
    } else {
      console.error("An unknown error occurred:", error);
    }
    formattedDate = "Unknown Date"; // Fallback if date extraction fails
  }
  
  let roomNumber = "Unknown Room";
  const roomMatch = fileName.match(/room(\d+)/i);
  if (roomMatch) {
    roomNumber = `Room ${parseInt(roomMatch[1], 10)}`; // Extracts room number and removes leading zero if any
  }
  

  const [notes, setNotes] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeScreenshot, setIncludeScreenshot] = useState(false);

  const openPublishModal = () => setIsModalOpen(true);
  const closePublishModal = () => {
    setIsModalOpen(false);
    setIncludeNotes(false);
    setIncludeScreenshot(false);
  };

  const handleModalPublish = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString();
  
    // Title and Date Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text('Point Cloud Viewer Report', 105, 15, { align: 'center' });
  
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Date: ${currentDate}`, 10, 25);
  
    // Header line
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(10, 30, 200, 30);
  
    // Section: Notes
    if (includeNotes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(60);
      doc.text('Notes:', 10, 40);
  
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      doc.text(notes || "No notes provided.", 10, 50, { maxWidth: 180 });
    }
  
    // Section: Screenshot
    if (includeScreenshot) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const screenshotDataUrl = canvas.toDataURL('image/png');
        
        // Adjust y-position based on the presence of notes
        const screenshotYPosition = includeNotes ? 80 : 50;
        doc.setFontSize(12);
        doc.setTextColor(60);
        doc.text('Screenshot:', 10, screenshotYPosition - 10);
  
        // Add screenshot image at calculated position
        doc.addImage(screenshotDataUrl, 'PNG', 10, screenshotYPosition, 180, 90);
      }
    }
  
    // Save the PDF
    doc.save('PointCloudViewer_Report.pdf');
    closePublishModal();
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
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="w-full max-w-screen-3xl bg-white rounded-md shadow-default dark:bg-boxdark dark:text-white p-4 mx-auto mt-6">
      <div className="flex justify-between items-center border-b border-gray-300 dark:border-strokedark pb-4">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white">Point Cloud Viewer</h1>
          <p className="text-sm text-black dark:text-gray-400 mt-1">
            Viewing: <span className="font-semibold">{fileName}</span>
            <div className="flex justify-center space-x-1 mt-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">{roomNumber},</p>
              <span className="text-gray-400"> (Date: {formattedDate})</span>
            </div>
          </p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => navigate('/A6_stern')}
            className="bg-primary text-white font-semibold py-2 px-3 rounded-lg shadow-lg transition-transform duration-300 hover:scale-105 flex items-center justify-center"
          >
            <svg fill="#ffffff" height="24px" width="24px" viewBox="0 0 288.312 288.312" xmlns="http://www.w3.org/2000/svg">
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

      <div ref={viewerRef} className="relative flex w-full h-[70vh] mt-4 bg-gray-700 rounded-lg overflow-hidden shadow-lg">
        <a-scene embedded>
          <a-entity
            gltf-model={modelUrl}
            position="0 0 -3"
            rotation="0 180 0"
            scale="0.5 0.5 0.5"
          ></a-entity>
          <a-camera></a-camera>
        </a-scene>
      </div>

      {/* Additional Content for Notes and Publishing */}
      <div className="flex w-full mt-6 space-x-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
          <textarea
            rows={5}
            placeholder="Enter comments"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border rounded-md shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring focus:ring-primary focus:border-primary"
          />
        </div>
        <div className="flex flex-col space-y-4 mt-7">
          <button
            // onClick={openPublishModal}
            className="bg-primary text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-transform duration-300 hover:bg-opacity-60 self-start"
          >
            Save
          </button>
          <button
            onClick={openPublishModal}
            className="bg-primary text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-transform duration-300 hover:bg-opacity-60 self-start"
          >
            Publish
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-200">Publish Report</h2>
            
            {/* <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeScreenshot}
                  onChange={() => setIncludeScreenshot(!includeScreenshot)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                <span className="text-gray-700 dark:text-gray-300">Include Screenshot</span>
              </label>
              <label className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={() => setIncludeNotes(!includeNotes)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                <span className="text-gray-700 dark:text-gray-300">Include Notes</span>
              </label>
            </div> */}

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={closePublishModal}
                className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleModalPublish}
                className="bg-indigo-600 text-white py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Aframe_IntViewer;
