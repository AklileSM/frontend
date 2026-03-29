import { useEffect, useState } from 'react';
import DarkModeSwitcher from './DarkModeSwitcher';
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
          <label htmlFor="header-project-select" className="sr-only">
            Current project
          </label>
          <select
            id="header-project-select"
            className="rounded-md border border-stroke bg-white px-2 py-1.5 text-sm font-medium text-black focus:border-primary focus:outline-none dark:border-strokedark dark:bg-boxdark dark:text-white"
            value={selectedPath}
            onChange={(e) => {
              const path = e.target.value;
              if (path === '/A6_Stern') {
                navigate('/RoomExplorer', { state: { room: readStoredA6Room() } });
                return;
              }
              navigate(path);
            }}
          >
            {navProjects.map((p) => (
              <option key={p.slug} value={p.path}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-3 2xsm:gap-7">
          <ul className="flex items-center gap-2 2xsm:gap-4">
            <button
              className="mr-5 inline-flex items-center justify-center rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:scale-105 lg:px-8 xl:px-10"
              onClick={navigateHomeModal}
            >
              {isComparePage ? 'Home' : 'Compare'}
            </button>

            {/* <!-- Dark Mode Toggler --> */}
            <DarkModeSwitcher />
            {/* <!-- Dark Mode Toggler --> */}

            <HeaderProfileMenu />

            {/* <!-- Notification Menu Area --> */}
            {/* <DropdownNotification /> */}
            {/* <!-- Notification Menu Area --> */}

            {/* <!-- Chat Notification Area --> */}
            {/* <DropdownMessage /> */}
            {/* <!-- Chat Notification Area --> */}
          </ul>

          {/* <!-- User Area --> */}
          {/* <DropdownUser /> */}
          {/* <!-- User Area --> */}
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
