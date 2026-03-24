import { getDb } from './index';
import type { DbOrTx } from './workout/types';

interface DrizzleQuery {
  offset(offset: number): unknown;
  limit(limit: number): unknown;
}

export function applyPagination<T extends DrizzleQuery>(
  query: T,
  offset?: number,
  limit?: number
): T {
  let result: unknown = query;
  if (offset !== undefined) {
    result = (result as { offset(offset: number): unknown }).offset(offset);
  }
  if (limit !== undefined) {
    result = (result as { limit(limit: number): unknown }).limit(limit);
  }
  return result as T;
}

export function withUpdatedAt<T extends object>(data: T): T & { updatedAt: string } {
  return { ...data, updatedAt: new Date().toISOString() };
}

export function getDbInstance(dbOrTx: DbOrTx) {
  return getDb(dbOrTx);
}
