import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const HeaderProfileMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const initial = user.username.slice(0, 1).toUpperCase();

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
          className="absolute right-0 mt-2 w-64 rounded-md border border-stroke bg-white py-1 shadow-lg dark:border-strokedark dark:bg-gray-800 z-[10000]"
          role="menu"
        >
          <div className="border-b border-stroke px-4 py-3 dark:border-strokedark">
            <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
            <p className="truncate font-semibold text-black dark:text-white">{user.username}</p>
            {user.email ? (
              <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
            ) : null}
            <p className="mt-2 text-xs font-medium capitalize text-primary">{user.role}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full px-4 py-2.5 text-left text-sm font-medium text-danger hover:bg-gray-100 dark:hover:bg-meta-4"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default HeaderProfileMenu;
