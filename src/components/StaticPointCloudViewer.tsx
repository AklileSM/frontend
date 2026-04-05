import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { extractDateFromImageRef, stripQueryLastPathSegment } from '../utils/imageViewerMeta';
import {
  buildFieldObservationPdf,
  fieldObservationReportReference,
} from '../utils/engineeringReportPdf';
import { readSession } from '../auth/authSession';
import { createReportWithPdf } from '../services/apiClient';
import { flagsFromObservationBooleans } from '../utils/observationReportFlags';

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const [safetyIssue, setSafetyIssue] = useState(false);
  const [qualityIssue, setQualityIssue] = useState(false);
  const [delayed, setDelayed] = useState(false);

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

  const openPublishModal = () => setIsModalOpen(true);
  const closePublishModal = () => {
    setIsModalOpen(false);
    setIncludeNotes(false);
    setNotes('');
  };

  const handleModalPublish = async () => {
    const session = readSession();
    const ref = fieldObservationReportReference();
    const projectName =
      typeof import.meta.env.VITE_PROJECT_NAME === 'string' && import.meta.env.VITE_PROJECT_NAME.trim()
        ? import.meta.env.VITE_PROJECT_NAME.trim()
        : 'A6 Stern';
    const doc = buildFieldObservationPdf({
      documentTitle: 'A6_Stern Project Observation Report',
      assessmentMethodSubtitle: 'Three-dimensional point cloud visual record',
      projectName,
      organizationLine: 'SMART Construction Research Group',
      preparedBy: session?.user?.username ?? 'Not signed in',
      reportReference: ref,
      recordFileName: viewingFileName,
      locationOrRoom: roomNumber,
      imageCaptureDate: formattedDate,
      reportIssueDate: new Date(),
      sections: {
        includeVisualAssessment: false,
        visualAssessmentBody: '',
        includeEngineerComments: includeNotes,
        engineerCommentsHeading: "Author's comments and viewer notes",
        engineerCommentsBody: notes || '',
      },
      flags: {
        scheduleDelayed: delayed,
        qualityConcern: qualityIssue,
        safetyConcern: safetyIssue,
      },
    });
    const pdfBlob = doc.output('blob');
    if (state.fileId?.trim()) {
      try {
        await createReportWithPdf({
          pdfBlob,
          fileId: state.fileId.trim(),
          filename: `FieldObservation_PCD_${ref}.pdf`,
          aiDescription: null,
          manualObservations: includeNotes ? (notes || null) : null,
          flags: flagsFromObservationBooleans(safetyIssue, qualityIssue, delayed),
        });
      } catch (e) {
        alert(
          e instanceof Error
            ? `${e.message} The PDF was still downloaded.`
            : 'Could not save the report on the server. The PDF was still downloaded.',
        );
      }
    }
    doc.save(`FieldObservation_PCD_${ref}.pdf`);
    closePublishModal();
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
          <h1 className="text-xl font-bold text-black dark:text-white">Point Cloud Viewer</h1>
          <p className="mt-1 text-sm text-black dark:text-gray-400">
            Viewing: <span className="font-semibold">{viewingFileName || 'Point cloud'}</span>
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {roomNumber}, (Date: {formattedDate})
          </p>
        </div>
        <div className="flex space-x-4">
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
        className="relative flex w-full h-[70vh] mt-4 bg-gray-700 rounded-lg overflow-hidden shadow-lg"
      >
        <div className="relative min-h-full min-w-0 flex-1">
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

          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute bottom-4 right-4 z-10 bg-primary text-white p-3 rounded-full shadow-lg transition-transform duration-300 hover:scale-110"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <svg fill="#ffffff" height="24px" width="24px" viewBox="0 0 385.331 385.331" xmlns="http://www.w3.org/2000/svg">
                <path d="M264.943,156.665h108.273c6.833,0,11.934-5.39,11.934-12.211c0-6.833-5.101-11.85-11.934-11.838h-96.242V36.181
                        c0-6.833-5.197-12.03-12.03-12.03s-12.03,5.197-12.03,12.03v108.273c0,0.036,0.012,0.06,0.012,0.084
                        c0,0.036-0.012,0.06-0.012,0.096C252.913,151.347,258.23,156.677,264.943,156.665z"></path>
                <path d="M120.291,24.247c-6.821,0-11.838,5.113-11.838,11.934v96.242H12.03c-6.833,0-12.03,5.197-12.03,12.03
                        c0,6.833,5.197,12.03,12.03,12.03h108.273c0.036,0,0.06-0.012,0.084-0.012c0.036,0,0.06,0.012,0.096,0.012
                        c6.713,0,12.03-5.317,12.03-12.03V36.181C132.514,29.36,127.124,24.259,120.291,24.247z"></path>
                <path d="M120.387,228.666H12.115c-6.833,0.012-11.934,5.39-11.934,12.223c0,6.833,5.101,11.85,11.934,11.838h96.242v96.423
                        c0,6.833,5.197,12.03,12.03,12.03c6.833,0,12.03-5.197,12.03-12.03V240.877c0-0.036-0.012-0.06-0.012-0.084
                        c0-0.036,0.012-0.06,0.012-0.096C132.418,233.983,127.1,228.666,120.387,228.666z"></path>
                <path d="M373.3,228.666H265.028c-0.036,0-0.06,0.012-0.084,0.012c-0.036,0-0.06-0.012-0.096-0.012
                        c-6.713,0-12.03,5.317-12.03,12.03v108.273c0,6.833,5.39,11.922,12.223,11.934c6.821,0.012,11.838-5.101,11.838-11.922v-96.242
                        H373.3c6.833,0,12.03-5.197,12.03-12.03S380.134,228.678,373.3,228.666z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M4 4h5V2H2v7h2V4zm15 0h-5V2h7v7h-2V4zM4 20h5v2H2v-7h2v5zm15-5h2v7h-7v-2h5v-5z" />
              </svg>
            )}
          </button>
        </div>
      </div>

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

          <div className="flex justify-between items-center mt-4">
            <div className="flex space-x-6 -mt-10 ml-1.5">
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

            <div className="flex gap-3">
              <button
                type="button"
                className="bg-primary text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-transform duration-300 hover:bg-opacity-60 -mt-1.5"
              >
                Save
              </button>
              <button
                type="button"
                onClick={openPublishModal}
                className="bg-primary text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-transform duration-300 hover:bg-opacity-60 mr-1.5 -mt-1.5"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-200">Publish Report</h2>

            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={() => setIncludeNotes(!includeNotes)}
                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                />
                <span className="text-gray-700 dark:text-gray-300">Include Notes</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={closePublishModal}
                className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
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

export default StaticPointCloudViewer;
