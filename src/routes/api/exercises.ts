import { createFileRoute } from '@tanstack/react-router';
import { createExercise, getExercisesByWorkosId } from '../../lib/db/exercise';
import { validateBody, MAX_SEARCH_TERM_LENGTH } from '~/lib/api/route-helpers';
import { withApiContext } from '~/lib/api/context';
import { createApiError, ApiError } from '~/lib/api/errors';
import { createExerciseSchema } from '~/lib/validators';

export const Route = createFileRoute('/api/exercises')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

          const url = new URL(request.url);
          const search = url.searchParams.get('search') ?? undefined;
          const muscleGroup = url.searchParams.get('muscleGroup') ?? undefined;
          const sortBy = url.searchParams.get('sortBy') as 'createdAt' | 'muscleGroup' | 'name' | undefined;
          const sortOrder = url.searchParams.get('sortOrder') as 'ASC' | 'DESC' | undefined;

          if (search && search.length > MAX_SEARCH_TERM_LENGTH) {
            return createApiError('Search term too long', 400, 'VALIDATION_ERROR');
          }

          const exercises = await getExercisesByWorkosId(d1Db, session.sub, {
            search,
            muscleGroup,
            sortBy,
            sortOrder,
          });

          return Response.json(exercises);
        } catch (err) {
          if (err instanceof ApiError) {
            return createApiError(err.message, err.status, err.code);
          }
          console.error('Get exercises error:', err);
          return createApiError('Server error', 500, 'SERVER_ERROR');
        }
      },
      POST: async ({ request }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

          const body = await validateBody(request, createExerciseSchema);
          if (!body) {
            return createApiError('Invalid request body', 400, 'VALIDATION_ERROR');
          }

          const { name, muscleGroup, description, localId, libraryId } = body;

          const exercise = await createExercise(d1Db, {
            workosId: session.sub,
            name: name.trim(),
            muscleGroup,
            description: description?.trim(),
            localId,
            libraryId,
          });

          return Response.json(exercise, { status: 201 });
        } catch (err) {
          if (err instanceof ApiError) {
            return createApiError(err.message, err.status, err.code);
          }
          console.error('Create exercise error:', err);
          return createApiError('Server error', 500, 'SERVER_ERROR');
        }
      },
    },
  },
});

export default function ApiExercises() {
  return null;
}
