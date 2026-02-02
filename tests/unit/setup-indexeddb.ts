import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';

if (typeof window !== 'undefined') {
  const { localDB } = await import('../../src/lib/db/local-db');

  beforeEach(async () => {
    await localDB.exercises.clear();
    await localDB.templates.clear();
    await localDB.workouts.clear();
    await localDB.workoutExercises.clear();
    await localDB.workoutSets.clear();
    await localDB.offlineQueue.clear();
    await localDB.syncMetadata.clear();
  });
}
