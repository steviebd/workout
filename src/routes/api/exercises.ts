import { createFileRoute } from '@tanstack/react-router';
import { createExercise, getExercisesByWorkosId } from '../../lib/db/exercise';
import { validateBody, MAX_SEARCH_TERM_LENGTH } from '~/lib/api/route-helpers';
import { apiRoute, parseQueryParams } from '~/lib/api/handler';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';
import { createExerciseSchema } from '~/lib/validators';

export const Route = createFileRoute('/api/exercises')({
  server: {
    handlers: {
      GET: apiRoute('Get exercises', async ({ session, d1Db, request }) => {
        const url = new URL(request.url);
        const { search, muscleGroup, sortBy, sortOrder } = parseQueryParams<{
          search?: string;
          muscleGroup?: string;
          sortBy?: 'createdAt' | 'muscleGroup' | 'name';
          sortOrder?: 'ASC' | 'DESC';
        }>(url);

        if (search && search.length > MAX_SEARCH_TERM_LENGTH) {
          return createApiError('Search term too long', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }

        const exercises = await getExercisesByWorkosId(d1Db, session.sub, {
          search,
          muscleGroup,
          sortBy,
          sortOrder,
        });

        return Response.json(exercises);
      }),
      POST: apiRoute('Create exercise', async ({ session, d1Db, request }) => {
        const body = await validateBody(request, createExerciseSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
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
      }),
    },
  },
});

export default function ApiExercises() {
  return null;
}
