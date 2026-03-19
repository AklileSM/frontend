const API_BASE = import.meta.env.VITE_API_URL || "/api";

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

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getExplorerByDate(date: string): Promise<ExplorerByDateResponse> {
  return getJson<ExplorerByDateResponse>(`/files/explorer/date/${date}`);
}

export function getExplorerByRoom(roomSlug: string): Promise<ExplorerByRoomResponse> {
  return getJson<ExplorerByRoomResponse>(`/files/explorer/room/${roomSlug}`);
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

