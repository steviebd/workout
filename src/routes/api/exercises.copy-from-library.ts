import { createFileRoute } from '@tanstack/react-router';
import { type LibraryExercise, copyExerciseFromLibrary } from '../../lib/db/exercise';
import { withApiContext } from '../../lib/api/context';
import { createApiError } from '../../lib/api/errors';

export const Route = createFileRoute('/api/exercises/copy-from-library')({
  server: {
    handlers: {
        POST: async ({ request }) => {
          try {
            const { d1Db, session } = await withApiContext(request);

            const body = await request.json();
            const { name, muscleGroup, description } = body as LibraryExercise;

            if (!name || !muscleGroup) {
              return createApiError('Name and muscleGroup are required', 400, 'VALIDATION_ERROR');
            }

            const exercise = await copyExerciseFromLibrary(d1Db, session.sub, {
              name,
              muscleGroup,
              description,
            });

            return Response.json(exercise, { status: 201 });
          } catch (err) {
            console.error('Copy exercise from library error:', err);
            return createApiError('Server error', 500, 'SERVER_ERROR');
          }
        },
    },
  },
});

export default function ApiExercisesCopyFromLibrary() {
  return null;
}
