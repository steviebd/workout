/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { addExerciseToTemplate, getTemplateExercises } from '../../lib/db/template';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/templates/$id/exercises')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const exercises = await getTemplateExercises(db, params.id, session.userId);

          return Response.json(exercises);
        } catch (err) {
          console.error('Get template exercises error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
      POST: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { exerciseId, orderIndex } = body as { exerciseId: string; orderIndex: number };

          if (!exerciseId) {
            return Response.json({ error: 'Exercise ID is required' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const templateExercise = await addExerciseToTemplate(
            db,
            params.id,
            exerciseId,
            orderIndex ?? 0
          );

          return Response.json(templateExercise, { status: 201 });
        } catch (err) {
          console.error('Add exercise to template error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiTemplateExercises() {
  return null;
}
