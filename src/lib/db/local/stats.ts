import { localDB, type LocalWorkoutSet } from '../local-db';
import { isSquat, isBench, isDeadlift, isOverheadPress } from '~/lib/exercise-categories';

export interface LocalWorkoutStats {
  totalWorkouts: number;
  thisWeek: number;
  thisMonth: number;
  totalVolume: number;
  totalSets: number;
}

export interface LocalPersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  date: string;
  weight: number;
  reps: number;
  previousRecord?: number;
}

/**
 * Calculates workout history stats from local data
 * @param workosId - The user's WorkOS ID
 * @returns Workout statistics
 */
export async function getLocalWorkoutStats(workosId: string): Promise<LocalWorkoutStats> {
  const workouts = await localDB.workouts
    .where('workosId')
    .equals(workosId)
    .and(w => w.status === 'completed')
    .toArray();

  const currentDate = new Date();
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);

  const thisWeek = workouts.filter(w => w.startedAt >= weekStart).length;
  const thisMonth = workouts.filter(w => w.startedAt >= monthStart).length;

  let totalVolume = 0;
  let totalSets = 0;

  for (const workout of workouts) {
    const exercises = await localDB.workoutExercises
      .where('workoutId')
      .equals(workout.localId)
      .toArray();

    for (const exercise of exercises) {
      const sets = await localDB.workoutSets
        .where('workoutExerciseId')
        .equals(exercise.localId)
        .and(s => s.completed)
        .toArray();

      for (const set of sets) {
        totalVolume += (set.weight || 0) * set.reps;
        totalSets++;
      }
    }
  }

  return {
    totalWorkouts: workouts.length,
    thisWeek,
    thisMonth,
    totalVolume,
    totalSets,
  };
}

/**
 * Calculates personal records from local workout data
 * @param workosId - The user's WorkOS ID
 * @param limit - Maximum number of PRs to return
 * @returns Array of personal records
 */
