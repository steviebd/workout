import { createFileRoute } from '@tanstack/react-router'
interface LoggedExercise {
  id: string;
  name: string;
  sets: Array<{ isComplete: boolean | null }> | null | undefined;
}

interface LoggedSet {
  isComplete: boolean | null;
}
import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { completeWorkout, getWorkoutWithExercises } from '../../lib/db/workout';
import { createDb } from '../../lib/db';
import { programCycleWorkouts } from '../../lib/db/schema';
import { markWorkoutComplete } from '../../lib/db/program';
import { updateStreakAfterWorkout } from '../../lib/streaks';
import { getSession } from '../../lib/session';

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
            await updateStreakAfterWorkout(db, session.workosId, completed.completedAt);
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

          const response = {
            ...workout,
            exercises: workout.exercises.map((ex) => ({
              id: ex.id,
              exerciseId: ex.exerciseId,
              name: ex.exercise?.name ?? 'Unknown Exercise',
              muscleGroup: ex.exercise?.muscleGroup ?? null,
              orderIndex: ex.orderIndex,
              notes: ex.notes,
              sets: ex.sets,
            })),
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
