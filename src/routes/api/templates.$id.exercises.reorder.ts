import { createFileRoute } from '@tanstack/react-router';
import { type ExerciseOrder, reorderTemplateExercises } from '../../lib/db/template';
import { withApiContext } from '../../lib/api/context';
import { createApiError } from '../../lib/api/errors';

export const Route = createFileRoute('/api/templates/$id/exercises/reorder')({
  server: {
    handlers: {
        PUT: async ({ request, params }) => {
          try {
            const { db, session } = await withApiContext(request);

            const body = await request.json();
            const { exerciseOrders } = body as { exerciseOrders: ExerciseOrder[] };

            if (!exerciseOrders || !Array.isArray(exerciseOrders)) {
              return createApiError('exerciseOrders array is required', 400, 'VALIDATION_ERROR');
            }

            const reordered = await reorderTemplateExercises(
              db,
              params.id,
              exerciseOrders,
              session.sub
            );

            if (!reordered) {
              return createApiError('Template not found', 404, 'NOT_FOUND');
            }

            return new Response(null, { status: 204 });
          } catch (err) {
            console.error('Reorder template exercises error:', err);
            return createApiError('Server error', 500, 'SERVER_ERROR');
          }
        },
    },
  },
});

export default function ApiTemplateExercisesReorder() {
  return null;
}
