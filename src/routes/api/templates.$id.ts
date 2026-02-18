import { createFileRoute } from '@tanstack/react-router';
import {
  getTemplateWithExercises,
  softDeleteTemplate,
  updateTemplate
} from '../../lib/db/template';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { validateBody } from '~/lib/api/route-helpers';
import { updateTemplateSchema } from '~/lib/validators';
import { apiRouteWithParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/templates/$id')({
  server: {
    handlers: {
      GET: apiRouteWithParams('Get template', async ({ session, db, params }) => {
        const template = await getTemplateWithExercises(db, params.id, session.sub);

        if (!template) {
          return createApiError('Template not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return Response.json(template);
      }),
      PUT: apiRouteWithParams('Update template', async ({ session, d1Db, params, request }) => {
        const body = await validateBody(request, updateTemplateSchema);
        if (!body) {
          return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
        }
        const { name, description, notes } = body;

        const template = await updateTemplate(d1Db, params.id, session.sub, {
          name,
          description,
          notes,
        });

        if (!template) {
          return createApiError('Template not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return Response.json(template);
      }),
      DELETE: apiRouteWithParams('Delete template', async ({ session, d1Db, params }) => {
        const deleted = await softDeleteTemplate(d1Db, params.id, session.sub);

        if (!deleted) {
          return createApiError('Template not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return new Response(null, { status: 204 });
      }),
    },
  },
});

export default function ApiTemplateId() {
  return null;
}
