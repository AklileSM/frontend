import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, type Role } from '../../context/AuthContext';
import DarkModeSwitcher from '../../components/Header/DarkModeSwitcher';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname?: string } } };
  const redirectTo = location.state?.from?.pathname;
  const safeRedirect =
    redirectTo && redirectTo !== '/login' && redirectTo !== '/unauthorized' ? redirectTo : '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role] = useState<Role>('viewer');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      await login({ username, password, role, remember });
      navigate(safeRedirect, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-2 dark:bg-boxdark-2 px-4 py-8">
      <div className="absolute right-4 top-4 z-10 md:right-6 md:top-6">
        <ul className="m-0 list-none p-0">
          <DarkModeSwitcher />
        </ul>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-boxdark rounded-xl shadow-card p-8">
        <div className="mb-6 text-center">
          <img
            src="Logo/LogoforWhite.png"
            alt="Logo"
            className="h-10 mx-auto dark:hidden"
          />
          <img
            src="Logo/LogoforDark.png"
            alt="Logo"
            className="h-10 mx-auto hidden dark:block"
          />
          <h1 className="mt-4 text-title-md font-semibold text-black dark:text-white">Sign in</h1>
          <p className="text-body text-sm dark:text-bodydark mt-1">Access your project dashboard</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-danger/10 text-danger px-3 py-2 text-sm">{error}</div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-stroke rounded-md shadow-sm dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring focus:ring-primary focus:border-primary text-black dark:text-white"
              placeholder="jane.doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-stroke rounded-md shadow-sm dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring focus:ring-primary focus:border-primary text-black dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="form-checkbox h-4 w-4 text-primary"
              />
              Remember me
            </label>
            <Link to="#" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center rounded-md bg-primary py-3 px-8 text-center font-medium text-white shadow-md transition-transform duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-body dark:text-bodydark">
          This is a frontend-only prototype. Real auth/roles will be verified by FastAPI.
        </p>
      </div>
    </div>
  );
};

export default Login;
