import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CompareCalendar from './CompareCalendar';
import CompareFileExplorer, { type CompareExplorerFileSelection } from './CompareFileExplorer';
import Compare360Viewer from './Compare360Viewer';
import { useNavigate, useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import ComparePCDViewer from './ComparePCDViewer';
import { PDFDocument } from 'pdf-lib'; // Install this with npm
import { useCaptureDatesSummary } from '../../hooks/useCaptureDatesSummary';
import {
  buildComparisonFieldObservationPdf,
  fieldObservationReportReference,
  type ComparisonReportSide,
  type FieldObservationFlags,
} from '../../utils/engineeringReportPdf';
import { getAccessToken, readSession } from '../../auth/authSession';
import {
  API_BASE,
  createComparisonDraftWithPdf,
  getComparisonDraft,
  listComparisonDrafts,
  publishComparisonDrafts,
  updateComparisonDraftWithPdf,
  type ApiComparisonDraft,
} from '../../services/apiClient';
import { flagsFromObservationBooleans } from '../../utils/observationReportFlags';

type CompareViewerSide = 'left' | 'right';

type CompareDraftSideV1 = {
  captureDate: string;
  fileId: string;
  fileUrl: string;
  displayFileName: string;
  roomLabel: string;
  mediaType?: string;
  viewerKind: '360' | 'pcd';
};

type CompareDraftStateV1 = {
  version: 1;
  left: CompareDraftSideV1 | null;
  right: CompareDraftSideV1 | null;
  leftNotes: string;
  rightNotes: string;
  leftAnnex: { images: string[]; text: string };
  rightAnnex: { images: string[]; text: string };
  leftFlags: { safety: boolean; quality: boolean; delayed: boolean };
  rightFlags: { safety: boolean; quality: boolean; delayed: boolean };
};

function isCompareDraftStateV1(x: unknown): x is CompareDraftStateV1 {
  return (
    typeof x === 'object' &&
    x !== null &&
    (x as { version?: unknown }).version === 1 &&
    typeof (x as { leftNotes?: unknown }).leftNotes === 'string' &&
    typeof (x as { rightNotes?: unknown }).rightNotes === 'string'
  );
}

function normalizeCompareDate(raw: string): string {
  if (!raw) return '';
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

type CameraSyncState = {
  position: [number, number, number];
  target: [number, number, number];
  source: CompareViewerSide;
  seq: number;
};

const ComparePage: React.FC = () => {
  const { dataByDate } = useCaptureDatesSummary();
  const availableDates = useMemo(
    () => Object.keys(dataByDate).sort(),
    [dataByDate],
  );
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftQueryId = searchParams.get('draft');

  const [leftSelectedDate, setLeftSelectedDate] = useState<string | null>(null);
  const [rightSelectedDate, setRightSelectedDate] = useState<string | null>(null);
  const [leftSelectedFile, setLeftSelectedFile] = useState<string | null>(null);
  const [rightSelectedFile, setRightSelectedFile] = useState<string | null>(null);
  const [leftSelectedFileId, setLeftSelectedFileId] = useState<string | null>(null);
  const [rightSelectedFileId, setRightSelectedFileId] = useState<string | null>(null);

  const [showLeftCalendar, setShowLeftCalendar] = useState(true);
  const [showRightCalendar, setShowRightCalendar] = useState(true);
  const [showLeft360Viewer, setShowLeft360Viewer] = useState(false);
  const [showRight360Viewer, setShowRight360Viewer] = useState(false);

  const [leftHDImageUrl, setLeftHDImageUrl] = useState<string | null>(null);
  const [rightHDImageUrl, setRightHDImageUrl] = useState<string | null>(null);

  const [leftViewerMeta, setLeftViewerMeta] = useState<{
    displayFileName: string;
    roomLabel: string;
    captureDate: string;
    mediaType?: string;
  } | null>(null);
  const [rightViewerMeta, setRightViewerMeta] = useState<{
    displayFileName: string;
    roomLabel: string;
    captureDate: string;
    mediaType?: string;
  } | null>(null);

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

  const [sharedCameraState, setSharedCameraState] = useState<CameraSyncState | null>(null);
  const [lastLeftCameraState, setLastLeftCameraState] = useState<CameraSyncState | null>(null);
  const [lastRightCameraState, setLastRightCameraState] = useState<CameraSyncState | null>(null);
  const [lockLeader, setLockLeader] = useState<CompareViewerSide | null>(null);
  const [isSynchronized, setIsSynchronized] = useState(false);

  const [leftTakeScreenshot, setLeftTakeScreenshot] = useState<() => string | null>(() => () => null);
  const [rightTakeScreenshot, setRightTakeScreenshot] = useState<() => string | null>(() => () => null);

  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [leftScreenshot, setLeftScreenshot] = useState<string | null>(null);
  const [rightScreenshot, setRightScreenshot] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const handleCloseLeft360Viewer = () => {
    setLeftSelectedFile(null);
    setLeftSelectedFileId(null);
    setShowLeft360Viewer(false);
    setLeftViewerMeta(null);
  };
  const handleCloseRight360Viewer = () => {
    setRightSelectedFile(null);
    setRightSelectedFileId(null);
    setShowRight360Viewer(false);
    setRightViewerMeta(null);
  };

  const [safetyIssue, setSafetyIssue] = useState(false);
  const [qualityIssue, setQualityIssue] = useState(false);
  const [delayed, setDelayed] = useState(false);

  const [leftSafetyIssue, setLeftSafetyIssue] = useState(false);
  const [leftQualityIssue, setLeftQualityIssue] = useState(false);
  const [leftDelayed, setLeftDelayed] = useState(false);

  const [rightSafetyIssue, setRightSafetyIssue] = useState(false);
  const [rightQualityIssue, setRightQualityIssue] = useState(false);
  const [rightDelayed, setRightDelayed] = useState(false);

  const [comparisonDrafts, setComparisonDrafts] = useState<ApiComparisonDraft[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  const openPublishModal = () => setIsModalOpen(true);

  const buildCompareDraftState = useCallback((): CompareDraftStateV1 => {
    const sideSnapshot = (
      fileId: string | null,
      fileUrl: string | null,
      meta: {
        displayFileName: string;
        roomLabel: string;
        captureDate: string;
        mediaType?: string;
      } | null,
      selectedDate: string | null,
      usePcd: boolean,
    ): CompareDraftSideV1 | null => {
      if (!fileId) return null;
      return {
        captureDate: selectedDate || meta?.captureDate || '',
        fileId,
        fileUrl: fileUrl || '',
        displayFileName: meta?.displayFileName || '',
        roomLabel: meta?.roomLabel || '',
        mediaType: meta?.mediaType,
        viewerKind: usePcd ? 'pcd' : '360',
      };
    };

    return {
      version: 1,
      left: sideSnapshot(
        leftSelectedFileId,
        leftSelectedFile,
        leftViewerMeta,
        leftSelectedDate,
        showLeftPCDViewer,
      ),
      right: sideSnapshot(
        rightSelectedFileId,
        rightSelectedFile,
        rightViewerMeta,
        rightSelectedDate,
        showRightPCDViewer,
      ),
      leftNotes,
      rightNotes,
      leftAnnex: { ...leftAdditionalScreenshotNotes },
      rightAnnex: { ...rightAdditionalScreenshotNotes },
      leftFlags: {
        safety: leftSafetyIssue,
        quality: leftQualityIssue,
        delayed: leftDelayed,
      },
      rightFlags: {
        safety: rightSafetyIssue,
        quality: rightQualityIssue,
        delayed: rightDelayed,
      },
    };
  }, [
    leftSelectedFileId,
    leftSelectedFile,
    leftViewerMeta,
    leftSelectedDate,
    showLeftPCDViewer,
    rightSelectedFileId,
    rightSelectedFile,
    rightViewerMeta,
    rightSelectedDate,
    showRightPCDViewer,
    leftNotes,
    rightNotes,
    leftAdditionalScreenshotNotes,
    rightAdditionalScreenshotNotes,
    leftSafetyIssue,
    leftQualityIssue,
    leftDelayed,
    rightSafetyIssue,
    rightQualityIssue,
    rightDelayed,
  ]);

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
    setIsSynchronized((prev) => {
      const next = !prev;
      if (next) {
        // Snap follower immediately to the last known leader view.
        const seed = lastLeftCameraState ?? lastRightCameraState;
        if (seed) {
          setSharedCameraState({
            ...seed,
            source: lastLeftCameraState ? 'left' : 'right',
            seq: seed.seq + 1,
          });
          setLockLeader(lastLeftCameraState ? 'left' : 'right');
        }
      } else {
        setLockLeader(null);
      }
      return next;
    });
  };

  const handleCameraStateChange = (side: CompareViewerSide, state: Omit<CameraSyncState, 'source' | 'seq'>) => {
    const fullState: CameraSyncState = {
      ...state,
      source: side,
      seq: Date.now(),
    };

    if (side === 'left') {
      setLastLeftCameraState(fullState);
    } else {
      setLastRightCameraState(fullState);
    }

    if (!isSynchronized) return;
    if (lockLeader && lockLeader !== side) return;

    if (!lockLeader) {
      setLockLeader(side);
    }
    setSharedCameraState(fullState);
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
    setLeftSelectedFileId(null);
    setLeftViewerMeta(null);
    setShowLeftCalendar(false);
  };

  const handleRightDateSelect = (date: string) => {
    setRightSelectedDate(date);
    setRightSelectedFile(null);
    setRightSelectedFileId(null);
    setRightViewerMeta(null);
    setShowRightCalendar(false);
  };

  /** Room index for compare validation: prefer room02 in filename, else digit in "Room N" label. */
  const compareRoomKey = (sel: CompareExplorerFileSelection): string | null => {
    const fromFile = sel.displayFileName.match(/room(\d+)/i);
    if (fromFile) return String(parseInt(fromFile[1], 10));
    const fromLabel = sel.roomLabel.match(/(\d+)/);
    if (fromLabel) return String(parseInt(fromLabel[1], 10));
    return null;
  };

  const handleLeftThumbnailClick = (sel: CompareExplorerFileSelection) => {
    const { fileUrl } = sel;

    if (sel.mediaType === 'pdf') {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (fileUrl === rightSelectedFile) {
      alert('This file is already selected for the right view!');
      return;
    }

    const leftRoomNumber = compareRoomKey(sel);

    if (rightSelectedFile && rightViewerMeta) {
      const rightRoomNumber = compareRoomKey({
        fileUrl: rightSelectedFile,
        displayFileName: rightViewerMeta.displayFileName,
        roomLabel: rightViewerMeta.roomLabel,
        captureDate: rightViewerMeta.captureDate,
      });

      if (leftRoomNumber !== rightRoomNumber) {
        alert('Please select files from the same room.');
        return;
      }
    }

    setLeftSelectedFile(fileUrl);
    setLeftSelectedFileId(sel.fileId ?? null);
    setLeftViewerMeta({
      displayFileName: sel.displayFileName,
      roomLabel: sel.roomLabel,
      captureDate: sel.captureDate,
      mediaType: sel.mediaType,
    });

    const pathForExt = fileUrl.split('?')[0].toLowerCase();
    if (pathForExt.endsWith('.glb') || pathForExt.endsWith('.obj') || pathForExt.endsWith('.e57')) {
      setLeftHDImageUrl(fileUrl);
      setShowLeftPCDViewer(true);
    } else {
      setLeftHDImageUrl(fileUrl);
      setShowLeft360Viewer(true);
    }
  };

  const handleRightThumbnailClick = (sel: CompareExplorerFileSelection) => {
    const { fileUrl } = sel;

    if (sel.mediaType === 'pdf') {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (fileUrl === leftSelectedFile) {
      alert('This file is already selected for the left view!');
      return;
    }

    const rightRoomNumber = compareRoomKey(sel);

    if (leftSelectedFile && leftViewerMeta) {
      const leftRoomNumber = compareRoomKey({
        fileUrl: leftSelectedFile,
        displayFileName: leftViewerMeta.displayFileName,
        roomLabel: leftViewerMeta.roomLabel,
        captureDate: leftViewerMeta.captureDate,
      });

      if (rightRoomNumber !== leftRoomNumber) {
        alert('Please select files from the same room.');
        return;
      }
    }

    setRightSelectedFile(fileUrl);
    setRightSelectedFileId(sel.fileId ?? null);
    setRightViewerMeta({
      displayFileName: sel.displayFileName,
      roomLabel: sel.roomLabel,
      captureDate: sel.captureDate,
      mediaType: sel.mediaType,
    });

    const pathForExt = fileUrl.split('?')[0].toLowerCase();
    if (pathForExt.endsWith('.glb') || pathForExt.endsWith('.obj') || pathForExt.endsWith('.e57')) {
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

  const loadComparisonDrafts = useCallback(async () => {
    try {
      const drafts = await listComparisonDrafts();
      setComparisonDrafts(drafts);
    } catch {
      setComparisonDrafts([]);
    }
  }, []);

  useEffect(() => {
    void loadComparisonDrafts();
  }, [loadComparisonDrafts]);

  useEffect(() => {
    if (!draftQueryId) {
      setEditingDraftId(null);
      return;
    }

    let cancelled = false;

    const resolveFileUrl = (fileUrl: string, fileId: string): string => {
      const u = (fileUrl || '').trim();
      if (u) return u;
      return `${API_BASE}/files/${fileId}/content`;
    };

    const applySide = (side: CompareDraftSideV1 | null, which: CompareViewerSide) => {
      if (!side) {
        if (which === 'left') {
          setLeftSelectedDate(null);
          setLeftSelectedFile(null);
          setLeftSelectedFileId(null);
          setLeftViewerMeta(null);
          setLeftImageDetails(null);
          setLeftHDImageUrl(null);
          setShowLeft360Viewer(false);
          setShowLeftPCDViewer(false);
          setShowLeftCalendar(true);
        } else {
          setRightSelectedDate(null);
          setRightSelectedFile(null);
          setRightSelectedFileId(null);
          setRightViewerMeta(null);
          setRightImageDetails(null);
          setRightHDImageUrl(null);
          setShowRight360Viewer(false);
          setShowRightPCDViewer(false);
          setShowRightCalendar(true);
        }
        return;
      }

      const cap = normalizeCompareDate(side.captureDate);
      const url = resolveFileUrl(side.fileUrl, side.fileId);
      const usePcd =
        side.viewerKind === 'pcd' ||
        side.mediaType === 'pointcloud' ||
        /\.(glb|obj|e57)(\?|$)/i.test(url.split('?')[0]);

      if (which === 'left') {
        setLeftSelectedDate(cap || null);
        setShowLeftCalendar(false);
        setLeftSelectedFile(url);
        setLeftSelectedFileId(side.fileId);
        setLeftViewerMeta({
          displayFileName: side.displayFileName,
          roomLabel: side.roomLabel,
          captureDate: side.captureDate || cap,
          mediaType: side.mediaType,
        });
        setLeftImageDetails({
          fileName: side.displayFileName,
          date: side.captureDate || cap,
        });
        setLeftHDImageUrl(url);
        setShowLeftPCDViewer(usePcd);
        setShowLeft360Viewer(!usePcd);
      } else {
        setRightSelectedDate(cap || null);
        setShowRightCalendar(false);
        setRightSelectedFile(url);
        setRightSelectedFileId(side.fileId);
        setRightViewerMeta({
          displayFileName: side.displayFileName,
          roomLabel: side.roomLabel,
          captureDate: side.captureDate || cap,
          mediaType: side.mediaType,
        });
        setRightImageDetails({
          fileName: side.displayFileName,
          date: side.captureDate || cap,
        });
        setRightHDImageUrl(url);
        setShowRightPCDViewer(usePcd);
        setShowRight360Viewer(!usePcd);
      }
    };

    void (async () => {
      try {
        const d = await getComparisonDraft(draftQueryId);
        if (cancelled) return;
        const raw = d.state_json;
        if (!isCompareDraftStateV1(raw)) {
          alert(
            'This draft has no saved comparison session (older drafts only store the PDF). Open the PDF from your profile, or start a new comparison.',
          );
          setEditingDraftId(null);
          return;
        }
        const s = raw;
        setLeftNotes(s.leftNotes);
        setRightNotes(s.rightNotes);
        setLeftAdditionalScreenshotNotes({ ...s.leftAnnex });
        setRightAdditionalScreenshotNotes({ ...s.rightAnnex });
        setLeftSafetyIssue(s.leftFlags.safety);
        setLeftQualityIssue(s.leftFlags.quality);
        setLeftDelayed(s.leftFlags.delayed);
        setRightSafetyIssue(s.rightFlags.safety);
        setRightQualityIssue(s.rightFlags.quality);
        setRightDelayed(s.rightFlags.delayed);
        applySide(s.left, 'left');
        applySide(s.right, 'right');
        setIsBottomSectionVisible(true);
        setEditingDraftId(d.id);
        try {
          const drafts = await listComparisonDrafts();
          if (!cancelled) setComparisonDrafts(drafts);
        } catch {
          if (!cancelled) setComparisonDrafts([]);
        }
      } catch (e) {
        if (!cancelled) {
          alert(e instanceof Error ? e.message : 'Could not load comparison draft.');
          setEditingDraftId(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draftQueryId]);

  const publishReports = async () => {
    if (comparisonDrafts.length === 0) {
      alert('No saved comparison drafts to publish.');
      return;
    }

    const consolidatedPdf = await PDFDocument.create();

    for (const draft of comparisonDrafts) {
      if (!draft.pdf_url) continue;
      const existingPdfBytes = await fetch(draft.pdf_url, {
        headers: {
          Authorization: `Bearer ${getAccessToken() ?? ''}`,
        },
      }).then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load draft PDF (${res.status})`);
        return res.arrayBuffer();
      });
      const existingPdf = await PDFDocument.load(existingPdfBytes);
      const copiedPages = await consolidatedPdf.copyPages(existingPdf, existingPdf.getPageIndices());
      copiedPages.forEach((page) => consolidatedPdf.addPage(page));
    }

    const consolidatedPdfBytes = await consolidatedPdf.save();
    const pdfArrayBuffer = new ArrayBuffer(consolidatedPdfBytes.byteLength);
    new Uint8Array(pdfArrayBuffer).set(consolidatedPdfBytes);
    const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

    const primaryFileId = leftSelectedFileId || rightSelectedFileId || comparisonDrafts[0]?.file_id;
    if (!primaryFileId) {
      alert('Cannot publish without a file reference.');
      return;
    }

    await publishComparisonDrafts({
      pdfBlob: blob,
      fileId: primaryFileId,
      draftIds: comparisonDrafts.map((d) => d.id),
      filename: 'Consolidated_Comparison_Report.pdf',
      manualObservations: null,
      flags: [],
    });

    setComparisonDrafts([]);
    setIsModalOpen(false);
    setEditingDraftId(null);
    navigate('/Compare', { replace: true });
    alert('Published consolidated comparison report.');
  };
  
  const handleModalPublish = async (action: 'save' | 'publish') => {
    const session = readSession();
    const ref = fieldObservationReportReference();
    const projectName =
      typeof import.meta.env.VITE_PROJECT_NAME === 'string' && import.meta.env.VITE_PROJECT_NAME.trim()
        ? import.meta.env.VITE_PROJECT_NAME.trim()
        : 'A6 Stern';

    const mkSide = (
      details: { fileName: string; date: string } | null,
      meta: { roomLabel: string } | null,
      notes: string,
      flags: FieldObservationFlags,
    ): ComparisonReportSide | null => {
      if (!details) return null;
      const m = details.fileName.match(/room(\d+)/i);
      const room =
        (meta?.roomLabel && meta.roomLabel.trim()) ||
        (m ? `Room ${m[1]}` : '—');
      return {
        fileName: details.fileName,
        roomOrZone: room,
        captureDate: details.date,
        notes,
        flags,
      };
    };

    const doc = buildComparisonFieldObservationPdf({
      projectName,
      preparedBy: session?.user?.username ?? 'Not signed in',
      reportReference: ref,
      issueDate: new Date(),
      left: mkSide(
        leftImageDetails,
        leftViewerMeta,
        leftNotes,
        {
          scheduleDelayed: leftDelayed,
          qualityConcern: leftQualityIssue,
          safetyConcern: leftSafetyIssue,
        },
      ),
      right: mkSide(
        rightImageDetails,
        rightViewerMeta,
        rightNotes,
        {
          scheduleDelayed: rightDelayed,
          qualityConcern: rightQualityIssue,
          safetyConcern: rightSafetyIssue,
        },
      ),
      annexLeft: leftAdditionalScreenshotNotes,
      annexRight: rightAdditionalScreenshotNotes,
    });

    const pdfBlob = doc.output('blob');

    const primaryFileId = leftSelectedFileId || rightSelectedFileId;
    if (primaryFileId) {
      try {
        const mergedNotes = [leftNotes, rightNotes]
          .map((n) => n.trim())
          .filter(Boolean)
          .join('\n\n');
        const mergedAnnexNotes = [
          leftAdditionalScreenshotNotes.text,
          rightAdditionalScreenshotNotes.text,
        ]
          .map((n) => n.trim())
          .filter(Boolean)
          .join('\n\n');
        const manualObservations = [mergedNotes, mergedAnnexNotes]
          .filter(Boolean)
          .join('\n\n');
        const flags = flagsFromObservationBooleans(
          leftSafetyIssue || rightSafetyIssue,
          leftQualityIssue || rightQualityIssue,
          leftDelayed || rightDelayed,
        );

        const state = buildCompareDraftState();

        if (editingDraftId) {
          const updated = await updateComparisonDraftWithPdf({
            draftId: editingDraftId,
            pdfBlob,
            fileId: primaryFileId,
            filename: `FieldObservation_Compare_${ref}.pdf`,
            manualObservations: manualObservations || '',
            flags,
            state,
          });
          setComparisonDrafts((prev) =>
            prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)),
          );
        } else {
          const draft = await createComparisonDraftWithPdf({
            pdfBlob,
            fileId: primaryFileId,
            filename: `FieldObservation_Compare_${ref}.pdf`,
            manualObservations: manualObservations || null,
            flags,
            state,
          });
          setComparisonDrafts((prev) => [...prev, draft]);
        }
      } catch (e) {
        alert(
          e instanceof Error
            ? e.message
            : 'Could not save the compare report draft on the server.',
        );
        return;
      }
    }

    if (action === 'save') {
      alert(editingDraftId ? 'Comparison draft updated.' : 'Comparison draft saved.');
      if (!editingDraftId) {
        resetBottomSectionInputs();
      }
    } else if (action === 'publish') {
      await publishReports();
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
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white">Compare View</h1>
          {editingDraftId ? (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Editing comparison draft{' '}
              <span className="font-mono">{editingDraftId.slice(0, 8)}…</span> — Save updates this draft.
            </p>
          ) : null}
        </div>
        
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
                <ComparePCDViewer
                  modelUrl={leftHDImageUrl as string}
                  onClose={() => setShowLeftPCDViewer(false)}
                  displayFileName={leftViewerMeta?.displayFileName}
                  roomLabel={leftViewerMeta?.roomLabel}
                  captureDate={leftViewerMeta?.captureDate}
                />
              ) : showLeft360Viewer ? (
                <Compare360Viewer
                  viewerSide="left"
                  onTakeScreenshot={handleLeftScreenshotAssignment}
                  imageUrl={leftHDImageUrl as string}
                  displayFileName={leftViewerMeta?.displayFileName}
                  roomLabel={leftViewerMeta?.roomLabel}
                  captureDate={leftViewerMeta?.captureDate}
                  onClose={handleCloseLeft360Viewer}
                  onScreenshotsUpdate={handleLeftScreenshot}
                  onImageDetailsUpdate={handleLeftImageDetailsUpdate}
                  sharedCameraState={sharedCameraState}
                  onCameraStateChange={handleCameraStateChange}
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
                <ComparePCDViewer
                  modelUrl={rightHDImageUrl as string}
                  onClose={() => setShowRightPCDViewer(false)}
                  displayFileName={rightViewerMeta?.displayFileName}
                  roomLabel={rightViewerMeta?.roomLabel}
                  captureDate={rightViewerMeta?.captureDate}
                />
              ) : showRight360Viewer ? (
                <Compare360Viewer
                  viewerSide="right"
                  onTakeScreenshot={handleRightScreenshotAssignment}
                  imageUrl={rightHDImageUrl as string}
                  displayFileName={rightViewerMeta?.displayFileName}
                  roomLabel={rightViewerMeta?.roomLabel}
                  captureDate={rightViewerMeta?.captureDate}
                  onClose={handleCloseRight360Viewer}
                  onScreenshotsUpdate={handleRightScreenshot}
                  onImageDetailsUpdate={handleRightImageDetailsUpdate}
                  sharedCameraState={sharedCameraState}
                  onCameraStateChange={handleCameraStateChange}
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
              <p className='text-lg mb-5'>Publishing will clear all saved comparison drafts.</p>
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
