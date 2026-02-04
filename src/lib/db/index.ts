import { drizzle } from 'drizzle-orm/d1';
import schema from './schema';
export { calculateChunkSize, MAX_SQL_VARS } from './utils';

export { schema };

export function createDb(db: D1Database) {
  return drizzle(db, { schema });
}