export async function getLocalPersonalRecords(workosId: string, limit = 5): Promise<LocalPersonalRecord[]> {
  const workouts = await localDB.workouts
    .where('workosId')
    .equals(workosId)
    .and(w => w.status === 'completed')
    .sortBy('startedAt');

  const exerciseMap = new Map<string, { name: string; id: string }>();
  const exercises = await localDB.exercises.where('workosId').equals(workosId).toArray();
  for (const ex of exercises) {
    exerciseMap.set(ex.localId, { name: ex.name, id: String(ex.id ?? ex.localId) });
  }

  interface WorkoutMax {
    workoutId: string;
    workoutDate: Date;
    exerciseId: string;
    exerciseName: string;
    maxWeight: number;
    repsAtMax: number;
  }

  const workoutMaxes: WorkoutMax[] = [];
  const exerciseCategories: Record<string, { id: string; name: string }> = {};

  const workoutIds = workouts.map(w => w.localId);
  const allWorkoutExercises = workoutIds.length > 0
    ? await localDB.workoutExercises.where('workoutId').anyOf(workoutIds).toArray()
    : [];

  const exerciseIds = allWorkoutExercises.map(e => e.localId);
  const allWorkoutSets = exerciseIds.length > 0
    ? await localDB.workoutSets.where('workoutExerciseId').anyOf(exerciseIds).toArray()
    : [];

  const setsByExercise = new Map<string, LocalWorkoutSet[]>();
  for (const set of allWorkoutSets) {
    if (set.completed && set.weight > 0) {
      const existing = setsByExercise.get(set.workoutExerciseId);
      if (existing) {
        existing.push(set);
      } else {
        setsByExercise.set(set.workoutExerciseId, [set]);
      }
    }
  }

  const exercisesByWorkout = new Map<string, typeof allWorkoutExercises>();
  for (const exercise of allWorkoutExercises) {
    const existing = exercisesByWorkout.get(exercise.workoutId);
    if (existing) {
      existing.push(exercise);
    } else {
      exercisesByWorkout.set(exercise.workoutId, [exercise]);
    }
  }

  for (const workout of workouts) {
    const oneRmMaxes: WorkoutMax[] = [];

    if (workout.squat1rm && exerciseCategories.squat) {
      oneRmMaxes.push({
        workoutId: workout.localId,
        workoutDate: workout.startedAt,
        exerciseId: exerciseCategories.squat.id,
        exerciseName: exerciseCategories.squat.name,
        maxWeight: workout.squat1rm,
        repsAtMax: 1,
      });
    }
    if (workout.bench1rm && exerciseCategories.bench) {
      oneRmMaxes.push({
        workoutId: workout.localId,
        workoutDate: workout.startedAt,
        exerciseId: exerciseCategories.bench.id,
        exerciseName: exerciseCategories.bench.name,
        maxWeight: workout.bench1rm,
        repsAtMax: 1,
      });
    }
    if (workout.deadlift1rm && exerciseCategories.deadlift) {
      oneRmMaxes.push({
        workoutId: workout.localId,
        workoutDate: workout.startedAt,
        exerciseId: exerciseCategories.deadlift.id,
        exerciseName: exerciseCategories.deadlift.name,
        maxWeight: workout.deadlift1rm,
        repsAtMax: 1,
      });
    }
    if (workout.ohp1rm && exerciseCategories.ohp) {
      oneRmMaxes.push({
        workoutId: workout.localId,
        workoutDate: workout.startedAt,
        exerciseId: exerciseCategories.ohp.id,
        exerciseName: exerciseCategories.ohp.name,
        maxWeight: workout.ohp1rm,
        repsAtMax: 1,
      });
    }

    const exercisesData = exercisesByWorkout.get(workout.localId) ?? [];

    for (const exercise of exercisesData) {
      const sets = setsByExercise.get(exercise.localId) ?? [];

      if (sets.length === 0) continue;

      let maxWeight = 0;
      let repsAtMax = 1;

      for (const set of sets) {
        if (set.weight > maxWeight) {
          maxWeight = set.weight;
          repsAtMax = set.reps;
        } else if (set.weight === maxWeight && set.reps > repsAtMax) {
          repsAtMax = set.reps;
        }
      }

      const exerciseInfo = exerciseMap.get(exercise.exerciseId);
      if (exerciseInfo) {
        const exerciseName = exerciseInfo.name;
        if (isSquat(exerciseName) && !exerciseCategories.squat) {
          exerciseCategories.squat = { id: exerciseInfo.id, name: exerciseName };
        }
        if (isBench(exerciseName) && !exerciseCategories.bench) {
          exerciseCategories.bench = { id: exerciseInfo.id, name: exerciseName };
        }
        if (isDeadlift(exerciseName) && !exerciseCategories.deadlift) {
          exerciseCategories.deadlift = { id: exerciseInfo.id, name: exerciseName };
        }
        if (isOverheadPress(exerciseName) && !exerciseCategories.ohp) {
          exerciseCategories.ohp = { id: exerciseInfo.id, name: exerciseName };
        }

        workoutMaxes.push({
          workoutId: workout.localId,
          workoutDate: workout.startedAt,
          exerciseId: exerciseInfo.id?.toString() || exercise.exerciseId,
          exerciseName,
          maxWeight,
          repsAtMax,
        });
      }
    }

    workoutMaxes.push(...oneRmMaxes);
  }

  const prs: LocalPersonalRecord[] = [];
  const previousMaxByExercise: Record<string, number> = {};

  for (const wm of workoutMaxes) {
    const prevMax = previousMaxByExercise[wm.exerciseId] ?? 0;
    const isPR = wm.maxWeight > prevMax;

    if (isPR) {
      prs.push({
        id: `${wm.workoutId}-${wm.exerciseId}`,
        exerciseId: wm.exerciseId,
        exerciseName: wm.exerciseName,
        date: wm.workoutDate.toISOString().split('T')[0],
        weight: wm.maxWeight,
        reps: wm.repsAtMax,
        previousRecord: prevMax > 0 ? prevMax : undefined,
      });
    }

    previousMaxByExercise[wm.exerciseId] = wm.maxWeight;
  }

  return prs
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

/**
 * Gets the count of personal records from local data
 * @param workosId - The user's WorkOS ID
 * @returns Number of PRs
 */
export async function getLocalPRCount(workosId: string): Promise<number> {
  const records = await getLocalPersonalRecords(workosId, 1000);
  return records.length;
}

/**
 * Gets the all-time best PR for each exercise from local data
 * @param workosId - The user's WorkOS ID
 * @param limit - Maximum number of results to return
 * @returns Array of personal records sorted by weight descending
 */
export async function getAllTimeLocalBestPRs(workosId: string, limit = 20): Promise<LocalPersonalRecord[]> {
  const workouts = await localDB.workouts
    .where('workosId')
    .equals(workosId)
    .and(w => w.status === 'completed')
    .toArray();

  const workoutIds = workouts.map(w => w.localId);

  const exercises = await localDB.exercises.where('workosId').equals(workosId).toArray();
  const exerciseMap = new Map<string, { name: string; id: string }>();
  for (const ex of exercises) {
    exerciseMap.set(ex.localId, { name: ex.name, id: String(ex.id ?? ex.localId) });
  }

  let workoutExercises: Array<import('../local-db').LocalWorkoutExercise> = [];
  if (workoutIds.length > 0) {
    workoutExercises = await localDB.workoutExercises
      .where('workoutId')
      .anyOf(workoutIds)
      .toArray();
  }

  const workoutExerciseIds = workoutExercises.map(e => e.localId);

  let workoutSets: LocalWorkoutSet[] = [];
  if (workoutExerciseIds.length > 0) {
    workoutSets = await localDB.workoutSets
      .where('workoutExerciseId')
      .anyOf(workoutExerciseIds)
      .and(s => s.completed && s.weight > 0)
      .toArray();
  }

  const workoutExerciseMap = new Map<string, import('../local-db').LocalWorkoutExercise>();
  for (const we of workoutExercises) {
    workoutExerciseMap.set(we.localId, we);
  }

  const setsByWorkoutExercise = new Map<string, LocalWorkoutSet[]>();
  for (const set of workoutSets) {
    const existing = setsByWorkoutExercise.get(set.workoutExerciseId) ?? [];
    existing.push(set);
    setsByWorkoutExercise.set(set.workoutExerciseId, existing);
  }

  const workoutMap = new Map<string, typeof workouts[0]>();
  for (const w of workouts) {
    workoutMap.set(w.localId, w);
  }

  const bestByExercise = new Map<string, { exerciseId: string; exerciseName: string; maxWeight: number; repsAtMax: number; date: Date }>();
  const exerciseCategories: Record<string, { id: string; name: string }> = {};

  for (const exercise of workoutExercises) {
    const sets = setsByWorkoutExercise.get(exercise.localId) ?? [];
    if (sets.length === 0) continue;

    const exerciseInfo = exerciseMap.get(exercise.exerciseId);
    if (!exerciseInfo) continue;

    const exerciseName = exerciseInfo.name;
    if (isSquat(exerciseName) && !exerciseCategories.squat) {
      exerciseCategories.squat = { id: exerciseInfo.id, name: exerciseName };
    }
    if (isBench(exerciseName) && !exerciseCategories.bench) {
      exerciseCategories.bench = { id: exerciseInfo.id, name: exerciseName };
    }
    if (isDeadlift(exerciseName) && !exerciseCategories.deadlift) {
      exerciseCategories.deadlift = { id: exerciseInfo.id, name: exerciseName };
    }
    if (isOverheadPress(exerciseName) && !exerciseCategories.ohp) {
      exerciseCategories.ohp = { id: exerciseInfo.id, name: exerciseName };
    }

    let maxWeight = 0;
    let repsAtMax = 1;
    for (const set of sets) {
      if (set.weight > maxWeight) {
        maxWeight = set.weight;
        repsAtMax = set.reps;
      } else if (set.weight === maxWeight && set.reps > repsAtMax) {
        repsAtMax = set.reps;
      }
    }

    const workout = workoutMap.get(exercise.workoutId);
    if (!workout) continue;

    const exerciseId = exerciseInfo.id?.toString() || exercise.exerciseId;
    const current = bestByExercise.get(exerciseId);
    if (!current || maxWeight > current.maxWeight) {
      bestByExercise.set(exerciseId, {
        exerciseId,
        exerciseName,
        maxWeight,
        repsAtMax,
        date: workout.startedAt,
      });
    }
  }

  for (const workout of workouts) {
    const oneRmEntries: Array<{ category: string; value: number | undefined | null }> = [
      { category: 'squat', value: workout.squat1rm },
      { category: 'bench', value: workout.bench1rm },
      { category: 'deadlift', value: workout.deadlift1rm },
      { category: 'ohp', value: workout.ohp1rm },
    ];

    for (const { category, value } of oneRmEntries) {
      if (!value || !exerciseCategories[category]) continue;
      const cat = exerciseCategories[category];
      const current = bestByExercise.get(cat.id);
      if (!current || value > current.maxWeight) {
        bestByExercise.set(cat.id, {
          exerciseId: cat.id,
          exerciseName: cat.name,
          maxWeight: value,
          repsAtMax: 1,
          date: workout.startedAt,
        });
      }
    }
  }

  const results: LocalPersonalRecord[] = [];
  for (const best of bestByExercise.values()) {
    results.push({
      id: `best-${best.exerciseId}`,
      exerciseId: best.exerciseId,
      exerciseName: best.exerciseName,
      date: best.date.toISOString().split('T')[0],
      weight: best.maxWeight,
      reps: best.repsAtMax,
    });
  }

  return results
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}
