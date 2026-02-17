import type { DrizzleD1Database } from 'drizzle-orm/d1';

export const MAX_SQL_VARS = 900;
export const SAFE_MAX_SQL_VARS = 500;

// Type for our Drizzle database instance
// Using a generic database type since the exact schema type is complex
export type AppDatabase = DrizzleD1Database<Record<string, unknown>>;

export function calculateChunkSize(rowVariableCount: number, maxVars = SAFE_MAX_SQL_VARS): number {
  return Math.floor(maxVars / rowVariableCount);
}

const BATCH_SIZE_SEQUENCE = [90, 60, 45, 30, 20, 15, 10, 7, 5, 3, 1];

/**
 * Inserts records with automatic batching to avoid SQLite variable limits
 * @param db - Drizzle database instance
 * @param table - Table to insert into
 * @param records - Records to insert
 * @param options - Optional settings
 * @returns Array of inserted record IDs if returning is enabled
 *
 * Note: Type assertions are needed because this is a generic utility function that works
 * with any table type. Drizzle's insert() requires specific table types at compile time,
 * but we only know the table at runtime. The actual type safety is enforced by the caller.
 */
export async function insertWithAutoBatching<T>(
  db: AppDatabase,
  table: unknown,
  records: T[],
  options?: { returning?: boolean }
): Promise<Array<{ id: string }>> {
  if (records.length === 0) return [];

  for (const batchSize of BATCH_SIZE_SEQUENCE) {
    try {
      const results: Array<{ id: string }> = [];
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        // Type assertion needed: table parameter is generic, but Drizzle requires specific table type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const insertQuery = (db as AppDatabase).insert(table as any).values(batch as any);
        if (options?.returning) {
          // Type assertion needed: returning() needs specific column selection type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const inserted = await insertQuery.returning({ id: '' as any }) as unknown as Array<{ id: string }>;
          results.push(...inserted);
        } else {
          await insertQuery.run();
        }
      }
      return results;
    } catch (err) {
      const error = err as { cause?: { message?: string } } & Error;
      if (error.cause?.message?.includes('too many SQL variables') || error.message?.includes('too many SQL variables')) {
        continue;
      }
      throw err;
    }
  }
  return [];
}

/**
 * Inserts records with automatic batching (raw version without returning)
 * @param db - Drizzle database instance
 * @param table - Table to insert into
 * @param records - Records to insert
 *
 * Note: Type assertions are needed because this is a generic utility function that works
 * with any table type. Drizzle's insert() requires specific table types at compile time,
 * but we only know the table at runtime. The actual type safety is enforced by the caller.
 */
export async function insertWithAutoBatchingRaw<T>(
  db: AppDatabase,
  table: unknown,
  records: T[]
): Promise<void> {
  if (records.length === 0) return;

  for (const batchSize of BATCH_SIZE_SEQUENCE) {
    try {
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        // Type assertion needed: table and batch parameters are generic, but Drizzle requires specific types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as AppDatabase).insert(table as any).values(batch as any).run();
      }
      break;
    } catch (err) {
      const error = err as { cause?: { message?: string } } & Error;
      if (error.cause?.message?.includes('too many SQL variables') || error.message?.includes('too many SQL variables')) {
        continue;
      }
      throw err;
    }
  }
}
