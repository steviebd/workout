import { getDb } from './index';
import type { DbOrTx } from './workout/types';

/**
 * Applies pagination to a query builder
 * Returns the query with offset and limit applied if provided
 * 
 * Note: Uses type assertions because Drizzle's query builder types are complex
 * and vary based on the specific query being built. The generic T allows this
 * function to work with any query builder while maintaining type safety.
 */
export function applyPagination<T>(
  query: T,
  offset?: number,
  limit?: number
): T {
  let result = query;
  if (offset !== undefined) {
    // Type assertion needed because we can't know the exact query builder type at compile time
    // The offset() method is available on all Drizzle query builders that support pagination
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = (result as any).offset(offset);
  }
  if (limit !== undefined) {
    // Type assertion needed because we can't know the exact query builder type at compile time
    // The limit() method is available on all Drizzle query builders that support pagination
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = (result as any).limit(limit);
  }
  return result;
}

/**
 * Adds updatedAt timestamp to data
 */
export function withUpdatedAt<T extends object>(data: T): T & { updatedAt: string } {
  return { ...data, updatedAt: new Date().toISOString() };
}

/**
 * Gets a database instance (handles both direct db and transactions)
 */
export function getDbInstance(dbOrTx: DbOrTx) {
  return getDb(dbOrTx);
}
