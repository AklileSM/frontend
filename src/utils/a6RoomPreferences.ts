const STORAGE_KEY = 'a6.lastRoomSlug';

export function normalizeRoomSlug(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return raw.trim().toLowerCase().replace(/\s+/g, '');
}

/** Last room used for A6 (Room explorer); default Room 1. */
export function readStoredA6Room(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    const n = normalizeRoomSlug(v);
    if (n) return n;
  } catch {
    /* ignore */
  }
  return 'room1';
}

export function writeStoredA6Room(slug: string): void {
  const n = normalizeRoomSlug(slug);
  if (!n) return;
  try {
    localStorage.setItem(STORAGE_KEY, n);
  } catch {
    /* ignore */
  }
}
