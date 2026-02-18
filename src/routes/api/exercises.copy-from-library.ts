import { createFileRoute } from '@tanstack/react-router';
import { copyExerciseFromLibrary } from '../../lib/db/exercise';
import { apiRoute } from '~/lib/api/handler';
import { createApiError, API_ERROR_CODES } from '~/lib/api/errors';
import { validateBody } from '~/lib/api/route-helpers';
import { copyExerciseFromLibrarySchema } from '~/lib/validators';

export const Route = createFileRoute('/api/exercises/copy-from-library')({
  server: {
    handlers: {
      POST: apiRoute('Copy exercise from library', async ({ d1Db, session, request }) => {
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
      }),
    },
  },
});

export default function ApiExercisesCopyFromLibrary() {
  return null;
}
