/** Persisted state for field-observation viewer drafts (Static / Interactive / PCD — not Compare). */

export type ViewerFieldKind =
  | 'static_360'
  | 'static_room'
  | 'interactive_360'
  | 'interactive_room'
  | 'static_pcd';

export type ViewerFieldDraftStateV1 = {
  version: 1;
  viewerKind: ViewerFieldKind;
  imageUrl?: string;
  /** Point cloud asset URL */
  modelUrl?: string;
  fileId?: string;
  room?: string;
  displayFileName?: string;
  roomLabel?: string;
  captureDate?: string;
  /** Static viewers */
  includeAutoLabeling?: boolean;
  includeAdditionalComments?: boolean;
  autoLabelingText?: string;
  additionalCommentsText?: string;
  displayedText?: string;
  /** Interactive / PCD */
  notes?: string;
  includeNotes?: boolean;
  includeScreenshot?: boolean;
  safetyIssue?: boolean;
  qualityIssue?: boolean;
  delayed?: boolean;
};

export function isViewerFieldDraftStateV1(v: unknown): v is ViewerFieldDraftStateV1 {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return o.version === 1 && typeof o.viewerKind === 'string';
}

/** Short text for the drafts table / API manual_observations preview. */
export function mergeViewerFieldManualObservations(state: ViewerFieldDraftStateV1): string | null {
  const parts: string[] = [];
  if (state.viewerKind === 'static_360' || state.viewerKind === 'static_room') {
    if (state.autoLabelingText?.trim()) parts.push(`Visual/AI: ${state.autoLabelingText.trim()}`);
    if (state.additionalCommentsText?.trim()) parts.push(state.additionalCommentsText.trim());
  } else if (state.notes?.trim()) {
    parts.push(state.notes.trim());
  }
  if (parts.length === 0) return null;
  return parts.join('\n\n');
}
