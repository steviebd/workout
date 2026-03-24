import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

export const MAX_SQL_VARS = 900;
export const SAFE_MAX_SQL_VARS = 500;

export type AppDatabase = DrizzleD1Database<Record<string, unknown>>;

export function calculateChunkSize(rowVariableCount: number, maxVars = SAFE_MAX_SQL_VARS): number {
  return Math.floor(maxVars / rowVariableCount);
}

const BATCH_SIZE_SEQUENCE = [90, 60, 45, 30, 20, 15, 10, 7, 5, 3, 1];

interface InsertValuesResult {
  returning<TRet extends { id: string }>(sel: { id: true }): Promise<TRet[]>;
  run(): Promise<{ success: boolean }>;
}

export async function insertWithAutoBatching<T extends Record<string, unknown>>(
  db: AppDatabase,
  table: SQLiteTable,
  records: T[],
  options?: { returning?: boolean }
): Promise<Array<{ id: string }>> {
  if (records.length === 0) return [];

  for (const batchSize of BATCH_SIZE_SEQUENCE) {
    try {
      const results: Array<{ id: string }> = [];
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const insertQuery = db.insert(table).values(batch) as InsertValuesResult;
        if (options?.returning) {
          const inserted = await insertQuery.returning({ id: true });
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

export async function insertWithAutoBatchingRaw<T extends Record<string, unknown>>(
  db: AppDatabase,
  table: SQLiteTable,
  records: T[]
): Promise<void> {
  if (records.length === 0) return;

  for (const batchSize of BATCH_SIZE_SEQUENCE) {
    try {
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        // Drizzle insert returns a builder that must be cast for dynamic table access
        await (db.insert(table).values(batch) as InsertValuesResult).run();
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
