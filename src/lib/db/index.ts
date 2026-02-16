import { drizzle } from 'drizzle-orm/d1';
import schema from './schema';
export { calculateChunkSize, MAX_SQL_VARS } from './utils';

export { schema };

import { type DbOrTx } from './workout/types';

export type { DbOrTx };

export function createDb(db: D1Database) {
  return drizzle(db, { schema });
}

export function getDb(dbOrTx: DbOrTx) {
  if ('transaction' in dbOrTx) {
    return dbOrTx;
  }
  return createDb(dbOrTx);
}
