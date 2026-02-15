import { mapLocalToActiveWorkout } from './mappers';
import type { ActiveWorkout } from './types';
import { localDB, type LocalWorkoutSet } from '~/lib/db/local-db';

export async function getActiveWorkoutWithDetails(userId: string): Promise<ActiveWorkout | null> {
  const localWorkout = await localDB.workouts
    .where('workosId').equals(userId)
    .and((w) => w.status === 'in_progress')
    .first();

  if (!localWorkout) return null;

  const workoutExercises = await localDB.workoutExercises
    .where('workoutId')
    .equals(localWorkout.localId)
    .toArray();

  const weLocalIds = workoutExercises.map(we => we.localId);
  const allSets = weLocalIds.length > 0
    ? await localDB.workoutSets.where('workoutExerciseId').anyOf(weLocalIds).toArray()
    : [];

  const setsByExercise = new Map<string, LocalWorkoutSet[]>();
  for (const set of allSets) {
    const existing = setsByExercise.get(set.workoutExerciseId) ?? [];
    existing.push(set);
    setsByExercise.set(set.workoutExerciseId, existing);
  }

  const exercisesWithSets = workoutExercises.map(we => ({
    ...we,
    sets: setsByExercise.get(we.localId) ?? [],
  }));

  return mapLocalToActiveWorkout(localWorkout, exercisesWithSets);
}

export async function getWorkoutExerciseLocalId(workoutLocalId: string, exerciseId: string): Promise<string | null> {
  const we = await localDB.workoutExercises
    .where('workoutId').equals(workoutLocalId)
    .and((e) => e.exerciseId === exerciseId)
    .first();
  return we?.localId ?? null;
}
