export type AuthUser = {
  id: string;
  username: string;
  email: string | null;
  is_admin: boolean;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

const STORAGE_KEY = 'a6_auth_v2';

/** In-memory token when "Remember me" is off (lost on full page reload). */
let ephemeralAccessToken: string | null = null;

export function normalizeUser(raw: {
  id: string;
  username: string;
  email?: string | null;
  is_admin?: boolean;
  /** Legacy field from old sessions stored in localStorage. */
  role?: string;
}): AuthUser {
  const is_admin =
    typeof raw.is_admin === 'boolean'
      ? raw.is_admin
      : raw.role === 'admin';
  return {
    id: raw.id,
    username: raw.username,
    email: raw.email ?? null,
    is_admin,
  };
}

export function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed?.accessToken || !parsed?.user?.id) return null;
    return {
      accessToken: parsed.accessToken,
      user: normalizeUser(parsed.user as AuthUser & { role?: string }),
    };
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession): void {
  ephemeralAccessToken = null;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/** Persist session or keep token only in memory (no reload survival). */
export function storeSession(session: AuthSession, persist: boolean): void {
  localStorage.removeItem(STORAGE_KEY);
  ephemeralAccessToken = null;
  if (persist) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    ephemeralAccessToken = session.accessToken;
  }
}

export function clearSession(): void {
  ephemeralAccessToken = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('a6_auth_v1');
}

export function getAccessToken(): string | null {
  if (ephemeralAccessToken) return ephemeralAccessToken;
  return readSession()?.accessToken ?? null;
}
