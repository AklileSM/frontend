import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { getAccessToken } from '../auth/authSession';

import './pdfViewer.css';

export type PdfViewerLocationState = {
  /** Presigned or public URL to the PDF */
  pdfUrl: string;
  /** Shown in the header */
  title?: string;
};

/** Empty state — must not call defaultLayoutPlugin() (it uses hooks). */
const PdfViewerEmpty: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-black dark:text-white">No PDF to display</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Open a report from your profile or use the app navigation that links to this viewer.
      </p>
      <button
        type="button"
        onClick={() => navigate('/profile', { replace: true })}
        className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow hover:opacity-90"
      >
        Go to profile
      </button>
    </div>
  );
};

/**
 * defaultLayoutPlugin() must run at the top level of a component — not inside useMemo or conditionals
 * (it calls useMemo and other hooks internally). See React error #300 if misused.
 */
const PdfViewerWithDocument: React.FC<{ pdfUrl: string; title: string }> = ({ pdfUrl, title }) => {
  const navigate = useNavigate();
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const token = getAccessToken();
  const httpHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  return (
    <div className="flex w-full flex-col bg-white dark:bg-boxdark">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke px-4 py-4 dark:border-strokedark">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white">PDF viewer</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-800 dark:text-gray-200">{title}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-strokedark dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-meta-4"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => navigate('/A6_stern')}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:opacity-90"
          >
            Projects
          </button>
        </div>
      </div>

      <div className="pdf-viewer-shell h-[calc(100vh-11rem)] w-full min-h-[480px] border-t border-stroke dark:border-strokedark">
        <Worker workerUrl={workerUrl}>
          <Viewer fileUrl={pdfUrl} plugins={[defaultLayoutPluginInstance]} httpHeaders={httpHeaders} />
        </Worker>
      </div>
    </div>
  );
};

/**
 * Full-featured in-app PDF reader (zoom, search, thumbnails, download, print, rotate, full screen).
 * Open with: `navigate('/pdfViewer', { state: { pdfUrl, title } })`.
 */
const PdfViewerPage: React.FC = () => {
  const location = useLocation();
  const state = (location.state || {}) as Partial<PdfViewerLocationState>;

  const pdfUrl = typeof state.pdfUrl === 'string' && state.pdfUrl.trim() ? state.pdfUrl.trim() : '';
  const title = state.title?.trim() || 'PDF document';

  if (!pdfUrl) {
    return <PdfViewerEmpty />;
  }

  return <PdfViewerWithDocument pdfUrl={pdfUrl} title={title} />;
};

export default PdfViewerPage;
