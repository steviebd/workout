import { createFileRoute } from '@tanstack/react-router'
interface LoggedExercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  sets: Array<{ isComplete: boolean | null }> | null | undefined;
}

interface LoggedSet {
  isComplete: boolean | null;
}
import { env } from 'cloudflare:workers';
import {
  type UpdateWorkoutData,
  deleteWorkout,
  getWorkoutWithExercises,
  updateWorkout
} from '../../lib/db/workout';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/workouts/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session?.workosId) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

            const workout = await getWorkoutWithExercises(db, params.id, session.sub);

           if (!workout) {
             console.log('API: Workout not found for id:', params.id, 'workosId:', session.sub);
             return Response.json({ error: 'Workout not found' }, { status: 404 });
           }

             console.log('API: Workout found:', {
               workoutId: workout.id,
               workoutWorkosId: workout.workosId,
               requestWorkosId: session.sub,
               match: workout.workosId === session.sub,
             });

          const response = {
            ...workout,
            exercises: workout.exercises.map(ex => ({
              id: ex.id,
              exerciseId: ex.exerciseId,
              name: ex.exercise?.name ?? 'Unknown Exercise',
              muscleGroup: ex.exercise?.muscleGroup ?? null,
              orderIndex: ex.orderIndex,
              notes: ex.notes,
              sets: ex.sets,
            })),
          };

          console.log('GET /api/workouts/:id returning:', {
            id: response.id,
            name: response.name,
            completedAt: response.completedAt,
            startedAt: response.startedAt,
            exercisesCount: response.exercises.length,
            exercises: response.exercises.map((e: LoggedExercise) => ({
              id: e.id,
              name: e.name,
              muscleGroup: e.muscleGroup,
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
          console.error('Get workout error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
      PUT: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session?.workosId) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { name, notes, completedAt } = body as UpdateWorkoutData & { localId?: string };

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           const workout = await updateWorkout(db, params.id, session.sub, {
            name,
            notes,
            completedAt,
          });

          if (!workout) {
            return Response.json({ error: 'Workout not found' }, { status: 404 });
          }

           return Response.json(workout);
         } catch (err) {
           console.error('Update workout error:', err);
           return Response.json({ error: 'Server error' }, { status: 500 });
         }
       },
       DELETE: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session?.workosId) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           const deleted = await deleteWorkout(db, params.id, session.sub);

          if (!deleted) {
            return Response.json({ error: 'Workout not found' }, { status: 404 });
          }

           return new Response(null, { status: 204 });
         } catch (err) {
           console.error('Delete workout error:', err);
           return Response.json({ error: 'Server error' }, { status: 500 });
         }
       },
    },
  },
});

export default function ApiWorkoutId() {
  return null;
}
