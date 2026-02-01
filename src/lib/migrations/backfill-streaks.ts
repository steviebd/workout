import { createDb } from '../db/index';
import { workouts } from '../db/schema';

export async function runBackfill() {
  const env = process.env as { DB?: D1Database };
  const db = env.DB;
  if (!db) {
    console.error('Database not available');
    return;
  }

  const drizzleDb = createDb(db);

  const users = await drizzleDb.select().from(workouts);

  const processedWorkosIds = new Set<string>();

  for (const workout of users) {
    if (!processedWorkosIds.has(workout.workosId)) {
      processedWorkosIds.add(workout.workosId);
      
      try {
        const { backfillUserStreaks } = await import('../streaks');
        await backfillUserStreaks(db, workout.workosId);
        console.log(`Backfilled streak for user: ${workout.workosId}`);
      } catch (error) {
        console.error(`Failed to backfill streak for user ${workout.workosId}:`, error);
      }
    }
  }
}

runBackfill().catch(console.error);
