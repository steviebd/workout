import { createFileRoute } from '@tanstack/react-router';
import { copyExerciseFromLibrary } from '../../lib/db/exercise';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { validateBody } from '~/lib/api/route-helpers';
import { copyExerciseFromLibrarySchema } from '~/lib/validators';

export const Route = createFileRoute('/api/exercises/copy-from-library')({
  server: {
    handlers: {
        POST: async ({ request }) => {
          try {
            const { d1Db, session } = await withApiContext(request);

            const body = await validateBody(request, copyExerciseFromLibrarySchema);
            if (!body) {
              return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
            }
            const { name, muscleGroup, description } = body;

            if (!name || !muscleGroup) {
              return createApiError('Name and muscleGroup are required', 400, API_ERROR_CODES.VALIDATION_ERROR);
            }

            const exercise = await copyExerciseFromLibrary(d1Db, session.sub, {
              name,
              muscleGroup,
              description: description ?? '',
            });

            return Response.json(exercise, { status: 201 });
          } catch (err) {
            console.error('Copy exercise from library error:', err);
            return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
          }
        },
    },
  },
});

export default function ApiExercisesCopyFromLibrary() {
  return null;
}
