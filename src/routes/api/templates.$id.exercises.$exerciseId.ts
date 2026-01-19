import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getSession } from '../../lib/session';
import { removeExerciseFromTemplate } from '../../lib/db/template';

interface Params {
  id: string;
  exerciseId: string;
}

export const Route = createFileRoute('/api/templates/$id/exercises/$exerciseId')({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const { id, exerciseId } = params as Params;

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const removed = await removeExerciseFromTemplate(
            db,
            id,
            exerciseId,
            session.userId
          );

          if (!removed) {
            return Response.json({ error: 'Template or exercise not found' }, { status: 404 });
          }

          return new Response(null, { status: 204 });
        } catch (err) {
          console.error('Remove exercise from template error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiTemplateExerciseId() {
  return null;
}
