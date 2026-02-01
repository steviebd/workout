import { localDB } from '../db/local-db';

interface CachedUser {
  id: string;
  email: string;
  name: string;
  cachedAt: Date;
}

const CACHE_KEY = 'auth_user';
const CACHE_EXPIRY_DAYS = 7;

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

export async function cacheUser(user: CachedUser): Promise<void> {
  if (!isClient()) return;
  try {
    await localDB.syncMetadata.put({
      key: CACHE_KEY,
      value: JSON.stringify(user),
      updatedAt: new Date(),
    });
  } catch {
    // Ignore IndexedDB errors
  }
}

export async function getCachedUser(): Promise<CachedUser | null> {
  if (!isClient()) return null;
  try {
    const cached = await localDB.syncMetadata.get({ key: CACHE_KEY });
    if (!cached) return null;

    const user = JSON.parse(cached.value) as CachedUser;
    return user;
  } catch {
    return null;
  }
}

export async function clearCachedUser(): Promise<void> {
  if (!isClient()) return;
  try {
    await localDB.syncMetadata.where('key').equals(CACHE_KEY).delete();
  } catch {
    // Ignore IndexedDB errors
  }
}

export async function isAuthCacheValid(): Promise<boolean> {
  if (!isClient()) return false;
  try {
    const cached = await localDB.syncMetadata.get({ key: CACHE_KEY });
    if (!cached) return false;

    const cachedAt = new Date(cached.updatedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - cachedAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays < CACHE_EXPIRY_DAYS;
  } catch {
    return false;
  }
}
