import { getAccessToken } from '../auth/authSession';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function parseApiError(response: Response): Promise<string> {
  try {
    const j = (await response.json()) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) {
      return d
        .map((x: { msg?: string }) => x?.msg)
        .filter(Boolean)
        .join(', ');
    }
  } catch {
    /* ignore */
  }
  return `Request failed: ${response.status}`;
}

async function apiFetch(path: string, init?: RequestInit, withAuth = true): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (withAuth) {
    const t = getAccessToken();
    if (t) headers.set('Authorization', `Bearer ${t}`);
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export interface ApiMediaFile {
  id: string;
  src: string;
  type: 'image' | 'video' | 'pointcloud' | 'pdf';
  file_name: string;
  full_src?: string | null;
  capture_date: string;
  /** Present when upload recorded uploader; used for delete UI vs viewer role. */
  uploaded_by_user_id?: string | null;
  /** Point clouds only: pending | processing | ready | failed */
  conversion_status?: string | null;
  /** Point clouds only: error detail when conversion_status === 'failed' */
  conversion_error?: string | null;
}

export interface ApiRoomMediaGroup {
  images: ApiMediaFile[];
  videos: ApiMediaFile[];
  pointclouds: ApiMediaFile[];
  pdfs: ApiMediaFile[];
}

export interface ExplorerByDateResponse {
  date: string;
  rooms: Record<string, ApiRoomMediaGroup>;
}

export interface ExplorerByRoomResponse {
  room: string;
  room_name: string;
  dates: Record<string, ApiRoomMediaGroup>;
}

export interface DateMediaCounts {
  images: number;
  videos: number;
  pointclouds: number;
  pdfs: number;
}

export interface ExplorerDatesSummaryResponse {
  dates: Record<string, DateMediaCounts>;
}

export interface ApiRoom {
  id: string;
  name: string;
  slug: string;
  project_id: string;
}

export interface ApiProject {
  id: string;
  name: string;
  slug: string;
}

function addRoomGroupsToDateCounts(
  acc: Record<string, DateMediaCounts>,
  dates: Record<string, ApiRoomMediaGroup>,
): void {
  for (const [day, group] of Object.entries(dates)) {
    const cur = acc[day] ?? { images: 0, videos: 0, pointclouds: 0, pdfs: 0 };
    cur.images += group.images?.length ?? 0;
    cur.videos += group.videos?.length ?? 0;
    cur.pointclouds += group.pointclouds?.length ?? 0;
    cur.pdfs += group.pdfs?.length ?? 0;
    acc[day] = cur;
  }
}

async function explorerDatesSummaryFromRooms(): Promise<ExplorerDatesSummaryResponse> {
  const rooms = await getJson<ApiRoom[]>('/rooms');
  const byDate: Record<string, DateMediaCounts> = {};
  await Promise.all(
    rooms.map((room) =>
      getExplorerByRoom(room.slug).then((res) => {
        addRoomGroupsToDateCounts(byDate, res.dates ?? {});
      }),
    ),
  );
  return { dates: byDate };
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init, true);
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json() as Promise<T>;
}

export function listProjects(): Promise<ApiProject[]> {
  return getJson<ApiProject[]>('/projects/');
}

export function getExplorerByDate(date: string): Promise<ExplorerByDateResponse> {
  return getJson<ExplorerByDateResponse>(`/files/explorer/date/${date}`);
}

export function getExplorerByRoom(roomSlug: string): Promise<ExplorerByRoomResponse> {
  return getJson<ExplorerByRoomResponse>(`/files/explorer/room/${roomSlug}`);
}

export async function getExplorerDatesSummary(): Promise<ExplorerDatesSummaryResponse> {
  const response = await apiFetch('/files/explorer/dates', undefined, true);
  if (response.ok) {
    return response.json() as Promise<ExplorerDatesSummaryResponse>;
  }
  if (response.status === 404) {
    return explorerDatesSummaryFromRooms();
  }
  throw new Error(await parseApiError(response));
}

export async function analyzeImage(imageUrl: string, fileId?: string): Promise<string> {
  const response = await getJson<{ description: string }>('/ai/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      file_id: fileId ?? null,
    }),
  });
  return response.description;
}

export type ApiTokenResponse = {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    role: string;
  };
};

export async function apiLogin(username: string, password: string): Promise<ApiTokenResponse> {
  const response = await apiFetch(
    '/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    },
    false,
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json() as Promise<ApiTokenResponse>;
}

export async function apiRegister(
  username: string,
  password: string,
  email?: string,
): Promise<ApiTokenResponse> {
  const response = await apiFetch(
    '/auth/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        email: email?.trim() || null,
      }),
    },
    false,
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json() as Promise<ApiTokenResponse>;
}

