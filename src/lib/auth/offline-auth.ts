import { localDB } from '../db/local-db';

interface CachedUser {
  id: string;
  email: string;
  name: string;
  workosId: string;
  cachedAt: Date;
}

const CACHE_KEY = 'auth_user';
const CACHE_EXPIRY_DAYS = 7;

export async function cacheUser(user: CachedUser): Promise<void> {
  await localDB.syncMetadata.put({
    key: CACHE_KEY,
    value: JSON.stringify(user),
    updatedAt: new Date(),
  });
}

export async function getCachedUser(): Promise<CachedUser | null> {
  const cached = await localDB.syncMetadata.get({ key: CACHE_KEY });
  if (!cached) return null;

  try {
    const user = JSON.parse(cached.value) as CachedUser;
    return user;
  } catch {
    return null;
  }
}

export async function clearCachedUser(): Promise<void> {
  await localDB.syncMetadata.where('key').equals(CACHE_KEY).delete();
}

export async function isAuthCacheValid(): Promise<boolean> {
  const cached = await localDB.syncMetadata.get({ key: CACHE_KEY });
  if (!cached) return false;

  const cachedAt = new Date(cached.updatedAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - cachedAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays < CACHE_EXPIRY_DAYS;
}
