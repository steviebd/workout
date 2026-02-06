import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { type LibraryExercise, copyExerciseFromLibrary } from '../../lib/db/exercise';
import { requireAuth } from '~/lib/api/route-helpers';

export const Route = createFileRoute('/api/exercises/copy-from-library')({
  server: {
    handlers: {
        POST: async ({ request }) => {
          try {
            const session = await requireAuth(request);
            if (!session) {
              return Response.json({ error: 'Not authenticated' }, { status: 401 });
            }

          const body = await request.json();
          const { name, muscleGroup, description } = body as LibraryExercise;

          if (!name || !muscleGroup) {
            return Response.json({ error: 'Name and muscleGroup are required' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           const exercise = await copyExerciseFromLibrary(db, session.sub, {
            name,
            muscleGroup,
            description,
          });

          return Response.json(exercise, { status: 201 });
        } catch (err) {
          console.error('Copy exercise from library error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiExercisesCopyFromLibrary() {
  return null;
}
