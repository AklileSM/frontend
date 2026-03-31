import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HeaderProfileMenu from './HeaderProfileMenu';
import DarkModeSwitcher from './DarkModeSwitcher';
import {
  FALLBACK_PROJECT_NAV,
  mergeProjectNav,
  type NavProject,
} from '../../config/projectNav';
import { listProjects } from '../../services/apiClient';

interface HomeHeaderProps {
  selectedSlug: string;
  onProjectChange: (slug: string) => void;
}

const HomeHeader = ({ selectedSlug, onProjectChange }: HomeHeaderProps) => {
  const [navProjects, setNavProjects] = useState<NavProject[]>(FALLBACK_PROJECT_NAV);
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listProjects()
      .then((api) => setNavProjects(mergeProjectNav(api)))
      .catch(() => setNavProjects(FALLBACK_PROJECT_NAV));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentProject = navProjects.find((p) => p.slug === selectedSlug) ?? navProjects[0];

  return (
    <header className="sticky top-0 z-999 flex w-full bg-white drop-shadow-1 dark:bg-boxdark dark:drop-shadow-none">
      <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11">
        {/* Logo */}
        <div className="hidden sm:block">
          <img className="w-1/12 dark:hidden" src="Logo/LogoforWhite.png" alt="Logo" />
          <img className="w-1/12 hidden dark:block" src="Logo/LogoforDark.png" alt="Logo" />
        </div>
        <div className="block lg:hidden">
          <Link className="flex-shrink-0" to="/" />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 2xsm:gap-5">
          {/* Project switcher */}
          <div ref={dropRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-haspopup="listbox"
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                ${open
                  ? 'border-primary bg-primary text-white'
                  : 'border-stroke bg-white text-black hover:border-primary hover:text-primary dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:border-primary dark:hover:text-primary'
                }`}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              <span>{currentProject?.name ?? 'Project'}</span>
              <svg
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {open && (
              <div className="absolute right-0 top-full z-[9999] mt-2 w-48 overflow-hidden rounded-xl border border-stroke bg-white shadow-xl dark:border-strokedark dark:bg-gray-800">
                <div className="border-b border-stroke dark:border-strokedark px-3 py-2 bg-gray-50 dark:bg-meta-4/40">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Switch project</p>
                </div>
                {navProjects.map((p) => {
                  const isActive = p.slug === selectedSlug;
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        setOpen(false);
                        onProjectChange(p.slug);
                      }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors text-left
                        ${isActive
                          ? 'bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary'
                          : 'text-black dark:text-white hover:bg-gray-100 dark:hover:bg-meta-4'
                        }`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${isActive ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      {p.name}
                      {isActive && (
                        <svg className="ml-auto h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DarkModeSwitcher />
          <HeaderProfileMenu />
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;
