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
import { completeWorkout, getWorkoutWithExercises } from '../../lib/db/workout';
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

          const completed = await completeWorkout(db, params.id, session.userId);

          if (!completed) {
            return Response.json({ error: 'Workout not found' }, { status: 404 });
          }

          const workout = await getWorkoutWithExercises(db, params.id, session.userId);

          if (!workout) {
            return Response.json({ error: 'Workout not found' }, { status: 404 });
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
          const errorMessage = err instanceof Error ? err.message : String(err);
          return Response.json({ error: 'Server error', details: errorMessage }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiWorkoutComplete() {
  return null;
}
