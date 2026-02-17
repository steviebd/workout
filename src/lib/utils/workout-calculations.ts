import { isSquat, isBench, isDeadlift, isOverheadPress } from '../exercise-categories';

export interface LoggedExercise {
  id: string;
  name: string;
  sets: Array<{ isComplete: boolean | null; weight?: number | null }> | null | undefined;
}

export interface Tested1RMs {
  squat: number;
  bench: number;
  deadlift: number;
  ohp: number;
}

/**
 * Extracts the maximum tested 1RM values for major compound lifts from a list of exercises.
 * 
 * This is pure calculation logic - it scans through completed sets and finds the heaviest
 * weight lifted for each major lift category (squat, bench, deadlift, overhead press).
 * 
 * @param exercises - Array of logged exercises with their sets
 * @returns Object containing the maximum weight found for each lift category
 */
export function extractTested1RMs(exercises: LoggedExercise[]): Tested1RMs {
  const tested: Tested1RMs = { squat: 0, bench: 0, deadlift: 0, ohp: 0 };

  for (const exercise of exercises) {
    const name = exercise.name.toLowerCase();
    for (const set of exercise.sets ?? []) {
      if (set.isComplete && set.weight) {
        if (isSquat(name) && set.weight > tested.squat) {
          tested.squat = set.weight;
        } else if (isBench(name) && set.weight > tested.bench) {
          tested.bench = set.weight;
        } else if (isDeadlift(name) && set.weight > tested.deadlift) {
          tested.deadlift = set.weight;
        } else if (isOverheadPress(name) && set.weight > tested.ohp) {
          tested.ohp = set.weight;
        }
      }
    }
  }

  return tested;
}
