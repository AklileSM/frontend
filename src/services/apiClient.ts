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

export async function getExplorerDatesSummary(): Promise<ExplorerDatesSummaryResponse> {
  const response = await fetch(`${API_BASE}/files/explorer/dates`);
  if (response.ok) {
    return response.json() as Promise<ExplorerDatesSummaryResponse>;
  }
  if (response.status === 404) {
    return explorerDatesSummaryFromRooms();
  }
  throw new Error(`Request failed: ${response.status}`);
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

