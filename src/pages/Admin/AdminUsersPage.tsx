import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listAdminUsers, updateAdminUser, type ApiAdminUser } from '../../services/apiClient';
import PageTitle from '../../components/PageTitle';

const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ApiAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listAdminUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = useCallback(
    async (u: ApiAdminUser, changes: { is_admin?: boolean; is_active?: boolean }) => {
      setUpdating(u.id);
      try {
        const updated = await updateAdminUser(u.id, changes);
        setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Update failed');
      } finally {
        setUpdating(null);
      }
    },
    [],
  );

  return (
    <div className="px-6 py-8">
      <PageTitle title="Admin · Users" />
      <h1 className="mb-2 text-2xl font-bold text-black dark:text-white">Users</h1>
      {!loading && (
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {users.length} {users.length === 1 ? 'user' : 'users'} registered
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke bg-gray-50 dark:border-strokedark dark:bg-gray-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Joined</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Admin</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const busy = updating === u.id;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-stroke/60 transition-colors hover:bg-gray-50 dark:border-strokedark/60 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-black dark:text-white">
                      {u.username}
                      {isSelf && (
                        <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">you</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Toggle
                        checked={u.is_admin}
                        disabled={busy || isSelf}
                        title={isSelf ? 'Cannot change your own admin status' : undefined}
                        onChange={(v) => patch(u, { is_admin: v })}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Toggle
                        checked={u.is_active}
                        disabled={busy || isSelf}
                        title={isSelf ? 'Cannot deactivate yourself' : undefined}
                        onChange={(v) => patch(u, { is_active: v })}
                      />
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

function Toggle({
  checked,
  disabled,
  title,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  title?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40
        ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

export default AdminUsersPage;
