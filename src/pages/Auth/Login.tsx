import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, type Role } from '../../context/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = (location.state as any)?.from?.pathname || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      await login({ username, password, role, remember });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-2 dark:bg-boxdark-2 px-4">
      <div className="w-full max-w-md bg-white dark:bg-boxdark rounded-xl shadow-card p-8">
        <div className="mb-6 text-center">
          <img src="Logo/LogoforDark.png" alt="Logo" className="h-10 inline-block dark:opacity-100 opacity-90" />
          <h1 className="mt-4 text-title-md font-semibold text-black dark:text-white">Sign in</h1>
          <p className="text-body text-sm dark:text-bodydark mt-1">Access your project dashboard</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-danger/10 text-danger px-3 py-2 text-sm">{error}</div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-md shadow-sm dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring focus:ring-primary focus:border-primary text-black dark:text-white"
              placeholder="jane.doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-md shadow-sm dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring focus:ring-primary focus:border-primary text-black dark:text-white"
              placeholder="••••••••"
            />
          </div>

          {/* <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-4 py-2 border rounded-md shadow-sm dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring focus:ring-primary focus:border-primary text-black dark:text-white"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div> */}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="form-checkbox h-4 w-4 text-indigo-600" />
              Remember me
            </label>
            <Link to="#" className="text-sm text-primary hover:underline">Forgot password?</Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full font-semibold py-3 rounded-lg shadow-md transition-transform duration-300 "
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


