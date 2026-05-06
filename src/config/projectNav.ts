import type { ApiProject } from '../services/apiClient';

export type NavProject = {
  slug: string;
  name: string;
  path: string;
};

export const FALLBACK_PROJECT_NAV: NavProject[] = [
  { slug: 'a6-stern', name: 'A6 Stern', path: '/projects/a6-stern' },
];

export function mergeProjectNav(api: ApiProject[]): NavProject[] {
  if (api.length === 0) return FALLBACK_PROJECT_NAV;
  return api.map((p) => ({
    slug: p.slug,
    name: p.name,
    path: `/projects/${p.slug}`,
  }));
}

/** Returns the `/projects/:slug` path for the current pathname, or null if not in a project context. */
export function projectPathForPathname(pathname: string): string | null {
  const m = pathname.match(/^\/projects\/([^/]+)/);
  if (m) return `/projects/${m[1]}`;
  if (pathname === '/A6_Stern' || pathname.startsWith('/A6_Stern/') ||
      pathname === '/RoomExplorer' || pathname.startsWith('/RoomExplorer/'))
    return '/projects/a6-stern';
  if (pathname === '/projectx' || pathname.startsWith('/projectx/')) return '/projects/projectx';
  if (pathname === '/projecty' || pathname.startsWith('/projecty/')) return '/projects/projecty';
  return null;
}
