export const MAX_SQL_VARS = 900;
export const SAFE_MAX_SQL_VARS = 500;

export function calculateChunkSize(rowVariableCount: number, maxVars = SAFE_MAX_SQL_VARS): number {
  return Math.floor(maxVars / rowVariableCount);
}

const BATCH_SIZE_SEQUENCE = [90, 60, 45, 30, 20, 15, 10, 7, 5, 3, 1];

export async function insertWithAutoBatching<T>(
  db: any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
        const insertQuery = db.insert(table).values(batch);
        if (options?.returning) {
          const inserted = await insertQuery.returning({ id: '' }) as unknown as Array<{ id: string }>;
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

export async function insertWithAutoBatchingRaw<T>(
  db: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  table: unknown,
  records: T[]
): Promise<void> {
  if (records.length === 0) return;

  for (const batchSize of BATCH_SIZE_SEQUENCE) {
    try {
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await db.insert(table).values(batch).run();
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
