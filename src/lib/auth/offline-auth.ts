interface CachedUser {
  id: string;
  email: string;
  name: string;
  cachedAt?: number;
}

const CACHE_KEY = 'auth_user';
const CACHE_EXPIRY_DAYS = 7;

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export async function cacheUser(user: CachedUser): Promise<void> {
  if (!isClient()) return;
  try {
    const userWithTimestamp = { ...user, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(userWithTimestamp));
  } catch {
    // Ignore localStorage errors
  }
}

export async function getCachedUser(): Promise<CachedUser | null> {
  if (!isClient()) return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const user = JSON.parse(cached) as CachedUser;
    if (!user.cachedAt) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    const cachedAt = new Date(user.cachedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - cachedAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= CACHE_EXPIRY_DAYS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function clearCachedUser(): Promise<void> {
  if (!isClient()) return;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore localStorage errors
  }
}
