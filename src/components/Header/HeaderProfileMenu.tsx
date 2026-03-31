import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useColorMode from '../../hooks/useColorMode';

const HeaderProfileMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [colorMode, setColorMode] = useColorMode();

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const toggleDark = () => {
    if (typeof setColorMode === 'function') {
      setColorMode(colorMode === 'light' ? 'dark' : 'light');
    }
  };

  const initial = user.username.slice(0, 1).toUpperCase();
  const isDark = colorMode === 'dark';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white shadow-md transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-boxdark"
        aria-expanded={open}
        aria-haspopup="menu"
        title={`Account (${user.username})`}
      >
        {initial}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl border border-stroke bg-white shadow-xl dark:border-strokedark dark:bg-gray-800 z-[10000] overflow-hidden"
          role="menu"
        >
          {/* User info */}
          <div className="border-b border-stroke px-4 py-3.5 dark:border-strokedark">
            <p className="text-xs text-gray-400 dark:text-gray-500">Signed in as</p>
            <p className="mt-0.5 truncate font-semibold text-black dark:text-white">{user.username}</p>
            <p className="mt-1.5 text-xs font-medium capitalize text-primary">{user.role}</p>
          </div>

          {/* Dark mode toggle row */}
          <div className="flex items-center justify-between border-b border-stroke px-4 py-3 dark:border-strokedark">
            <div className="flex items-center gap-2.5">
              {isDark ? (
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              )}
              <span className="text-sm font-medium text-black dark:text-white">
                {isDark ? 'Dark mode' : 'Light mode'}
              </span>
            </div>
            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              onClick={toggleDark}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800
                ${isDark ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
                  ${isDark ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          {/* Nav items */}
          <Link
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-black hover:bg-gray-50 dark:text-white dark:hover:bg-meta-4 transition-colors"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-danger hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default HeaderProfileMenu;