export async function apiFetchCurrentUser(): Promise<ApiTokenResponse['user']> {
  const response = await apiFetch('/auth/me', { method: 'GET' }, true);
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json() as Promise<ApiTokenResponse['user']>;
}

export async function listRooms(): Promise<ApiRoom[]> {
  try {
    return await getJson<ApiRoom[]>('/rooms/');
  } catch {
    return getJson<ApiRoom[]>('/rooms');
  }
}

export type UploadSingleResponse = {
  id: string;
  room: string;
  media_type: string;
  file_name: string;
  capture_date: string;
};

const POINTCLOUD_CHUNK_SIZE = 64 * 1024 * 1024;
const POINTCLOUD_UPLOAD_CONCURRENCY = 5;
const POINTCLOUD_CHUNK_MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function uploadPointcloudInChunks(params: {
  file: File;
  roomSlug: string;
  captureDate: string;
  token: string;
  onProgress?: (percent: number) => void;
}): Promise<UploadSingleResponse> {
  const initForm = new FormData();
  initForm.append('room_slug', params.roomSlug);
  initForm.append('capture_date', params.captureDate);
  initForm.append('filename', params.file.name);
  initForm.append('file_size', String(params.file.size));
  initForm.append('content_type', params.file.type || 'application/octet-stream');

  const initRes = await fetch(`${API_BASE}/upload/pointcloud/init`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.token}` },
    body: initForm,
  });
  if (!initRes.ok) {
    throw new Error(await parseApiError(initRes));
  }
  const initData = (await initRes.json()) as { upload_id: string; chunk_size?: number };
  const uploadId = initData.upload_id;
  const chunkSize = initData.chunk_size && initData.chunk_size > 0 ? initData.chunk_size : POINTCLOUD_CHUNK_SIZE;

  const totalChunks = Math.ceil(params.file.size / chunkSize);
  let uploadedBytes = 0;
  params.onProgress?.(0);
  let nextChunkIndex = 0;
  const uploadOneChunkWithRetry = async (chunkIndex: number): Promise<void> => {
    let attempt = 0;
    while (attempt <= POINTCLOUD_CHUNK_MAX_RETRIES) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, params.file.size);
      const blob = params.file.slice(start, end);
      const chunkForm = new FormData();
      chunkForm.append('upload_id', uploadId);
      chunkForm.append('chunk_index', String(chunkIndex));
      chunkForm.append('chunk', blob, params.file.name);

      const chunkRes = await fetch(`${API_BASE}/upload/pointcloud/chunk`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${params.token}` },
        body: chunkForm,
      });
      if (chunkRes.ok) {
        uploadedBytes += end - start;
        const percent = Math.min(99, Math.round((uploadedBytes / params.file.size) * 100));
        params.onProgress?.(percent);
        return;
      }
      const err = await parseApiError(chunkRes);
      if (attempt >= POINTCLOUD_CHUNK_MAX_RETRIES) {
        throw new Error(`Chunk ${chunkIndex + 1}/${totalChunks} failed: ${err}`);
      }
      await sleep(500 * 2 ** attempt);
      attempt += 1;
    }
  };

  const workers = Array.from(
    { length: Math.min(POINTCLOUD_UPLOAD_CONCURRENCY, totalChunks) },
    async () => {
      while (true) {
        const chunkIndex = nextChunkIndex;
        nextChunkIndex += 1;
        if (chunkIndex >= totalChunks) {
          return;
        }
        await uploadOneChunkWithRetry(chunkIndex);
      }
    },
  );
  for (const worker of workers) {
    await worker;
  }

  const doneForm = new FormData();
  doneForm.append('upload_id', uploadId);
  doneForm.append('total_chunks', String(totalChunks));
  const doneRes = await fetch(`${API_BASE}/upload/pointcloud/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.token}` },
    body: doneForm,
  });
  if (!doneRes.ok) {
    throw new Error(await parseApiError(doneRes));
  }
  params.onProgress?.(100);
  return doneRes.json() as Promise<UploadSingleResponse>;
}

function uploadViaXhr(params: {
  url: string;
  method: string;
  file: File;
  contentType: string;
  onProgress?: (percent: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(params.method, params.url, true);
    xhr.setRequestHeader('Content-Type', params.contentType);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
      params.onProgress?.(percent);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        params.onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Direct MinIO upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Direct MinIO upload failed (network error)'));
    xhr.ontimeout = () => reject(new Error('Direct MinIO upload failed (timeout)'));
    xhr.timeout = 120000;
    xhr.send(params.file);
  });
}

