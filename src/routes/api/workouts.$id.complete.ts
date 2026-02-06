import { createFileRoute } from '@tanstack/react-router'
interface LoggedExercise {
  id: string;
  name: string;
  sets: Array<{ isComplete: boolean | null; weight?: number | null }> | null | undefined;
}

interface LoggedSet {
  isComplete: boolean | null;
  weight?: number | null;
}
import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { completeWorkout, getWorkoutWithExercises, updateWorkout } from '../../lib/db/workout';
import { createDb } from '../../lib/db';
import { programCycleWorkouts } from '../../lib/db/schema';
import { markWorkoutComplete, getProgramCycleById } from '../../lib/db/program';
import { updateUserLastWorkout } from '../../lib/streaks';
import { requireAuth } from '~/lib/api/route-helpers';

function extractTested1RMs(exercises: LoggedExercise[]): { squat: number; bench: number; deadlift: number; ohp: number } {
  const tested = { squat: 0, bench: 0, deadlift: 0, ohp: 0 };
  
  for (const exercise of exercises) {
    const name = exercise.name.toLowerCase();
    for (const set of exercise.sets ?? []) {
      if (set.isComplete && set.weight) {
        if (name.includes('squat') && set.weight > tested.squat) {
          tested.squat = set.weight;
        } else if ((name.includes('bench') || name === 'bench press') && set.weight > tested.bench) {
          tested.bench = set.weight;
        } else if (name.includes('deadlift') && set.weight > tested.deadlift) {
          tested.deadlift = set.weight;
        } else if ((name.includes('overhead') || name.includes('ohp') || name === 'overhead press') && set.weight > tested.ohp) {
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
           const session = await requireAuth(request);
           if (!session) {
             return Response.json({ error: 'Not authenticated' }, { status: 401 });
           }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const drizzleDb = createDb(db);

          const completed = await completeWorkout(db, params.id, session.sub);

          if (!completed) {
            return Response.json({ error: 'Workout not found' }, { status: 404 });
          }

          const workout = await getWorkoutWithExercises(db, params.id, session.sub);

          if (!workout) {
            return Response.json({ error: 'Workout not found' }, { status: 404 });
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
            const cycle = await getProgramCycleById(db, workout.programCycleId, session.sub);
            if (cycle) {
              startingSquat1rm = cycle.startingSquat1rm ?? cycle.squat1rm;
              startingBench1rm = cycle.startingBench1rm ?? cycle.bench1rm;
              startingDeadlift1rm = cycle.startingDeadlift1rm ?? cycle.deadlift1rm;
              startingOhp1rm = cycle.startingOhp1rm ?? cycle.ohp1rm;
            }
          }

          if (completed.completedAt) {
            const workoutDate = completed.completedAt.split('T')[0];
            await updateUserLastWorkout(db, session.sub, workoutDate);
          }

          if (cycleWorkoutId && cycleWorkoutCycleId) {
            await markWorkoutComplete(db, cycleWorkoutId, cycleWorkoutCycleId, session.sub, params.id);
          }

          if (shouldUpdate1RMs) {
            await updateWorkout(db, params.id, session.sub, {
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

          console.log('Workout completed with data:', {
            id: response.id,
            name: response.name,
            completedAt: response.completedAt,
            exercisesCount: response.exercises.length,
            exercises: response.exercises.map((e: LoggedExercise) => ({
              id: e.id,
              name: e.name,
              sets: e.sets,
              setsCount: e.sets?.length ?? 0,
              completedSetsCount: e.sets?.filter((s: LoggedSet) => s.isComplete).length ?? 0
            }))
          });

          return Response.json(response, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
          });
        } catch (err) {
          console.error('Complete workout error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWorkoutComplete() {
  return null;
}
