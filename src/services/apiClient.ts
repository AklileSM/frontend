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
  type: 'image' | 'video' | 'pointcloud';
  file_name: string;
  full_src?: string | null;
  capture_date: string;
}

export interface ApiRoomMediaGroup {
  images: ApiMediaFile[];
  videos: ApiMediaFile[];
  pointclouds: ApiMediaFile[];
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

function addRoomGroupsToDateCounts(
  acc: Record<string, DateMediaCounts>,
  dates: Record<string, ApiRoomMediaGroup>,
): void {
  for (const [day, group] of Object.entries(dates)) {
    const cur = acc[day] ?? { images: 0, videos: 0, pointclouds: 0 };
    cur.images += group.images?.length ?? 0;
    cur.videos += group.videos?.length ?? 0;
    cur.pointclouds += group.pointclouds?.length ?? 0;
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

export function listRooms(): Promise<ApiRoom[]> {
  return getJson<ApiRoom[]>('/rooms');
}

export type UploadSingleResponse = {
  id: string;
  room: string;
  media_type: string;
  file_name: string;
  capture_date: string;
};

export async function uploadSingleFile(params: {
  file: File;
  roomSlug: string;
  mediaType: 'image' | 'video' | 'pointcloud';
  captureDate: string;
}): Promise<UploadSingleResponse> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('You must be signed in to upload.');
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