async function uploadPointcloudDirect(params: {
  file: File;
  roomSlug: string;
  captureDate: string;
  token: string;
  onProgress?: (percent: number) => void;
}): Promise<UploadSingleResponse> {
  const initForm = new FormData();
  initForm.append('room_slug', params.roomSlug);
  initForm.append('capture_date', params.captureDate);
  initForm.append('filename', params.file.name);
  initForm.append('file_size', String(params.file.size));
  initForm.append('content_type', params.file.type || 'application/octet-stream');

  const initRes = await fetch(`${API_BASE}/upload/pointcloud/direct-init`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.token}` },
    body: initForm,
  });
  if (!initRes.ok) {
    throw new Error(await parseApiError(initRes));
  }
  const initData = (await initRes.json()) as { upload_id: string; upload_url: string; method?: string };

  await uploadViaXhr({
    url: initData.upload_url,
    method: initData.method || 'PUT',
    file: params.file,
    contentType: params.file.type || 'application/octet-stream',
    onProgress: params.onProgress,
  });

  const doneForm = new FormData();
  doneForm.append('upload_id', initData.upload_id);
  const doneRes = await fetch(`${API_BASE}/upload/pointcloud/direct-complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.token}` },
    body: doneForm,
  });
  if (!doneRes.ok) {
    throw new Error(await parseApiError(doneRes));
  }
  return doneRes.json() as Promise<UploadSingleResponse>;
}

export async function uploadSingleFile(params: {
  file: File;
  roomSlug: string;
  mediaType: 'image' | 'video' | 'pointcloud' | 'pdf';
  captureDate: string;
  onProgress?: (percent: number) => void;
}): Promise<UploadSingleResponse> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('You must be signed in to upload.');
  }

  if (params.mediaType === 'pointcloud') {
    try {
      return await uploadPointcloudDirect({
        file: params.file,
        roomSlug: params.roomSlug,
        captureDate: params.captureDate,
        token,
        onProgress: params.onProgress,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[upload] Direct MinIO pointcloud upload failed, falling back to chunked upload: ${message}`,
      );
      return uploadPointcloudInChunks({
        file: params.file,
        roomSlug: params.roomSlug,
        captureDate: params.captureDate,
        token,
        onProgress: params.onProgress,
      });
    }
  }

  const form = new FormData();
  form.append('file', params.file);
  form.append('room_slug', params.roomSlug);
  form.append('media_type', params.mediaType);
  form.append('capture_date', params.captureDate);

  const response = await fetch(`${API_BASE}/upload/single`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json() as Promise<UploadSingleResponse>;
}

export async function deleteFileAsset(fileId: string): Promise<void> {
  const response = await apiFetch(`/files/${fileId}`, { method: 'DELETE' }, true);
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

export interface ApiReport {
  id: string;
  file_id: string;
  ai_description: string | null;
  manual_observations: string | null;
  flags: string[];
  screenshots: string[];
  created_by: string | null;
  /** Presigned MinIO URL; expires after backend `presigned_url_expiry_seconds`. */
  pdf_url: string | null;
  created_at: string;
}

export function listReports(): Promise<ApiReport[]> {
  return getJson<ApiReport[]>('/reports/');
}

export async function deleteReport(reportId: string): Promise<void> {
  const response = await apiFetch(`/reports/${encodeURIComponent(reportId)}`, { method: 'DELETE' }, true);
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

export interface ApiMyUpload {
  id: string;
  room_slug: string;
  room_name: string;
  media_type: string;
  file_name: string;
  capture_date: string;
  created_at: string;
  src: string;
  full_src: string | null;
  /** Point clouds only: pending | processing | ready | failed */
  conversion_status?: string | null;
}

/** Admin/manager only: file assets recorded as uploaded by this user. */
export function listMyUploads(): Promise<ApiMyUpload[]> {
  return getJson<ApiMyUpload[]>('/files/my-uploads');
}

export interface ApiConversionStatus {
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'unknown';
  error?: string | null;
}

export function getConversionStatus(fileId: string): Promise<ApiConversionStatus> {
  return getJson<ApiConversionStatus>(`/files/${fileId}/conversion-status`);
}

/** Upload a published field-observation PDF: stored in MinIO and recorded in DB for the signed-in user. */
export async function createReportWithPdf(params: {
  pdfBlob: Blob;
  fileId: string;
  filename?: string;
  aiDescription?: string | null;
  manualObservations?: string | null;
  flags?: string[];
}): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Sign in to store reports on the server.');
  }

  const form = new FormData();
  form.append('file', params.pdfBlob, params.filename ?? 'report.pdf');
  form.append('file_id', params.fileId);
  if (params.aiDescription != null && params.aiDescription !== '') {
    form.append('ai_description', params.aiDescription);
  }
  if (params.manualObservations != null && params.manualObservations !== '') {
    form.append('manual_observations', params.manualObservations);
  }
  form.append('flags_json', JSON.stringify(params.flags ?? []));

  const response = await fetch(`${API_BASE}/reports/with-pdf`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

