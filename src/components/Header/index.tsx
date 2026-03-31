import { useEffect, useRef, useState } from 'react';
import HeaderProfileMenu from './HeaderProfileMenu';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FALLBACK_PROJECT_NAV,
  mergeProjectNav,
  projectPathForPathname,
  type NavProject,
} from '../../config/projectNav';
import { listProjects } from '../../services/apiClient';
import { readStoredA6Room } from '../../utils/a6RoomPreferences';

const Header = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [navProjects, setNavProjects] = useState<NavProject[]>(FALLBACK_PROJECT_NAV);
  const [projectDropOpen, setProjectDropOpen] = useState(false);
  const projectDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (projectDropRef.current && !projectDropRef.current.contains(e.target as Node)) {
        setProjectDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    listProjects()
      .then((api) => setNavProjects(mergeProjectNav(api)))
      .catch(() => setNavProjects(FALLBACK_PROJECT_NAV));
  }, []);

  const selectedPath = projectPathForPathname(pathname);

  const isComparePage = pathname === '/compare';
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);

  const navigateHomeModal = () => {
    if(isComparePage){
      setIsBackModalOpen(true)
    }else {
      navigate('/compare')
    }
  }

  const navigateHome = () => {
    navigate('/A6_stern')
    setIsBackModalOpen(false)
  }
  return (
    <div>
      <header className="sticky top-0 z-9999 flex w-full bg-white drop-shadow-1 dark:bg-boxdark dark:drop-shadow-none">
      <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11">
        <div className="hidden sm:flex sm:items-center sm:gap-3">
          <Link
            to="/"
            className="text-title-md font-semibold text-black hover:opacity-90 dark:text-white"
          >
            Projects
          </Link>

          {/* Custom project switcher */}
          <div ref={projectDropRef} className="relative">
            <button
              type="button"
              onClick={() => setProjectDropOpen((v) => !v)}
              aria-expanded={projectDropOpen}
              aria-haspopup="listbox"
              className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                ${projectDropOpen
                  ? 'border-primary bg-primary text-white'
                  : 'border-stroke bg-white text-black hover:border-primary hover:text-primary dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:border-primary dark:hover:text-primary'
                }`}
            >
              {/* Folder icon */}
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              <span>{navProjects.find((p) => p.path === selectedPath)?.name ?? 'Project'}</span>
              <svg
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${projectDropOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {projectDropOpen && (
              <div className="absolute left-0 top-full z-[9999] mt-2 w-48 overflow-hidden rounded-xl border border-stroke bg-white shadow-xl dark:border-strokedark dark:bg-gray-800">
                <div className="border-b border-stroke dark:border-strokedark px-3 py-2 bg-gray-50 dark:bg-meta-4/40">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Switch project</p>
                </div>
                {navProjects.map((p) => {
                  const isActive = p.path === selectedPath;
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        setProjectDropOpen(false);
                        if (p.path === '/A6_Stern') {
                          navigate('/RoomExplorer', { state: { room: readStoredA6Room() } });
                        } else {
                          navigate(p.path);
                        }
                      }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors text-left
                        ${isActive
                          ? 'bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary'
                          : 'text-black dark:text-white hover:bg-gray-100 dark:hover:bg-meta-4'
                        }`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`} />
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
        </div>
        
        <div className="flex items-center gap-4">
          <button
            className="inline-flex items-center justify-center rounded-lg bg-primary py-2.5 px-6 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            onClick={navigateHomeModal}
          >
            {isComparePage ? 'Home' : 'Compare'}
          </button>

          <div className="flex items-center gap-3">
            <HeaderProfileMenu />

          </div>
        </div>
      </div>
      
    </header>
    {isBackModalOpen && (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-9999">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg max-w-md w-full">
          <p className="text-lg  mb-6 text-gray-900 dark:text-gray-200">Any unpublished reports will be lost if you proceed. Are you sure you want to continue? </p>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={()=>setIsBackModalOpen(false)}
              className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={navigateHome}
              className="bg-indigo-600 text-white py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
    
  );
};

export default Header;
