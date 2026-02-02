import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { localDB } from '../../src/lib/db/local-db';

(global as { indexedDB?: typeof indexedDB }).indexedDB ??= (await import('fake-indexeddb')).default;

beforeEach(async () => {
  await localDB.exercises.clear();
  await localDB.templates.clear();
  await localDB.workouts.clear();
  await localDB.workoutExercises.clear();
  await localDB.workoutSets.clear();
  await localDB.offlineQueue.clear();
  await localDB.syncMetadata.clear();
});
