import type { ApiProject } from '../services/apiClient';

export type NavProject = {
  slug: string;
  name: string;
  path: string;
};

/** Routes and labels for sidebar + header; names can be overridden from GET /projects. */
export const FALLBACK_PROJECT_NAV: NavProject[] = [
  { slug: 'a6-stern', name: 'A6 Stern', path: '/A6_Stern' },
  { slug: 'projectx', name: 'Project X', path: '/projectx' },
  { slug: 'projecty', name: 'Project Y', path: '/projecty' },
];

export function mergeProjectNav(api: ApiProject[]): NavProject[] {
  const nameBySlug = new Map(api.map((p) => [p.slug, p.name]));
  return FALLBACK_PROJECT_NAV.map((p) => ({
    ...p,
    name: nameBySlug.get(p.slug) ?? p.name,
  }));
}

/** Which project route matches this pathname (for header dropdown value). */
export function projectPathForPathname(pathname: string): string {
  if (pathname === '/projectx' || pathname.startsWith('/projectx/')) return '/projectx';
  if (pathname === '/projecty' || pathname.startsWith('/projecty/')) return '/projecty';
  if (pathname === '/A6_Stern' || pathname.startsWith('/A6_Stern/')) return '/A6_Stern';
  return '/A6_Stern';
}
