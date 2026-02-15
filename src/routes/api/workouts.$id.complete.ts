import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm';
import { completeWorkout, getWorkoutWithExercises, updateWorkout } from '../../lib/db/workout';
import { createDb } from '../../lib/db';
import { programCycleWorkouts } from '../../lib/db/schema';
import { markWorkoutComplete, getProgramCycleById } from '../../lib/db/program';
import { updateUserLastWorkout } from '../../lib/streaks';
import { withApiContext } from '../../lib/api/context';
import { createApiError, ApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { isSquat, isBench, isDeadlift, isOverheadPress } from '~/lib/exercise-categories';

interface LoggedExercise {
  id: string;
  name: string;
  sets: Array<{ isComplete: boolean | null; weight?: number | null }> | null | undefined;
}

function extractTested1RMs(exercises: LoggedExercise[]): { squat: number; bench: number; deadlift: number; ohp: number } {
  const tested = { squat: 0, bench: 0, deadlift: 0, ohp: 0 };
  
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

export const Route = createFileRoute('/api/workouts/$id/complete')({
  server: {
    handlers: {
       PUT: async ({ request, params }) => {
         try {
           const { session, d1Db } = await withApiContext(request);

          const drizzleDb = createDb(d1Db);

          const completed = await completeWorkout(d1Db, params.id, session.sub);

          if (!completed) {
            return createApiError('Workout not found', 404, API_ERROR_CODES.NOT_FOUND);
          }

          const workout = await getWorkoutWithExercises(d1Db, params.id, session.sub);

          if (!workout) {
            return createApiError('Workout not found', 404, API_ERROR_CODES.NOT_FOUND);
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
             const cycle = await getProgramCycleById(d1Db, workout.programCycleId, session.sub);
             if (cycle) {
               startingSquat1rm = cycle.startingSquat1rm ?? cycle.squat1rm;
               startingBench1rm = cycle.startingBench1rm ?? cycle.bench1rm;
               startingDeadlift1rm = cycle.startingDeadlift1rm ?? cycle.deadlift1rm;
               startingOhp1rm = cycle.startingOhp1rm ?? cycle.ohp1rm;
             }
           }

           if (completed.completedAt) {
             const workoutDate = completed.completedAt.split('T')[0];
             await updateUserLastWorkout(d1Db, session.sub, workoutDate);
           }

           if (cycleWorkoutId && cycleWorkoutCycleId) {
             await markWorkoutComplete(d1Db, cycleWorkoutId, cycleWorkoutCycleId, session.sub, params.id);
           }

           if (shouldUpdate1RMs) {
             await updateWorkout(d1Db, params.id, session.sub, {
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
            exerciseId: ex.exerciseId,
            name: ex.exercise?.name ?? 'Unknown Exercise',
            muscleGroup: ex.exercise?.muscleGroup ?? null,
            orderIndex: ex.orderIndex,
            notes: ex.notes,
            sets: ex.sets,
          }));

           const response = {
             ...workout,
             exercises,
             ...(shouldUpdate1RMs ? {
               squat1rm: tested1RMs.squat || null,
               bench1rm: tested1RMs.bench || null,
               deadlift1rm: tested1RMs.deadlift || null,
               ohp1rm: tested1RMs.ohp || null,
               startingSquat1rm,
               startingBench1rm,
               startingDeadlift1rm,
               startingOhp1rm,
             } : {}),
           };

           return Response.json(response, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
           });
         } catch (err) {
           if (err instanceof ApiError) {
             return createApiError(err.message, err.status, err.code);
           }
           console.error('Complete workout error:', err);
           return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
         }
      },
    },
  },
});

export default function ApiWorkoutComplete() {
  return null;
}
