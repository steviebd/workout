import { drizzle } from 'drizzle-orm/connect';
import * as schema from './schema';

export { schema };

export function createDb(db: D1Database) {
  return drizzle(db, { schema });
}
