import { createFileRoute } from '@tanstack/react-router';
import { addExerciseToTemplate, getTemplateExercises } from '../../lib/db/template';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { validateBody } from '~/lib/api/route-helpers';
import { addExerciseToTemplateSchema } from '~/lib/validators';

export const Route = createFileRoute('/api/templates/$id/exercises')({
  server: {
    handlers: {
        GET: async ({ request, params }) => {
          try {
            const { db, session } = await withApiContext(request);

            const exercises = await getTemplateExercises(db, params.id, session.sub);

            return Response.json(exercises);
          } catch (err) {
            console.error('Get template exercises error:', err);
            return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
          }
        },
        POST: async ({ request, params }) => {
          try {
            const { d1Db } = await withApiContext(request);

            const body = await validateBody(request, addExerciseToTemplateSchema);
            if (!body) {
              return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
            }
            const { exerciseId, orderIndex } = body;

            await addExerciseToTemplate(
              d1Db,
              params.id,
              exerciseId,
              orderIndex ?? 0
            );

            return Response.json({ success: true }, { status: 201 });
          } catch (err) {
            console.error('Add exercise to template error:', err);
            return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
          }
        },
    },
  },
});

export default function ApiTemplateExercises() {
  return null;
}
