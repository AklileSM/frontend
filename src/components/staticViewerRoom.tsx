// StaticViewer.tsx
import React, { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import imageDescriptions from '../utils/imageDescriptions';
import { fetchImageDescription } from '../services/imageDescriptionLogic';

const StaticViewerRoom: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const imageUrl = location.state?.imageUrl || "/Images/panoramas/20241007/room02.jpg";
  const fileId = location.state?.fileId;
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fileName = imageUrl.split('/').pop();
  const folderName = imageUrl.split('/')[3];
  const formattedDate = `${folderName.slice(0, 4)}-${folderName.slice(4, 6)}-${folderName.slice(6, 8)}`;
  const room = location.state?.room || 'defaultRoom';

  // State for modal, checkboxes, and text fields
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [includeAutoLabeling, setIncludeAutoLabeling] = useState(false);
  const [includeAdditionalComments, setIncludeAdditionalComments] = useState(false);
  const [autoLabelingText, setAutoLabelingText] = useState('');
  const [additionalCommentsText, setAdditionalCommentsText] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const [safetyIssue, setSafetyIssue] = useState(false);
  const [qualityIssue, setQualityIssue] = useState(false);
  const [delayed, setDelayed] = useState(false);

  const [displayedText, setDisplayedText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false); 

  // State to hold the API response and loading status
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const loadingPhases = ['Generating.', 'Generating..', 'Generating...'];
  let loadingIndex = 0; // This counter is used for the loading animation

  // This function shows the loading phases until the API call completes.
  const showLoading = () => {
    setDisplayedText(loadingPhases[loadingIndex % loadingPhases.length]);
    loadingIndex++;
    typingTimeoutRef.current = setTimeout(showLoading, 500);
  };

  // useEffect(() => {
  //   // Clear the text when the image changes
  //   setDisplayedText('');
  //   setIsGenerating(false); // Reset generating state
  //   if (typingTimeoutRef.current) {
  //     clearTimeout(typingTimeoutRef.current); // Clear any ongoing typing timeout
  //     typingTimeoutRef.current = null; // Reset the timeout ref
  //   }
  // }, [imageUrl]);

  // useEffect(() => {
  //   return () => {
  //       setDisplayedText(''); // Clear text on unmount
  //   };
  // }, []);

  let roomNumber = "Unknown Room";
  const roomMatch = fileName.match(/room(\d+)/i);
  if (roomMatch) {
    roomNumber = `Room ${parseInt(roomMatch[1], 10)}`; // Extracts room number and removes leading zero if any
  }

  const textareaClass = `w-full px-4 py-2 border rounded-md shadow-sm dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring focus:ring-primary focus:border-primary ${
    loading ? 'italic text-gray-400 dark:text-gray-500' : 'text-black dark:text-white'
  }`;

  const formatTextForTextarea = (text: string): string => {
    // 1. Remove Markdown for headings and make them bold
    text = text.replace(/^###\s*(.*)/gm, (match, p1) => {
      return `${p1}:`; // Removes `###` and makes the heading text bold
    });
  
    // 2. Remove bold markdown `**` around the text
    text = text.replace(/\*\*(.*?)\*\*/g, (match, p1) => {
      return p1;  // Removes the markdown `**` for bold text
    });
  
    // 3. Preserve numbered list structure and remove any `*`
    text = text.replace(/^(\d+|\*)\.\s+(.*)/gm, (match, p1, p2) => {
      return `${p1}. ${p2}`;  // keeps the list numbers and cleans up markdown symbols
    });
  
    // 4. Preserve line breaks
    text = text.replace(/\n/g, '\n'); // Ensure new lines are respected
  
    return text;
  };
    

  //Real Automatic labeling method using Qwen 2
  const handleAutomaticLableing = async () => {
    setLoading(true);
      // Start with an initial loading text.
      setDisplayedText('Loading...');
      // Start the loading animation.
      showLoading();
  
      try {
        // Call the logic function which accepts the imageUrl.
        const description = await fetchImageDescription(imageUrl, fileId);
        const formattedDescription = formatTextForTextarea(description);
        // Clear the loading animation timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        // Display the final description.
        setDisplayedText(formattedDescription);
        setAutoLabelingText(formattedDescription);
      } catch (error) {
        console.error('Error fetching data:', error);
        setDisplayedText('An error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
  };

  const handleGenerateAutomaticLabeling = () => {
    console.log(imageUrl);
    const relativePath = imageUrl.split('Images/')[1];
    const description = imageDescriptions[relativePath] || "No description available for this image.";
    setAutoLabelingText(description);

    setDisplayedText(''); // Clear previous text
    setIsGenerating(true); 
    let index = 0;

    // Stop any ongoing typing animation
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // "Generating..." animation
    const loadingPhases = ['Generating.', 'Generating..', 'Generating...','Generating.', 'Generating..', 'Generating...'];
    let loadingIndex = 0;

    const showLoading = () => {
      if (loadingIndex < loadingPhases.length) {
        setDisplayedText(loadingPhases[loadingIndex]);
        loadingIndex++;
        typingTimeoutRef.current = setTimeout(showLoading, 500); // Adjust delay between loading phases
      } else {
        startTyping(); // Start the typing animation after "Generating..." finishes
      }
    };

    const startTyping = () => {
      const typeCharacter = () => {
        if (index <= description.length) {
          setDisplayedText(description.slice(0, index)); // Use slicing for typing effect
          index++;
          typingTimeoutRef.current = setTimeout(typeCharacter, 0.1); // Adjust typing speed
        }else {
          setIsGenerating(false);
        }
      };
      typeCharacter(); // Start typing
    };

    showLoading(); // Start the loading animation
  };

  const openPublishModal = () => setIsModalOpen(true);
  const closePublishModal = () => {
    setIsModalOpen(false);
    setIncludeAutoLabeling(false);
    setIncludeAdditionalComments(false);
    setValidationMessage(null);
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Initialize vertical position for content
    let currentY = 40; // Starting Y-coordinate for content placement
  
    // Helper function to add text with page break handling
    const addText = (text: string, options: { maxWidth?: number; x?: number; extraSpacing?: number } = {})=> {
      const lineHeight = 6;
      const textLines = doc.splitTextToSize(text, options.maxWidth || 180);
  
      textLines.forEach((line: string | string[]) => {
        if (currentY > pageHeight - 10) {
          doc.addPage();
          currentY = 20; // reset with top margin
        }
        doc.text(line, options.x || 10, currentY);
        currentY += lineHeight;
      });
      currentY += (options.extraSpacing || 4); // extra spacing after block
    };
  
    // Title Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('2D Viewer Report', 105, 15, { align: 'center' });
  
    // Sub-header with Date and Divider
    doc.setFontSize(10);
    doc.setTextColor(80);
    addText(`Date: ${currentDate}`);
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(10, currentY, 200, currentY);
    currentY += 10; // Adjust for the next section
  
    // Section: Project Information
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(60);
    addText("Project Information:");
  
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    addText("Project Name:");
    doc.setFont("helvetica", "italic");
    addText("A6_stern");
  
    doc.setFont("helvetica", "normal");
    addText("Generated By:");
    doc.setFont("helvetica", "italic");
    addText("John Doe");
  
    const roomDescription = fileName.match(/\d+/) ? `Room ${fileName.match(/\d+/)[0]}` : "Room 1";
    const projectZoneDescription = `This report is generated based on ${fileName} of ${roomDescription} taken on ${formattedDate.replace(/-/g, '/')}.`;
    
    doc.setFont("helvetica", "normal");
    addText("Project Zone:");
    doc.setFont("helvetica", "italic");
    addText(projectZoneDescription);
  
    // Section: Automatic Labeling
    if (includeAutoLabeling) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(60);
      addText('State of the construction:');
  
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      addText(autoLabelingText || "No automatic labeling information provided.");
    }
  
    // Section: Additional Comments
    if (includeAdditionalComments) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(60);
      addText('Detailed Comments:');
  
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      addText(additionalCommentsText || "No detailed comments provided.");
    }
  
    // Section: Report Flags
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(60);
    addText('Report Flags:');
  
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
  
    let flagsText = "The project ";
    if (delayed) {
      flagsText += "is delayed. ";
    } else {
      flagsText += "is on schedule. ";
    }
    if (qualityIssue && safetyIssue) {
      flagsText += "It has both quality and safety issues.";
    } else if (qualityIssue) {
      flagsText += "It has a quality issue.";
    } else if (safetyIssue) {
      flagsText += "It has a safety issue.";
    } else {
      flagsText += "There are no marked issues.";
    }
  
    addText(flagsText);
  
    // Save the PDF
    doc.save('2DViewer_Report.pdf');
  };
  
  

  const handleModalPublish = () => {
    if (!includeAutoLabeling && !includeAdditionalComments) {
      setValidationMessage('Please select at least one option to include in the report.');
    } else {
      generatePDFReport();
      closePublishModal();
    }
  };

  return (
    <div className="w-full max-w-screen-3xl bg-white rounded-md shadow-default dark:bg-boxdark dark:text-white p-4 mx-auto mt-6">
      <div className="flex justify-between items-center border-b border-gray-300 dark:border-strokedark pb-4">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white">Static Viewer</h1>
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
            onClick={() => navigate('/interactiveViewerRoom', { state: { imageUrl, room } })} // Pass room along with imageUrl
            className="bg-primary text-white font-semibold py-2 px-6 rounded-lg shadow-lg transition-transform duration-300 hover:bg-opacity-60"
          >
            Open in 360 Viewer
          </button>
          <button
            onClick={() => navigate('/RoomExplorer', { state: { room } })}
            className="bg-primary text-white font-semibold py-2 px-3 rounded-lg shadow-lg transition-transform duration-300 hover:scale-105 flex items-center justify-center"
          >
            <svg fill="#ffffff" height="24px" width="24px" viewBox="0 0 288.312 288.312" xmlns="http://www.w3.org/2000/svg">
              <path d="M127.353,3.555c-4.704-4.74-12.319-4.74-17.011,0L15.314,99.653c-4.74,4.788-4.547,12.884,0.313,17.48l94.715,95.785c4.704,4.74,12.319,4.74,17.011,0c4.704-4.74,4.704-12.427,0-17.167l-74.444-75.274h199.474v155.804c0,6.641,5.39,12.03,12.03,12.03c6.641,0,12.03-5.39,12.03-12.03V108.231c0-6.641-5.39-12.03-12.03-12.03H52.704l74.648-75.49C132.056,15.982,132.056,8.295,127.353,3.555z" />
            </svg>
          </button>
        </div>
      </div>

      {/* HD Image Display */}
      <div className="relative w-full h-[70vh] mt-4 bg-gray-700 rounded-lg overflow-hidden shadow-lg flex items-center justify-center">
        <img src={imageUrl} alt={fileName} className="object-contain w-full h-full rounded-lg" />
      </div>

      {/* Input fields under the viewer */}
      <div className="flex w-full space-x-4 mt-7">
        
        {/* Automatic Labeling Section */}
        <div 
          className="flex-1 p-4 border border-gray-300 dark:border-strokedark rounded-lg bg-gray-50 dark:bg-gray-800"
          style={{
            scrollbarColor: '#4B5563 #1F2937',
          }}
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Automatic Labeling
          </label>
          <textarea
              rows={10}
              placeholder="Automatic description..."
              className={textareaClass}
              value={displayedText}
              readOnly // Prevent edits during the animation
              
          />
          {/* Generate Button */}
          <button
            onClick={handleAutomaticLableing}
            disabled={loading} // Disable button when generating
            className={`mt-2 py-2 px-4 rounded-lg shadow-md transition-transform duration-300 ${
              loading
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' // Disabled styles
                : 'bg-indigo-600 text-white hover:bg-indigo-700' // Active styles
            }`}
          >
            Generate
          </button>
        </div>

        {/* Additional Comments Section */}
        <div 
          className="flex-1 p-4 border border-gray-300 dark:border-strokedark rounded-lg bg-gray-50 dark:bg-gray-800"
          style={{
            scrollbarColor: '#4B5563 #1F2937',
          }}
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Additional Comments
          </label>
          <textarea
            rows={10}
            placeholder="Enter comments"
            className="w-full px-4 py-2 border rounded-md shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring focus:ring-primary focus:border-primary"
            value={additionalCommentsText}
            onChange={(e) => setAdditionalCommentsText(e.target.value)}
          />

          {/* Report Flags (Safety, Quality, Delayed) */}
          <div className="mt-4 ml-1">
            {/* <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Flags</p> */}
            <div className="flex space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                  checked={safetyIssue}
                  onChange={() => setSafetyIssue(!safetyIssue)}
                />
                <span className="text-gray-700 dark:text-gray-300">Safety Issue</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                  checked={qualityIssue}
                  onChange={() => setQualityIssue(!qualityIssue)}
                />
                <span className="text-gray-700 dark:text-gray-300">Quality Issue</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                  checked={delayed}
                  onChange={() => setDelayed(!delayed)}
                />
                <span className="text-gray-700 dark:text-gray-300">Delayed</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      {/* Publish Button for the Entire Form */}
      <div className="flex justify-end mr-5 -mt-15 mb-3 gap-3">
        <button
          // onClick={() => openPublishModal()}
          disabled={isGenerating} 
          className={` font-semibold py-3 px-6 rounded-lg shadow-md transition-transform duration-300 ${
            isGenerating
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' // Disabled styles
              : 'bg-indigo-600 text-white hover:bg-indigo-700' // Active styles
          }`}
        >
          Save
        </button>
        <button
          onClick={() => openPublishModal()}
          disabled={isGenerating} 
          className={` font-semibold py-3 px-6 rounded-lg shadow-md transition-transform duration-300 ${
            isGenerating
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' // Disabled styles
              : 'bg-indigo-600 text-white hover:bg-indigo-700' // Active styles
          }`}
        >
          Generate Report
        </button>
      </div>

      {/* Publish Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-200">Publish Report</h2>
            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeAutoLabeling}
                  onChange={() => setIncludeAutoLabeling(!includeAutoLabeling)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                <span className="text-gray-700 dark:text-gray-300">Include Automatic Labeling</span>
              </label>
              <label className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  checked={includeAdditionalComments}
                  onChange={() => setIncludeAdditionalComments(!includeAdditionalComments)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                <span className="text-gray-700 dark:text-gray-300">Include Additional Comments</span>
              </label>
            </div>

            {validationMessage && <p className="text-red-600 text-sm mb-4">{validationMessage}</p>}

            <div className="flex justify-end space-x-3">
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

export default StaticViewerRoom;
