import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { type UpdateExerciseData, getExerciseById, softDeleteExercise, updateExercise } from '../../lib/db/exercise';
import { requireAuth } from '~/lib/api/route-helpers';

export const Route = createFileRoute('/api/exercises/$id')({
  server: {
    handlers: {
        GET: async ({ request, params }) => {
          try {
            const session = await requireAuth(request);
            if (!session) {
              return Response.json({ error: 'Not authenticated' }, { status: 401 });
            }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           const exercise = await getExerciseById(db, params.id, session.sub);

          if (!exercise) {
            return Response.json({ error: 'Exercise not found' }, { status: 404 });
          }

          return Response.json(exercise);
        } catch (err) {
          console.error('Get exercise error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
        PUT: async ({ request, params }) => {
          try {
            const session = await requireAuth(request);
            if (!session) {
              return Response.json({ error: 'Not authenticated' }, { status: 401 });
            }

          const body = await request.json();
          const { name, muscleGroup, description } = body as UpdateExerciseData & { localId?: string };

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           const exercise = await updateExercise(db, params.id, session.sub, {
            name,
            muscleGroup,
            description,
          });

          if (!exercise) {
            return Response.json({ error: 'Exercise not found' }, { status: 404 });
          }

          return Response.json(exercise);
        } catch (err) {
          console.error('Update exercise error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
        DELETE: async ({ request, params }) => {
          try {
            const session = await requireAuth(request);
            if (!session) {
              return Response.json({ error: 'Not authenticated' }, { status: 401 });
            }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           const deleted = await softDeleteExercise(db, params.id, session.sub);

          if (!deleted) {
            return Response.json({ error: 'Exercise not found' }, { status: 404 });
          }

          return new Response(null, { status: 204 });
        } catch (err) {
          console.error('Delete exercise error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiExerciseId() {
  return null;
}
