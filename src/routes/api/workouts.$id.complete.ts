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
import { getSession } from '../../lib/session';

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
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           const completed = await completeWorkout(db, params.id, session.workosId);

          if (!completed) {
            return Response.json({ error: 'Workout not found' }, { status: 404 });
          }

           if (completed.completedAt) {
             const workoutDate = completed.completedAt.split('T')[0];
             await updateUserLastWorkout(db, session.workosId, workoutDate);
           }

           const workout = await getWorkoutWithExercises(db, params.id, session.workosId);

          if (!workout) {
            return Response.json({ error: 'Workout not found' }, { status: 404 });
          }

          if (workout.templateId) {
            const drizzleDb = createDb(db);
            const cycleWorkout = await drizzleDb
              .select()
              .from(programCycleWorkouts)
              .where(eq(programCycleWorkouts.templateId, workout.templateId))
              .get();
            
            if (cycleWorkout) {
              await markWorkoutComplete(db, cycleWorkout.id, cycleWorkout.cycleId, session.workosId, params.id);
            }
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

          if (workout.name === '1RM Test') {
            const tested = extractTested1RMs(exercises);
            if (tested.squat || tested.bench || tested.deadlift || tested.ohp) {
              let startingSquat1rm: number | null = null;
              let startingBench1rm: number | null = null;
              let startingDeadlift1rm: number | null = null;
              let startingOhp1rm: number | null = null;
              
              if (workout.programCycleId) {
                const cycle = await getProgramCycleById(db, workout.programCycleId, session.workosId);
                if (cycle) {
                  startingSquat1rm = cycle.startingSquat1rm ?? cycle.squat1rm;
                  startingBench1rm = cycle.startingBench1rm ?? cycle.bench1rm;
                  startingDeadlift1rm = cycle.startingDeadlift1rm ?? cycle.deadlift1rm;
                  startingOhp1rm = cycle.startingOhp1rm ?? cycle.ohp1rm;
                }
              }
              
              await updateWorkout(db, params.id, session.workosId, {
                squat1rm: tested.squat || null,
                bench1rm: tested.bench || null,
                deadlift1rm: tested.deadlift || null,
                ohp1rm: tested.ohp || null,
                startingSquat1rm,
                startingBench1rm,
                startingDeadlift1rm,
                startingOhp1rm,
              });
              Object.assign(workout, {
                squat1rm: tested.squat || null,
                bench1rm: tested.bench || null,
                deadlift1rm: tested.deadlift || null,
                ohp1rm: tested.ohp || null,
                startingSquat1rm,
                startingBench1rm,
                startingDeadlift1rm,
                startingOhp1rm,
              });
            }
          }

          const response = {
            ...workout,
            exercises,
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
