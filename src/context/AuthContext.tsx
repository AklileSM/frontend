import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiFetchCurrentUser, apiLogin, apiRegister } from '../services/apiClient';
import {
  clearSession,
  normalizeUser,
  readSession,
  storeSession,
  type AuthUser,
  type Role,
} from '../auth/authSession';

export type { AuthUser, Role };

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (params: { username: string; password: string; remember?: boolean }) => Promise<void>;
  register: (params: {
    username: string;
    password: string;
    email?: string;
    remember?: boolean;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => readSession()?.user ?? null);

  useEffect(() => {
    const session = readSession();
    if (!session) return;

    let cancelled = false;
    apiFetchCurrentUser()
      .then((raw) => {
        if (cancelled) return;
        const nextUser = normalizeUser(raw);
        setUser(nextUser);
        storeSession({ accessToken: session.accessToken, user: nextUser }, true);
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async ({ username, password, remember = true }: { username: string; password: string; remember?: boolean }) => {
      if (!username || !password) throw new Error('Missing credentials');
      const data = await apiLogin(username, password);
      const nextUser = normalizeUser(data.user);
      const session = { accessToken: data.access_token, user: nextUser };
      storeSession(session, remember);
      setUser(nextUser);
    },
    [],
  );

  const register = useCallback(
    async ({
      username,
      password,
      email,
      remember = true,
    }: {
      username: string;
      password: string;
      email?: string;
      remember?: boolean;
    }) => {
      if (!username || !password) throw new Error('Missing credentials');
      const data = await apiRegister(username, password, email);
      const nextUser = normalizeUser(data.user);
      const session = { accessToken: data.access_token, user: nextUser };
      storeSession(session, remember);
      setUser(nextUser);
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    clearSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }),
    [user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
