import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { type ExerciseOrder, reorderTemplateExercises } from '../../lib/db/template';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/templates/$id/exercises/reorder')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { exerciseOrders } = body as { exerciseOrders: ExerciseOrder[] };

          if (!exerciseOrders || !Array.isArray(exerciseOrders)) {
            return Response.json({ error: 'exerciseOrders array is required' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const reordered = await reorderTemplateExercises(
            db,
            params.id,
            exerciseOrders,
            session.userId
          );

          if (!reordered) {
            return Response.json({ error: 'Template not found' }, { status: 404 });
          }

          return new Response(null, { status: 204 });
        } catch (err) {
          console.error('Reorder template exercises error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiTemplateExercisesReorder() {
  return null;
}
