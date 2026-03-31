import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FALLBACK_PROJECT_NAV,
  mergeProjectNav,
  type NavProject,
} from '../../config/projectNav';
import { listProjects } from '../../services/apiClient';
import SidebarLinkGroup from './SidebarLinkGroup';
import Calendar from '../../pages/Calendar';
import FileTree from '../FileTree';

/** Sidebar order: X, Y, then A6 (file tree). */
const SIDEBAR_PROJECT_SLUGS = ['projectx', 'projecty', 'a6-stern'] as const;

function ProjectFolderIcon() {
  const cn = 'h-4 w-4 shrink-0';
  return (
    <svg
      className={cn}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M3 4a1 1 0 0 1 1-1h6.236a1 1 0 0 1 .707.293l1.414 1.414H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z" />
    </svg>
  );
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/** Matches main content `margin-left` transition in DefaultLayout. */
const WIDTH_TRANSITION =
  'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

/** Logo uses negative margin to tuck under the toggle; avoid `overflow-hidden` on ancestors so it stays visible (original layout). */
const CONTENT_TRANSITION =
  'transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none motion-reduce:transition-none';

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { pathname } = useLocation();
  const [heavyContentMounted, setHeavyContentMounted] = useState(false);
  const [navProjects, setNavProjects] = useState<NavProject[]>(FALLBACK_PROJECT_NAV);
  const [openBySlug, setOpenBySlug] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (sidebarOpen) setHeavyContentMounted(true);
  }, [sidebarOpen]);

  useEffect(() => {
    listProjects()
      .then((api) => setNavProjects(mergeProjectNav(api)))
      .catch(() => setNavProjects(FALLBACK_PROJECT_NAV));
  }, []);

  useEffect(() => {
    let slug: string | undefined;
    if (pathname === '/RoomExplorer' || pathname.startsWith('/RoomExplorer/')) {
      slug = 'a6-stern';
    } else if (pathname === '/projectx' || pathname === '/projecty' || pathname === '/A6_Stern') {
      slug = FALLBACK_PROJECT_NAV.find((p) => p.path === pathname)?.slug;
    }
    if (!slug) return;
    setOpenBySlug(() => {
      const next: Record<string, boolean> = {};
      for (const p of FALLBACK_PROJECT_NAV) {
        next[p.slug] = p.slug === slug;
      }
      return next;
    });
  }, [pathname]);

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col overflow-x-hidden bg-gray-800 text-white shadow-lg shadow-black/15 ${WIDTH_TRANSITION} ${
        sidebarOpen ? 'w-64' : 'w-16'
      }`}
      aria-label="Main navigation"
    >
      {/* Rail: toggle stays visible in the narrow column */}
      <div className="flex shrink-0 justify-end px-2 pt-5 pb-2">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg bg-primary p-2 text-white transition-transform duration-200 ease-out hover:opacity-95 active:scale-95 motion-reduce:transition-none"
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Logo: same position as before (below toggle, pulled up with -mt-14). Fades with the panel, not clipped. */}
      <div
        className={`ml-4 hidden shrink-0 transition-[max-height,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:block ${
          sidebarOpen
            ? 'max-h-40 translate-x-0 overflow-visible opacity-100 delay-75 motion-reduce:delay-0'
            : 'max-h-0 -translate-x-2 overflow-hidden opacity-0 pointer-events-none'
        }`}
        aria-hidden={!sidebarOpen}
      >
        <img
          className="w-30 -mt-14 ml-1"
          src="Logo/LogoforDark.png"
          alt="Logo for light mode"
        />
      </div>

      {/* Nav + tree + calendar: clipped horizontally when rail is narrow; smooth fade/slide with width */}
      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden ${CONTENT_TRANSITION} ${
          sidebarOpen
            ? 'translate-x-0 opacity-100 delay-100 motion-reduce:delay-0'
            : 'pointer-events-none -translate-x-2 opacity-0'
        }`}
        style={{ pointerEvents: sidebarOpen ? 'auto' : 'none' }}
        aria-hidden={!sidebarOpen}
      >
        <div className="flex min-h-0 min-w-[16rem] flex-1 flex-col">
          <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <ul className="mb-6 flex flex-col gap-1.5">
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/' ||
                  pathname.includes('dashboard') ||
                  pathname === '/A6_Stern' ||
                  pathname === '/projectx' ||
                  pathname === '/projecty' ||
                  pathname === '/RoomExplorer' ||
                  pathname.startsWith('/RoomExplorer/')
                }
                expanded={sidebarOpen}
              >
                {(handleClick, open) => (
                  <React.Fragment>
                    <NavLink
                      to="#"
                      className={`group relative mt-5 flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                        (pathname === '/' || pathname.includes('dashboard')) &&
                        'bg-graydark dark:bg-meta-4'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleClick();
                      }}
                    >
                      <svg
                        className="fill-current"
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M6.10322 0.956299H2.53135C1.5751 0.956299 0.787598 1.7438 0.787598 2.70005V6.27192C0.787598 7.22817 1.5751 8.01567 2.53135 8.01567H6.10322C7.05947 8.01567 7.84697 7.22817 7.84697 6.27192V2.72817C7.8751 1.7438 7.0876 0.956299 6.10322 0.956299ZM6.60947 6.30005C6.60947 6.5813 6.38447 6.8063 6.10322 6.8063H2.53135C2.2501 6.8063 2.0251 6.5813 2.0251 6.30005V2.72817C2.0251 2.44692 2.2501 2.22192 2.53135 2.22192H6.10322C6.38447 2.22192 6.60947 2.44692 6.60947 2.72817V6.30005Z"
                          fill=""
                        />
                        <path
                          d="M15.4689 0.956299H11.8971C10.9408 0.956299 10.1533 1.7438 10.1533 2.70005V6.27192C10.1533 7.22817 10.9408 8.01567 11.8971 8.01567H15.4689C16.4252 8.01567 17.2127 7.22817 17.2127 6.27192V2.72817C17.2127 1.7438 16.4252 0.956299 15.4689 0.956299ZM15.9752 6.30005C15.9752 6.5813 15.7502 6.8063 15.4689 6.8063H11.8971C11.6158 6.8063 11.3908 6.5813 11.3908 6.30005V2.72817C11.3908 2.44692 11.6158 2.22192 11.8971 2.22192H15.4689C15.7502 2.22192 15.9752 2.44692 15.9752 2.72817V6.30005Z"
                          fill=""
                        />
                        <path
                          d="M6.10322 9.92822H2.53135C1.5751 9.92822 0.787598 10.7157 0.787598 11.672V15.2438C0.787598 16.2001 1.5751 16.9876 2.53135 16.9876H6.10322C7.05947 16.9876 7.84697 16.2001 7.84697 15.2438V11.7001C7.8751 10.7157 7.0876 9.92822 6.10322 9.92822ZM6.60947 15.272C6.60947 15.5532 6.38447 15.7782 6.10322 15.7782H2.53135C2.2501 15.7782 2.0251 15.5532 2.0251 15.272V11.7001C2.0251 11.4188 2.2501 11.1938 2.53135 11.1938H6.10322C6.38447 11.1938 6.60947 11.4188 6.60947 11.7001V15.272Z"
                          fill=""
                        />
                        <path
                          d="M15.4689 9.92822H11.8971C10.9408 9.92822 10.1533 10.7157 10.1533 11.672V15.2438C10.1533 16.2001 10.9408 16.9876 11.8971 16.9876H15.4689C16.4252 16.9876 17.2127 16.2001 17.2127 15.2438V11.7001C17.2127 10.7157 16.4252 9.92822 15.4689 9.92822ZM15.9752 15.272C15.9752 15.5532 15.7502 15.7782 15.4689 15.7782H11.8971C11.6158 15.7782 11.3908 15.5532 11.3908 15.272V11.7001C11.3908 11.4188 11.6158 11.1938 11.8971 11.1938H15.4689C15.7502 11.1938 15.9752 11.4188 15.9752 11.7001V15.272Z"
                          fill=""
                        />
                      </svg>
                      <span>Projects</span>
                      <svg
                        className={`absolute right-4 top-1/2 -translate-y-1/2 fill-current transition-transform duration-200 ease-out ${
                          open ? 'rotate-180' : ''
                        }`}
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                          fill=""
                        />
                      </svg>
                    </NavLink>

                    {open && (
                      <div className="transform overflow-hidden">
                        <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {SIDEBAR_PROJECT_SLUGS.map((slug) => {
                            const meta = navProjects.find((p) => p.slug === slug);
                            if (!meta) return null;
                            const isActive =
                              pathname === meta.path ||
                              pathname.startsWith(`${meta.path}/`) ||
                              (slug === 'a6-stern' &&
                                (pathname === '/RoomExplorer' ||
                                  pathname.startsWith('/RoomExplorer/')));
                            const expanded = !!openBySlug[slug];
                            const toggle = () =>
                              setOpenBySlug((prev) => ({ ...prev, [slug]: !prev[slug] }));

                            return (
                              <li key={slug} className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={toggle}
                                  className={`flex w-full items-center gap-2 rounded-md px-4 py-2 text-left font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ${
                                    isActive ? '!text-white' : ''
                                  }`}
                                  aria-expanded={expanded}
                                >
                                  <ProjectFolderIcon />
                                  <span className="min-w-0 flex-1">{meta.name}</span>
                                </button>
                                {heavyContentMounted && expanded ? (
                                  <div className="mt-1 border-l border-gray-600 pl-2">
                                    {slug === 'a6-stern' ? (
                                      <FileTree />
                                    ) : (
                                      <p className="px-2 py-2 text-xs text-gray-400">
                                        No rooms or files yet.
                                      </p>
                                    )}
                                  </div>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </React.Fragment>
                )}
              </SidebarLinkGroup>
            </ul>
          </div>

          <div className="mb-4 w-full shrink-0 px-3.5">
            {heavyContentMounted ? <Calendar /> : null}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
