import React, { useState, useRef, useEffect, useCallback } from 'react';
import CompareCalendar from './CompareCalendar';
import CompareFileExplorer from './CompareFileExplorer';
import Compare360Viewer from './Compare360Viewer';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import ComparePCDViewer from './ComparePCDViewer';
import { PDFDocument } from 'pdf-lib'; // Install this with npm

const ComparePage: React.FC = () => {
  const availableDates = ['2024-10-09', '2024-10-11', '2024-10-14',];
  const navigate = useNavigate();

  const [leftSelectedDate, setLeftSelectedDate] = useState<string | null>(null);
  const [rightSelectedDate, setRightSelectedDate] = useState<string | null>(null);
  const [leftSelectedFile, setLeftSelectedFile] = useState<string | null>(null);
  const [rightSelectedFile, setRightSelectedFile] = useState<string | null>(null);

  const [showLeftCalendar, setShowLeftCalendar] = useState(true);
  const [showRightCalendar, setShowRightCalendar] = useState(true);
  const [showLeft360Viewer, setShowLeft360Viewer] = useState(false);
  const [showRight360Viewer, setShowRight360Viewer] = useState(false);

  const [leftHDImageUrl, setLeftHDImageUrl] = useState<string | null>(null);
  const [rightHDImageUrl, setRightHDImageUrl] = useState<string | null>(null);

  const [showLeftPCDViewer, setShowLeftPCDViewer] = useState(false);
  const [showRightPCDViewer, setShowRightPCDViewer] = useState(false);  

  // State for modal and checkboxes
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>(''); // Store the user's notes

  const [leftViewerScreenshots, setLeftViewerScreenshots] = useState<string[]>([]);
  const [rightViewerScreenshots, setRightViewerScreenshots] = useState<string[]>([]);

  const handleLeftScreenshot = (screenshots: string[]) => setLeftViewerScreenshots(screenshots);
  const handleRightScreenshot = (screenshots: string[]) => setRightViewerScreenshots(screenshots);

  const [isSeparateNotes, setIsSeparateNotes] = useState(false); // New state for separate notes checkbox
  const [leftNotes, setLeftNotes] = useState<string>(''); // New state for left view notes
  const [rightNotes, setRightNotes] = useState<string>(''); // New state for right view notes

  const [isBackModalOpen, setIsBackModalOpen] = useState(false);

  const closeBackModal = () => {
    setIsBackModalOpen(false)
  }
 
  type ScreenshotNotes = {
    images: string[]; // Array of Base64 image strings
    text: string;     // Comments associated with the screenshots
  };
  
  const [leftAdditionalScreenshotNotes, setLeftAdditionalScreenshotNotes] = useState<ScreenshotNotes>({
    images: [],
    text: "",
  });
  
  const [rightAdditionalScreenshotNotes, setRightAdditionalScreenshotNotes] = useState<ScreenshotNotes>({
    images: [],
    text: "",
  });

  const [leftImageDetails, setLeftImageDetails] = useState<{ fileName: string; date: string } | null>(null);
  const [rightImageDetails, setRightImageDetails] = useState<{ fileName: string; date: string } | null>(null);
  // Add this at the top, alongside existing useState hooks
  const [isBottomSectionVisible, setIsBottomSectionVisible] = useState(false);

  const [sharedCameraPosition, setSharedCameraPosition] = useState<[number, number, number]>([0, 0, 20]);
  const [isSynchronized, setIsSynchronized] = useState(false);

  const [leftTakeScreenshot, setLeftTakeScreenshot] = useState<() => string | null>(() => () => null);
  const [rightTakeScreenshot, setRightTakeScreenshot] = useState<() => string | null>(() => () => null);

  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [leftScreenshot, setLeftScreenshot] = useState<string | null>(null);
  const [rightScreenshot, setRightScreenshot] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const handleCloseLeft360Viewer = () => 
  {
    setLeftSelectedFile(null);
    setShowLeft360Viewer(false);
  }
  const handleCloseRight360Viewer = () => 
  {
    setRightSelectedFile(null); 
    setShowRight360Viewer(false);
  }

  const [safetyIssue, setSafetyIssue] = useState(false);
  const [qualityIssue, setQualityIssue] = useState(false);
  const [delayed, setDelayed] = useState(false);

  const [leftSafetyIssue, setLeftSafetyIssue] = useState(false);
  const [leftQualityIssue, setLeftQualityIssue] = useState(false);
  const [leftDelayed, setLeftDelayed] = useState(false);

  const [rightSafetyIssue, setRightSafetyIssue] = useState(false);
  const [rightQualityIssue, setRightQualityIssue] = useState(false);
  const [rightDelayed, setRightDelayed] = useState(false);

  const savedReports = useRef<
    { id: number; title: string; createdAt: string; pdfBlob: Blob }[]
  >([]);

  const openPublishModal = () => setIsModalOpen(true);

  const handleImageClick = (image: string) => {
    setSelectedImage(image);
    setIsImageModalOpen(true);
  };  

  const handleLeftScreenshotAssignment = useCallback(
    (callback: () => string | null) => {
      console.log("Assigning leftTakeScreenshot:", callback);
      setLeftTakeScreenshot(() => callback);
    },
    [] // No dependencies; this function will not change
  );
  
  const handleRightScreenshotAssignment = useCallback(
    (callback: () => string | null) => {
      console.log("Assigning rightTakeScreenshot:", callback);
      setRightTakeScreenshot(() => callback);
    },
    [] // No dependencies; this function will not change
  );
  
  const handleCompareClick = () => {
    setIsBottomSectionVisible(true)
    if (leftTakeScreenshot && rightTakeScreenshot) {
      const leftImage = leftTakeScreenshot();
      const rightImage = rightTakeScreenshot();
  
      if (leftImage && rightImage) {
        setLeftScreenshot(leftImage);
        setRightScreenshot(rightImage);
        setIsScreenshotModalOpen(true);
      }

      if (leftImage) {
        setLeftAdditionalScreenshotNotes((prev) => ({
          ...prev,
          images: [...prev.images, leftImage], // Append new image
        }));
      }
      if (rightImage) {
        setRightAdditionalScreenshotNotes((prev) => ({
          ...prev,
          images: [...prev.images, rightImage], // Append new image
        }));
      }
    }
  };
  
  useEffect(() => {
  }, [leftHDImageUrl, rightHDImageUrl]);

  const downloadImage = (dataUrl: string, filename: string) => {
    if (!dataUrl) {
      console.error(`Failed to download ${filename}. Data URL is empty.`);
      return;
    }
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }; 

  const handleDeleteImage = (side: "left" | "right", index: number) => {
    if (side === "left") {
      setLeftAdditionalScreenshotNotes((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index), // Remove the image by index
      }));
    } else if (side === "right") {
      setRightAdditionalScreenshotNotes((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index), // Remove the image by index
      }));
    }
  };

  const toggleSynchronization = () => {
    setIsSynchronized(!isSynchronized);
  };

  // Handlers to update image details from each viewer
  const handleLeftImageDetailsUpdate = (fileName: string, date: string) => {
    setLeftImageDetails({ fileName, date });
  };

  const handleRightImageDetailsUpdate = (fileName: string, date: string) => {
    setRightImageDetails({ fileName, date });
  };

  const handleLeftDateSelect = (date: string) => {
    setLeftSelectedDate(date);
    setLeftSelectedFile(null);
    setShowLeftCalendar(false);
  };

  const handleRightDateSelect = (date: string) => {
    setRightSelectedDate(date);
    setRightSelectedFile(null);
    setShowRightCalendar(false);
  };

  const extractRoomNumber = (fileName: string): string | null => {
    if (!fileName) {
      return null;
    }
    const match = fileName.match(/\d+/); // Match digits in the filename
    return match ? match[0] : null; // Return the room number or null
  };
  

  const handleLeftThumbnailClick = (fileUrl: string) => {
    console.log(`Left file URL clicked: ${fileUrl}`);
  
    // Check if the file is already selected for the right view
    if (fileUrl === rightSelectedFile) {
      alert('This file is already selected for the right view!');
      return;
    }
  
    const fileName = fileUrl.split("/").pop(); // Extract the filename
    const leftRoomNumber = extractRoomNumber(fileName ?? ""); // Extract room number from the filename
  
    console.log(`Left Room Number: ${leftRoomNumber}`);
  
    // If there's a right file selected, compare the room numbers
    if (rightSelectedFile) {
      const rightFileName = rightSelectedFile.split("/").pop();
      const rightRoomNumber = extractRoomNumber(rightFileName ?? "");
  
      if (leftRoomNumber !== rightRoomNumber) {
        alert("Please select files from the same room.");
        return; // Stop execution if the room numbers do not match
      }
    }
  
    setLeftSelectedFile(fileUrl);
    if (fileUrl.endsWith('.glb') || fileUrl.endsWith('.obj') || fileUrl.endsWith('.e57')) {
      setLeftHDImageUrl(fileUrl);
      setShowLeftPCDViewer(true);
    } else {
      setLeftHDImageUrl(fileUrl);
      setShowLeft360Viewer(true);
    }
  };

  const handleRightThumbnailClick = (fileUrl: string) => {
    console.log(`Right file URL clicked: ${fileUrl}`);
  
    // Check if the file is already selected for the left view
    if (fileUrl === leftSelectedFile) {
      alert('This file is already selected for the left view!');
      return;
    }
  
    const fileName = fileUrl.split("/").pop(); // Extract the filename
    const rightRoomNumber = extractRoomNumber(fileName ?? ""); // Extract room number from the filename
  
    console.log(`Right Room Number: ${rightRoomNumber}`);
  
    // If there's a left file selected, compare the room numbers
    if (leftSelectedFile) {
      const leftFileName = leftSelectedFile.split("/").pop();
      const leftRoomNumber = extractRoomNumber(leftFileName ?? "");
  
      if (rightRoomNumber !== leftRoomNumber) {
        alert("Please select files from the same room.");
        return; // Stop execution if the room numbers do not match
      }
    }
  
    setRightSelectedFile(fileUrl);
    if (fileUrl.endsWith('.glb') || fileUrl.endsWith('.obj') || fileUrl.endsWith('.e57')) {
      setRightHDImageUrl(fileUrl);
      setShowRightPCDViewer(true);
    } else {
      setRightHDImageUrl(fileUrl);
      setShowRight360Viewer(true);
    }
  };

  const closePublishModal = () => {
    setIsModalOpen(false);
    setIncludeImages(false);
    setIncludeNotes(false);
    setValidationMessage(null);
  };

  const generatePDFWithNotes = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Comparison Report Notes', 10, 10);
    doc.setFontSize(12);
    
    if (isSeparateNotes) {
      // Include separate notes for left and right views
      doc.text('Left View Notes:', 10, 20);
      doc.text(leftNotes || "No notes provided for Left View.", 10, 30, { maxWidth: 180 });
  
      doc.text('Right View Notes:', 10, 50);
      doc.text(rightNotes || "No notes provided for Right View.", 10, 60, { maxWidth: 180 });
    } else {
      // Include general notes
      doc.text(notes || "No general notes provided.", 10, 20, { maxWidth: 180 });
    }
  
    doc.save('Comparison_Report_Notes.pdf');
  };

  const publishReports = async () => {
    if (savedReports.current.length === 0) {
      alert('No saved reports to publish.');
      return;
    }
  
    // Create a new PDFDocument for the consolidated report
    const consolidatedPdf = await PDFDocument.create();
  
    for (const report of savedReports.current) {
      const existingPdfBytes = await report.pdfBlob.arrayBuffer(); // Convert Blob to ArrayBuffer
      const existingPdf = await PDFDocument.load(existingPdfBytes); // Load the saved PDF into pdf-lib
  
      // Copy pages from the existing PDF to the new consolidated PDF
      const copiedPages = await consolidatedPdf.copyPages(existingPdf, existingPdf.getPageIndices());
      copiedPages.forEach((page) => consolidatedPdf.addPage(page));
    }
  
    // Save the consolidated PDF and trigger download
    const consolidatedPdfBytes = await consolidatedPdf.save();
    const blob = new Blob([consolidatedPdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Consolidated_Reports.pdf';
    link.click();
    
    savedReports.current = []; 
    setIsModalOpen(false);
  };
  
  const handleModalPublish = (action: 'save' | 'publish') => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString();
    let currentY = 110; // Starting Y position after the header
  
    // Title Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(40);
    const reportNumber = savedReports.current.length + 1; // Incremental report number
    const dynamicTitle = `Comparison Report: ${reportNumber}`;
    doc.text(dynamicTitle, 105, 15, { align: 'center' });
  
    // Date and Divider
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Date: ${currentDate}`, 10, 25);
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(10, 30, 200, 30); // Divider under title
  
    // Section: Project Information
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(60);
    doc.text("Project Information:", 10, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Project Name:", 10, 50);
    doc.setFont("helvetica", "italic");
    doc.text("A6_stern", 50, 50);
    doc.setFont("helvetica", "normal");
    doc.text("Generated By:", 10, 60);
    doc.setFont("helvetica", "italic");
    doc.text("John Doe", 50, 60);
  
    // Project Zone Section
    doc.setFont("helvetica", "bold");
    doc.text("Project Zone:", 10, 70);
    doc.setFont("helvetica", "italic");
  
    if (leftImageDetails && rightImageDetails) {
      doc.text("This report compares two images:", 10, 80);
      doc.text(
        `Left View: Based on ${leftImageDetails.fileName ?? ''} of Room ${leftImageDetails.fileName?.match(/\d+/)?.[0] ?? ''} taken on ${leftImageDetails.date ?? ''}.`,
        10,
        90,
        { maxWidth: 180 }
      );
      doc.text(
        `Right View: Based on ${rightImageDetails.fileName ?? ''} of Room ${rightImageDetails.fileName?.match(/\d+/)?.[0] ?? ''} taken on ${rightImageDetails.date ?? ''}.`,
        10,
        100,
        { maxWidth: 180 }
      );
      currentY = 110;
    } else if (leftImageDetails || rightImageDetails) {
      const imageDetails = leftImageDetails || rightImageDetails;
      doc.text(
        `This report is generated based on ${imageDetails?.fileName ?? ''} of Room ${imageDetails?.fileName?.match(/\d+/)?.[0] ?? ''} taken on ${imageDetails?.date ?? ''}.`,
        10,
        80,
        { maxWidth: 180 }
      );
      currentY = 90;
    }
    // Observations Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(60);
  
    if (leftImageDetails) {
      doc.text("Observation of Image 1", 10, currentY);
      currentY += 10;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      const leftObservationText = "AI-generated explanation of the image 1 goes here";
      const leftObservationLines = doc.splitTextToSize(leftObservationText, 180);
      doc.text(leftObservationLines, 10, currentY);
      currentY += leftObservationLines.length * 6 + 10;
    }
  
    if (rightImageDetails) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Observation of Image 2", 10, currentY);
      currentY += 10;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      const rightObservationText = "AI-generated explanation of the image 2 goes here";
      const rightObservationLines = doc.splitTextToSize(rightObservationText, 180);
      doc.text(rightObservationLines, 10, currentY);
      currentY += rightObservationLines.length * 6 + 10;
    }
  
    // Section: Notes
    // if(includeNotes){
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(60);
    
      doc.text('Left View Notes:', 10, currentY);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      const leftNotesText = doc.splitTextToSize(leftNotes || "No notes provided for Left View.", 180);
      doc.text(leftNotesText, 10, currentY + 10);
      currentY += leftNotesText.length * 6 + 20;
    
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text('Right View Notes:', 10, currentY);
      doc.setFont("helvetica", "italic");
      const rightNotesText = doc.splitTextToSize(rightNotes || "No notes provided for Right View.", 180);
      doc.text(rightNotesText, 10, currentY + 10);
      currentY += rightNotesText.length * 6 + 20;
    // }
  
    // Section: Report Flags
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(60);
    doc.text('Report Flags:', 10, currentY);
  
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
  
    let flagsText = "";
  
    if (leftDelayed || leftQualityIssue || leftSafetyIssue) {
      flagsText += "Left View is marked";
      const leftIssues = [];
      if (leftDelayed) leftIssues.push("as delayed");
      if (leftQualityIssue) leftIssues.push("for having a Quality Issue");
      if (leftSafetyIssue) leftIssues.push("for having a Safety Issue");
      flagsText += ` ${leftIssues.join(" and ")}. `;
    }
  
    if (rightDelayed || rightQualityIssue || rightSafetyIssue) {
      flagsText += "Right View is marked";
      const rightIssues = [];
      if (rightDelayed) rightIssues.push("as delayed");
      if (rightQualityIssue) rightIssues.push("for having a Quality Issue");
      if (rightSafetyIssue) rightIssues.push("for having a Safety Issue");
      flagsText += ` ${rightIssues.join(" and ")}. `;
    }
  
    if (!flagsText) {
      flagsText = "No issues marked.";
    }
  
    const flagsTextLines = doc.splitTextToSize(flagsText, 180);
    doc.text(flagsTextLines, 10, currentY + 10);
    currentY += flagsTextLines.length * 6 + 20;
  
    // Section: Reference Images Table
    // doc.addPage();
    // currentY = 20; // Reset Y position for the new section

    // // Section Header
    // doc.setFont("helvetica", "bold");
    // doc.setFontSize(16);
    // doc.setTextColor(40); // Dark gray
    // doc.text("Reference Images", 105, currentY, { align: 'center' });
    // currentY += 10;

    // doc.setDrawColor(200); // Light gray for borders
    // const leftColumnX = 20;
    // const rightColumnX = 120;
    // let rowY = currentY;

    // const rows = Math.max(leftViewerScreenshots.length, rightViewerScreenshots.length);

    // for (let i = 0; i < rows; i++) {
    //   if (rowY > 250) {
    //     doc.addPage();
    //     rowY = 20;
    //     doc.setFont("helvetica", "bold");
    //     doc.text("Reference Images", 105, rowY, { align: 'center' });
    //     rowY += 10;
    //   }

    //   // Add left screenshot with border
    //   if (leftViewerScreenshots[i]) {
    //     doc.addImage(leftViewerScreenshots[i], 'PNG', leftColumnX, rowY, 80, 80);
    //   }

    //   // Add right screenshot with border
    //   if (rightViewerScreenshots[i]) {
    //     doc.addImage(rightViewerScreenshots[i], 'PNG', rightColumnX, rowY, 80, 80);
    //   }

    //   rowY += 90; // Adjust row spacing for better readability
    // }

    // Section: Screenshots and Notes
   
      doc.addPage(); // Start a new page for this section
      currentY = 20; // Reset Y position for the new section

      // Section Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(40);
      doc.text("Screenshots and Notes", 105, currentY, { align: 'center' });
      currentY += 20;

      const screenshotImageHeight = 80;
      const screenshotImageWidth = 80;
      const leftScreenshotColumnX = 20;
      const rightScreenshotColumnX = 120;

      // Render screenshots and descriptions
      const maxRows = Math.max(leftAdditionalScreenshotNotes.images.length, rightAdditionalScreenshotNotes.images.length);

      // Initialize max Y positions for descriptions
      let leftMaxY = currentY;
      let rightMaxY = currentY;

      for (let i = 0; i < maxRows; i++) {
        if (currentY + screenshotImageHeight > 280) {
          // Add a new page if nearing the bottom
          doc.addPage();
          currentY = 20;
          doc.setFont("helvetica", "bold");
          doc.text("Screenshots and Notes (continued)", 105, currentY, { align: 'center' });
          currentY += 20;

          leftMaxY = currentY;
          rightMaxY = currentY;
        }

        // Add left screenshot if it exists
        if (leftAdditionalScreenshotNotes.images[i]) {
          doc.addImage(leftAdditionalScreenshotNotes.images[i], 'PNG', leftScreenshotColumnX, currentY, screenshotImageWidth, screenshotImageHeight);
          leftMaxY = currentY + screenshotImageHeight; // Track the bottom Y position of the last left screenshot
        }

        // Add right screenshot if it exists
        if (rightAdditionalScreenshotNotes.images[i]) {
          doc.addImage(rightAdditionalScreenshotNotes.images[i], 'PNG', rightScreenshotColumnX, currentY, screenshotImageWidth, screenshotImageHeight);
          rightMaxY = currentY + screenshotImageHeight; // Track the bottom Y position of the last right screenshot
        }

        currentY += screenshotImageHeight + 10; // Add spacing between rows
      }

      // Render left description below the last left screenshot
      if (leftAdditionalScreenshotNotes.images.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Description:", leftScreenshotColumnX, leftMaxY + 10);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.text(
          doc.splitTextToSize(leftAdditionalScreenshotNotes.text || "No notes provided for these screenshots.", 80),
          leftScreenshotColumnX,
          leftMaxY + 20
        );
      }

      // Render right description below the last right screenshot
      if (rightAdditionalScreenshotNotes.images.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Description:", rightScreenshotColumnX, rightMaxY + 10);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.text(
          doc.splitTextToSize(rightAdditionalScreenshotNotes.text || "No notes provided for these screenshots.", 80),
          rightScreenshotColumnX,
          rightMaxY + 20
        );
      }
    
    
    // Generate the PDF Blob
    const pdfBlob = doc.output('blob'); // Generate the PDF as a Blob
    const newReport = {
      id: savedReports.current.length + 1, // Unique ID
      title: `Report ${savedReports.current.length + 1}`, // Title
      createdAt: new Date().toISOString(), // Timestamp
      pdfBlob, // PDF Blob
    };

    // Save the report in memory
    savedReports.current.push(newReport);
    console.log('Report saved:', newReport);

    if (action === 'save') {
      alert('Report saved successfully!');
      resetBottomSectionInputs();
      
    } else if (action === 'publish') {
      publishReports(); // Consolidate all saved reports into one
    }
  };

  const resetBottomSectionInputs = () => {
    // Reset notes
    setLeftNotes('');
    setRightNotes('');
  
    // Reset additional screenshot notes
    setLeftAdditionalScreenshotNotes({ images: [], text: '' });
    setRightAdditionalScreenshotNotes({ images: [], text: '' });
  
    // Reset flags
    setLeftSafetyIssue(false);
    setLeftQualityIssue(false);
    setLeftDelayed(false);
  
    setRightSafetyIssue(false);
    setRightQualityIssue(false);
    setRightDelayed(false);
  
    console.log("All bottom section inputs have been reset.");
  };
  
  return (
    <div className="w-full max-w-screen-3xl bg-white rounded-md shadow-default dark:bg-boxdark dark:text-white p-4 mx-auto mt-6">
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-black dark:text-white">Compare View</h1>
        
        <button
          onClick={() =>setIsBackModalOpen(true)}
          className="bg-primary text-white font-semibold py-2 px-3 rounded-lg shadow-lg transition-transform duration-300 hover:scale-105 flex items-center justify-center"
        >
          <svg fill="#ffffff" height="24px" width="24px" viewBox="0 0 288.312 288.312" xmlns="http://www.w3.org/2000/svg">
            <path d="M127.353,3.555c-4.704-4.74-12.319-4.74-17.011,0L15.314,99.653c-4.74,4.788-4.547,12.884,0.313,17.48l94.715,95.785c4.704,4.74,12.319,4.74,17.011,0c4.704-4.74,4.704-12.427,0-17.167l-74.444-75.274h199.474v155.804c0,6.641,5.39,12.03,12.03,12.03c6.641,0,12.03-5.39,12.03-12.03V108.231c0-6.641-5.39-12.03-12.03-12.03H52.704l74.648-75.49C132.056,15.982,132.056,8.295,127.353,3.555z" />
          </svg>
        </button>
      </div>

      {/* Left & Right views */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Left Viewer Section */}
        <div className="flex flex-col items-center justify-center w-full h-[70vh] bg-slate-100 dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg">
          {showLeftCalendar ? (
            <>
              <CompareCalendar availableDates={availableDates} onDateSelect={handleLeftDateSelect} />
              <p className="text-gray-300 mt-4">{leftSelectedDate ? `Selected: ${leftSelectedDate}` : 'No date selected'}</p>
            </>
          ) : (
            <>
              {showLeftPCDViewer ? (
                <ComparePCDViewer modelUrl={leftHDImageUrl as string} onClose={() => setShowLeftPCDViewer(false)} />
              ) : showLeft360Viewer ? (
                <Compare360Viewer
                  onTakeScreenshot={handleLeftScreenshotAssignment}
                  imageUrl={leftHDImageUrl as string}
                  onClose={handleCloseLeft360Viewer}
                  onScreenshotsUpdate={handleLeftScreenshot}
                  onImageDetailsUpdate={handleLeftImageDetailsUpdate}
                  sharedCameraPosition={sharedCameraPosition}
                  setSharedCameraPosition={setSharedCameraPosition}
                  isSynchronized={isSynchronized}
                />
              ) : (
                leftSelectedDate && (
                  <CompareFileExplorer
                    selectedDate={leftSelectedDate}
                    onFileSelect={handleLeftThumbnailClick}
                    className="w-full h-full"
                    disabledFile={rightSelectedFile}
                    onBackToCalendar={() => setShowLeftCalendar(true)}
                  />
                )
              )}
            </>
          )}
          {/* {leftSelectedFile && (
            <div className="mt-4">
              <p className="text-white text-center">Selected File: {leftSelectedFile.split('/').pop()}</p>
            </div>
          )} */}
        </div>
  
        {/* Right Viewer Section */}
        <div className="flex flex-col items-center justify-center w-full h-[70vh] bg-slate-100 dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg">
          {showRightCalendar ? (
            <>
              <CompareCalendar availableDates={availableDates} onDateSelect={handleRightDateSelect} />
              <p className="text-gray-300 mt-4">{rightSelectedDate ? `Selected: ${rightSelectedDate}` : 'No date selected'}</p>
            </>
          ) : (
            <>
              {showRightPCDViewer ? (
                <ComparePCDViewer modelUrl={rightHDImageUrl as string} onClose={() => setShowRightPCDViewer(false)} />
              ) : showRight360Viewer ? (
                <Compare360Viewer
                  onTakeScreenshot={handleRightScreenshotAssignment}
                  imageUrl={rightHDImageUrl as string}
                  onClose={handleCloseRight360Viewer}
                  onScreenshotsUpdate={handleRightScreenshot}
                  onImageDetailsUpdate={handleRightImageDetailsUpdate}
                  sharedCameraPosition={sharedCameraPosition}
                  setSharedCameraPosition={setSharedCameraPosition}
                  isSynchronized={isSynchronized}
                />
              ) : (
                rightSelectedDate && (
                  <CompareFileExplorer
                    selectedDate={rightSelectedDate}
                    onFileSelect={handleRightThumbnailClick}
                    className="w-full h-full"
                    disabledFile={leftSelectedFile}
                    onBackToCalendar={() => setShowRightCalendar(true)}
                  />
                )
              )}
            </>
          )}
          {/* {rightSelectedFile && (
            <div className="mt-4">
              <p className="text-white text-center">Selected File: {rightSelectedFile.split('/').pop()}</p>
            </div>
          )} */}
        </div>
      </div>

      {/* Compare and Lock buttons */}
      <div className="flex justify-between items-center mt-3 mb-3">
        <div className="toolbar flex items-center">
          <input
            id="lock-checkbox"
            type="checkbox"
            className="form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out cursor-pointer ml-1"
            checked={isSynchronized}
            onChange={toggleSynchronization}
          />
          <label
            htmlFor="lock-checkbox"
            className="text-gray-700 dark:text-gray-300 font-medium cursor-pointer ml-2"
          >
            Lock
          </label>
        </div>
        <button
          onClick={handleCompareClick}
          disabled={!leftSelectedFile || !rightSelectedFile || !leftTakeScreenshot || !rightTakeScreenshot}
          className={`py-3 px-6 rounded-lg font-semibold shadow-md transition-transform duration-200 transform hover:scale-105 focus:outline-none ${
            leftSelectedFile &&
            rightSelectedFile 
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isBottomSectionVisible ? 'Snapshot' :'Snapshot & Compare'}
        </button>


      </div>

      {isBottomSectionVisible && (
        <div>
          {/* Notes Text Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <textarea
              placeholder="Add notes for the left view here..."
              value={leftNotes}
              onChange={(e) => setLeftNotes(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-strokedark rounded-md p-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
            />
            <textarea
              placeholder="Add notes for the right view here..."
              value={rightNotes}
              onChange={(e) => setRightNotes(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-strokedark rounded-md p-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
            />
            
              {/* Left Screenshot Notes */}
              <div>
                <label
                  htmlFor="leftAdditionalScreenshotNotes"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Left Screenshot Notes
                </label>
                <div className="border border-gray-300 dark:border-strokedark rounded-md p-4 shadow-sm">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {leftAdditionalScreenshotNotes.images.map((image, index) => (
                      <div
                        key={index}
                        className="relative group"
                      >
                        <img
                          src={image}
                          alt={`Left Screenshot ${index + 1}`}
                          className="rounded-md shadow-sm w-32 h-auto"
                          onClick={() => handleImageClick(image)}
                        />
                        <button
                          onClick={() => handleDeleteImage("left", index)}
                          className="absolute top-0 right-0 bg-white text-black rounded-full w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          ✕
                        </button>
                      </div>
                      ))}
                  </div>
                  <textarea
                    id="leftAdditionalScreenshotNotes"
                    rows={4}
                    placeholder="Comments for the left screenshot..."
                    className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-strokedark rounded-md p-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={leftAdditionalScreenshotNotes.text}
                    onChange={(e) =>
                      setLeftAdditionalScreenshotNotes((prev) => ({ ...prev, text: e.target.value }))
                    }
                  ></textarea>
                </div>
              </div>

              {/* Right Screenshot Notes */}
              <div>
                <label
                  htmlFor="rightAdditionalScreenshotNotes"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Right Screenshot Notes
                </label>
                <div className="border border-gray-300 dark:border-strokedark rounded-md p-4 shadow-sm">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {rightAdditionalScreenshotNotes.images.map((image, index) => (
                      <div
                        key={index}
                        className="relative group"
                      >
                        <img
                          src={image}
                          alt={`Right Screenshot ${index + 1}`}
                          className="rounded-md shadow-sm w-32 h-auto"
                          onClick={() => handleImageClick(image)}
                        />
                        <button
                          onClick={() => handleDeleteImage("right", index)}
                          className="absolute top-0 right-0 bg-white text-black rounded-full w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    </div>
                  <textarea
                    id="rightAdditionalScreenshotNotes"
                    rows={4}
                    placeholder="Comments for the right screenshot..."
                    className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-strokedark rounded-md p-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={rightAdditionalScreenshotNotes.text}
                    onChange={(e) =>
                      setRightAdditionalScreenshotNotes((prev) => ({ ...prev, text: e.target.value }))
                    }
                  ></textarea>
                </div>
              </div>
            

          </div>

          {/* Flags Section */}
          <div className="flex items-center mb-3 mt-3 ml-2 space-x-6">
            {/* Left View Flags */}
            <div className="flex items-center space-x-4">
              <label className="text-gray-700 dark:text-gray-300 font-semibold">Left View Flags:</label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={leftSafetyIssue}
                  onChange={() => setLeftSafetyIssue(!leftSafetyIssue)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                <label className="text-gray-700 dark:text-gray-300">Safety Issue</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={leftQualityIssue}
                  onChange={() => setLeftQualityIssue(!leftQualityIssue)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                <label className="text-gray-700 dark:text-gray-300">Quality Issue</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={leftDelayed}
                  onChange={() => setLeftDelayed(!leftDelayed)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                <label className="text-gray-700 dark:text-gray-300">Delayed</label>
              </div>
            </div>

            {/* Right View Flags */}
            <div className="flex items-end space-x-4">
              <label className="text-gray-700 dark:text-gray-300 font-semibold ml-125">Right View Flags:</label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={rightSafetyIssue}
                  onChange={() => setRightSafetyIssue(!rightSafetyIssue)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                <label className="text-gray-700 dark:text-gray-300">Safety Issue</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={rightQualityIssue}
                  onChange={() => setRightQualityIssue(!rightQualityIssue)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                <label className="text-gray-700 dark:text-gray-300">Quality Issue</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={rightDelayed}
                  onChange={() => setRightDelayed(!rightDelayed)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                <label className="text-gray-700 dark:text-gray-300">Delayed</label>
              </div>
            </div>
          </div>

          {/* Buttons Section */}
          <div className="flex justify-end mt-6 gap-3">
            <button
              onClick={() => handleModalPublish('save')}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-transform duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Save
            </button>
            <button
              onClick={openPublishModal}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-transform duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Generate Report
            </button>
          </div>
        </div>
      )} 
  
      {/* Publish Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-999">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg max-w-md w-full">
            {/* <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-200">Publish Report</h2> */}
            
            <div className="mb-4">
              {/* <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={() => setIncludeImages(!includeImages)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                <span className="text-gray-700 dark:text-gray-300">Include Screenshots</span>
              </label>
              <label className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={() => setIncludeNotes(!includeNotes)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                <span className="text-gray-700 dark:text-gray-300">Include Notes</span>
              </label> */}
              <p className='text-lg mb-5'>Publishing will clear all previously saved reports.</p>
            </div>
  
            {validationMessage && (
              <p className="text-red-600 text-sm mb-4">{validationMessage}</p>
            )}
  
            <div className="flex flex-col space-y-3">
              <div className='flex justify-end space-x-3'>
                <button
                  onClick={closePublishModal}
                  className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleModalPublish('publish')}
                  className="bg-indigo-600 text-white py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Publish
                </button>
              </div>
              {/* <p className='text-sm'><b>Note: </b>Publishing will clear all previously saved reports.</p> */}
            </div>
          </div>
        </div>
      )}

      {isScreenshotModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-999">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-[65rem] max-w-full p-4 relative">
            <button
              onClick={() => setIsScreenshotModalOpen(false)}
              className="absolute top-3 right-3 bg-gray-300 dark:bg-gray-700 p-2 rounded-full hover:bg-gray-400 dark:hover:bg-gray-600 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-6 h-6 text-gray-800 dark:text-white"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-center text-xl font-bold text-gray-900 dark:text-white mb-3">Comparison Screenshots</h2>
            
            <div className="flex justify-between items-center space-x-6">
              <div className='flex flex-col space-y-2'>
                <div className="flex flex-col items-center space-y-2">
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Left View</h3>
                  {leftScreenshot ? (
                    <img
                      src={leftScreenshot}
                      alt="Left View Screenshot"
                      className="rounded-lg shadow-md max-w-full max-h-full border border-gray-300 dark:border-gray-700"
                    />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No Screenshot Available</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (leftScreenshot) {
                      const link = document.createElement("a");
                      link.href = leftScreenshot;
                      link.download = "Left_View_Screenshot.png";
                      link.click();
                    }
                  }}
                  className="bg-primary text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:opacity-80  transition"
                >
                  Download Left Screenshot
                </button>
              </div>
              
              <div className='flex flex-col space-y-2'>
                <div className="flex flex-col items-center space-y-2">
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Right View</h3>
                  {rightScreenshot ? (
                    <img
                      src={rightScreenshot}
                      alt="Right View Screenshot"
                      className="rounded-lg shadow-md max-w-full h-auto border border-gray-300 dark:border-gray-700"
                    />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No Screenshot Available</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (rightScreenshot) {
                      const link = document.createElement("a");
                      link.href = rightScreenshot;
                      link.download = "Right_View_Screenshot.png";
                      link.click();
                    }
                  }}
                  className="bg-primary text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:opacity-80 transition"
                >
                  Download Right Screenshot
                </button>
              </div>
            </div>

            <div className="flex justify-center mt-3">
              <button
                onClick={() => {
                  if (leftScreenshot) {
                    const leftLink = document.createElement("a");
                    leftLink.href = leftScreenshot;
                    leftLink.download = "Left_View_Screenshot.png";
                    leftLink.click();
                  }
                  if (rightScreenshot) {
                    const rightLink = document.createElement("a");
                    rightLink.href = rightScreenshot;
                    rightLink.download = "Right_View_Screenshot.png";
                    rightLink.click();
                  }
                }}
                className="bg-green-500 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:opacity-80 transition"
              >
                Download Both Screenshots
              </button>
            </div>
          </div>
        </div>
      )}

      {isImageModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-999">
          <div className="relative w-1/2">
            <img
              src={selectedImage}
              alt="Selected Screenshot"
              className="w-full rounded-md"
            />
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-2 right-2 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center text-xl z-9999"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {isBackModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-9999">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg max-w-md w-full">
            <p className="text-lg  mb-6 text-gray-900 dark:text-gray-200">Any unpublished reports will be lost if you proceed. Are you sure you want to continue? </p>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={closeBackModal}
                className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate('/A6_stern')}
                className="bg-indigo-600 text-white py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
  
};

export default ComparePage;
