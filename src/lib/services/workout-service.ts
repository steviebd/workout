/**
 * Workout Service Layer
 *
 * Architecture:
 * - Repositories: Data access, CRUD, queries (src/lib/db/REPO/repository.ts)
 * - Services: Business logic, cross-cutting concerns, side effects (this file)
 *
 * This service coordinates between repositories and handles:
 * - Business rule validation
 * - Side effects (e.g., notifications, external integrations)
 * - Complex operations spanning multiple repositories
 */

import { eq } from 'drizzle-orm';
import { getDb, type DbOrTx } from '../db';
import { programCycleWorkouts } from '../db/schema';
import {
  completeWorkout as completeWorkoutRepo,
  getWorkoutWithExercises,
  updateWorkout as updateWorkoutRepo,
} from '../db/workout';
import { getTemplateExercises } from '../db/template';
import { markWorkoutComplete, getProgramCycleById } from '../db/program';
import { updateUserLastWorkout } from '../streaks';
import { extractTested1RMs } from '../utils/workout-calculations';
import type { WorkoutWithExercises, CreateWorkoutData } from '../db/workout/types';

export interface CreateWorkoutFromTemplateInput {
  name: string;
  templateId?: string;
  notes?: string;
  exerciseIds?: string[];
  localId?: string;
}

export async function createWorkoutFromTemplate(
  dbOrTx: DbOrTx,
  workosId: string,
  input: CreateWorkoutFromTemplateInput
): Promise<WorkoutWithExercises> {
  const { createWorkoutWithDetails } = await import('../db/workout');

  let exercisesToAdd: string[] = input.exerciseIds ?? [];

  if (exercisesToAdd.length === 0 && input.templateId) {
    const templateExercises = await getTemplateExercises(dbOrTx, input.templateId, workosId);
    exercisesToAdd = templateExercises.map((te) => te.exerciseId);
  }

  const workoutData: CreateWorkoutData & { workosId: string; exerciseIds: string[] } = {
    workosId,
    name: input.name.trim(),
    templateId: input.templateId,
    notes: input.notes?.trim(),
    exerciseIds: exercisesToAdd,
    localId: input.localId,
  };

  return createWorkoutWithDetails(dbOrTx, workoutData);
}

export interface CompleteWorkoutResult extends WorkoutWithExercises {
  squat1rm: number | null;
  bench1rm: number | null;
  deadlift1rm: number | null;
  ohp1rm: number | null;
  startingSquat1rm: number | null;
  startingBench1rm: number | null;
  startingDeadlift1rm: number | null;
  startingOhp1rm: number | null;
}

export async function completeWorkout(
  dbOrTx: DbOrTx,
  workoutId: string,
  workosId: string
): Promise<CompleteWorkoutResult | null> {
  const drizzleDb = getDb(dbOrTx);

  const completed = await completeWorkoutRepo(dbOrTx, workoutId, workosId);

  if (!completed) {
    return null;
  }

  const workout = await getWorkoutWithExercises(dbOrTx, workoutId, workosId);

  if (!workout) {
    return null;
  }

  let cycleWorkoutId: string | null = null;
  let cycleWorkoutCycleId: string | null = null;
  let is1RMTest = false;
  let tested1RMs = { squat: 0, bench: 0, deadlift: 0, ohp: 0 };

  if (workout.templateId) {
    const cycleWorkout = await drizzleDb
      .select()
      .from(programCycleWorkouts)
      .where(eq(programCycleWorkouts.templateId, workout.templateId))
      .get();

    if (cycleWorkout) {
      cycleWorkoutId = cycleWorkout.id;
      cycleWorkoutCycleId = cycleWorkout.cycleId;
    }
  }

  if (workout.name === '1RM Test') {
    is1RMTest = true;
    const exercises = workout.exercises.map((ex) => ({
      id: ex.id,
      exerciseId: ex.exerciseId,
      name: ex.exercise?.name ?? 'Unknown Exercise',
      muscleGroup: ex.exercise?.muscleGroup ?? null,
      orderIndex: ex.orderIndex,
      notes: ex.notes,
      sets: ex.sets,
    }));
    tested1RMs = extractTested1RMs(exercises);
  }

  const shouldUpdate1RMs = is1RMTest && (tested1RMs.squat || tested1RMs.bench || tested1RMs.deadlift || tested1RMs.ohp);

  let startingSquat1rm: number | null = null;
  let startingBench1rm: number | null = null;
  let startingDeadlift1rm: number | null = null;
  let startingOhp1rm: number | null = null;

  if (shouldUpdate1RMs && workout.programCycleId) {
    const cycle = await getProgramCycleById(dbOrTx, workout.programCycleId, workosId);
    if (cycle) {
      startingSquat1rm = cycle.startingSquat1rm ?? cycle.squat1rm;
      startingBench1rm = cycle.startingBench1rm ?? cycle.bench1rm;
      startingDeadlift1rm = cycle.startingDeadlift1rm ?? cycle.deadlift1rm;
      startingOhp1rm = cycle.startingOhp1rm ?? cycle.ohp1rm;
    }
  }

  if (completed.completedAt) {
    const workoutDate = completed.completedAt.split('T')[0];
    await updateUserLastWorkout(dbOrTx, workosId, workoutDate);
  }

  if (cycleWorkoutId && cycleWorkoutCycleId) {
    await markWorkoutComplete(dbOrTx, cycleWorkoutId, cycleWorkoutCycleId, workosId, workoutId);
  }

  if (shouldUpdate1RMs) {
    await updateWorkoutRepo(dbOrTx, workoutId, workosId, {
      squat1rm: tested1RMs.squat || null,
      bench1rm: tested1RMs.bench || null,
      deadlift1rm: tested1RMs.deadlift || null,
      ohp1rm: tested1RMs.ohp || null,
      startingSquat1rm,
      startingBench1rm,
      startingDeadlift1rm,
      startingOhp1rm,
    });
  }

  const exercises = workout.exercises.map((ex) => ({
    id: ex.id,
    localId: ex.localId,
    workoutId: ex.workoutId,
    exerciseId: ex.exerciseId,
    name: ex.exercise?.name ?? 'Unknown Exercise',
    muscleGroup: ex.exercise?.muscleGroup ?? null,
    orderIndex: ex.orderIndex,
    notes: ex.notes,
    isAmrap: ex.isAmrap,
    setNumber: ex.setNumber,
    sets: ex.sets,
  }));

  return {
    ...workout,
    exercises,
    ...(shouldUpdate1RMs
      ? {
          squat1rm: tested1RMs.squat || null,
          bench1rm: tested1RMs.bench || null,
          deadlift1rm: tested1RMs.deadlift || null,
          ohp1rm: tested1RMs.ohp || null,
          startingSquat1rm,
          startingBench1rm,
          startingDeadlift1rm,
          startingOhp1rm,
        }
      : {}),
  } as unknown as CompleteWorkoutResult;
}
