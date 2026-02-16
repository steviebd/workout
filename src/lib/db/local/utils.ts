import { localDB } from '../local-db';

/**
 * Generates a new local UUID for offline identifiers
 * @returns A new random UUID string
 */
export function generateLocalId(): string {
  return crypto.randomUUID();
}

/**
 * Returns the current timestamp
 * @returns Current date and time
 */
export function now(): Date {
  return new Date();
}

async function withTransaction<T>(t1: Parameters<typeof localDB.transaction>[1], t2: Parameters<typeof localDB.transaction>[2], callback: () => Promise<T>): Promise<T>;
async function withTransaction<T>(
  t1: Parameters<typeof localDB.transaction>[1],
  t2: Parameters<typeof localDB.transaction>[2],
  callback: () => Promise<T>
): Promise<T> {
  if (typeof localDB.transaction === 'function') {
    return localDB.transaction('rw', t1, t2, callback);
  }
  return callback();
}

export { withTransaction };
