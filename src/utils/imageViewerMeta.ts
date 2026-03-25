/** Last path segment of a URL or path, without query string (for display / alt text). */
export function stripQueryLastPathSegment(ref: string): string {
  const noQuery = ref.split('?')[0];
  const last = noQuery.split('/').pop() || '';
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

/** Finds YYYY-MM-DD or YYYYMMDD segment in a URL or local path. */
export function extractDateFromImageRef(ref: string): string | null {
  const noQuery = ref.split('?')[0];
  try {
    const decoded = decodeURIComponent(noQuery);
    const iso = decoded.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (iso) return iso[1];
    const parts = decoded.split(/[/\\]/);
    const eight = parts.find((s) => /^\d{8}$/.test(s));
    if (eight) return `${eight.slice(0, 4)}-${eight.slice(4, 6)}-${eight.slice(6, 8)}`;
  } catch {
    /* ignore */
  }
  return null;
}
