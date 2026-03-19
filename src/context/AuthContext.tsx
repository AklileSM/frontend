import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Role = 'admin' | 'manager' | 'viewer';

type AuthUser = {
  id: string;
  name: string;
  role: Role;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (params: { username: string; password: string; role?: Role; remember?: boolean }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'a6_auth_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        setUser(parsed);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  const login: AuthContextValue['login'] = async ({ username, password, role, remember }) => {
    if (!username || !password) throw new Error('Missing credentials');
    const inferredRole: Role = role ?? (username.toLowerCase().includes('admin')
      ? 'admin'
      : username.toLowerCase().includes('manager')
      ? 'manager'
      : 'viewer');
    const authUser: AuthUser = {
      id: (globalThis as any).crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
      name: username,
      role: inferredRole,
    };
    setUser(authUser);
    if (remember) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    login,
    logout,
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export type { Role, AuthUser };
