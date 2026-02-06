import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { createExercise, getExercisesByWorkosId } from '../../lib/db/exercise';
import { requireAuth, validateBody, MAX_SEARCH_TERM_LENGTH } from '~/lib/api/route-helpers';
import { createExerciseSchema } from '~/lib/validators';

export const Route = createFileRoute('/api/exercises')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const url = new URL(request.url);
          const search = url.searchParams.get('search') ?? undefined;
          const muscleGroup = url.searchParams.get('muscleGroup') ?? undefined;
          const sortBy = url.searchParams.get('sortBy') as 'createdAt' | 'muscleGroup' | 'name' | undefined;
          const sortOrder = url.searchParams.get('sortOrder') as 'ASC' | 'DESC' | undefined;

          if (search && search.length > MAX_SEARCH_TERM_LENGTH) {
            return Response.json({ error: 'Search term too long' }, { status: 400 });
          }

          const exercises = await getExercisesByWorkosId(db, session.sub, {
            search,
            muscleGroup,
            sortBy,
            sortOrder,
          });

          return Response.json(exercises);
        } catch (err) {
          console.error('Get exercises error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const body = await validateBody(request, createExerciseSchema);
          if (!body) {
            return Response.json({ error: 'Invalid request body' }, { status: 400 });
          }

          const { name, muscleGroup, description, localId, libraryId } = body;

          const exercise = await createExercise(db, {
            workosId: session.sub,
            name: name.trim(),
            muscleGroup,
            description: description?.trim(),
            localId,
            libraryId,
          });

          return Response.json(exercise, { status: 201 });
        } catch (err) {
          console.error('Create exercise error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiExercises() {
  return null;
}
