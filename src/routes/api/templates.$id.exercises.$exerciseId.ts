import { createFileRoute } from '@tanstack/react-router';
import { removeExerciseFromTemplate } from '../../lib/db/template';
import { withApiContext } from '../../lib/api/context';
import { createApiError } from '../../lib/api/errors';

interface Params {
  id: string;
  exerciseId: string;
}

export const Route = createFileRoute('/api/templates/$id/exercises/$exerciseId')({
  server: {
    handlers: {
        DELETE: async ({ request, params }) => {
          try {
            const { d1Db, session } = await withApiContext(request);

            const { id, exerciseId } = params as Params;

            const removed = await removeExerciseFromTemplate(
              d1Db,
              id,
              exerciseId,
              session.sub
            );

            if (!removed) {
              return createApiError('Template or exercise not found', 404, 'NOT_FOUND');
            }

            return new Response(null, { status: 204 });
          } catch (err) {
            console.error('Remove exercise from template error:', err);
            return createApiError('Server error', 500, 'SERVER_ERROR');
          }
        },
    },
  },
});

export default function ApiTemplateExerciseId() {
  return null;
}
