import { createFileRoute } from '@tanstack/react-router';
import {
  type UpdateTemplateData,
  getTemplateWithExercises,
  softDeleteTemplate,
  updateTemplate
} from '../../lib/db/template';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';

export const Route = createFileRoute('/api/templates/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { session, db } = await withApiContext(request);

          const template = await getTemplateWithExercises(db, params.id, session.sub);

          if (!template) {
            return createApiError('Template not found', 404, API_ERROR_CODES.NOT_FOUND);
          }

          return Response.json(template);
        } catch (err) {
          console.error('Get template error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
      PUT: async ({ request, params }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

          const body = await request.json();
          const { name, description, notes } = body as UpdateTemplateData & { localId?: string };

          const template = await updateTemplate(d1Db, params.id, session.sub, {
            name,
            description,
            notes,
          });

          if (!template) {
            return createApiError('Template not found', 404, API_ERROR_CODES.NOT_FOUND);
          }

          return Response.json(template);
        } catch (err) {
          console.error('Update template error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

          const deleted = await softDeleteTemplate(d1Db, params.id, session.sub);

          if (!deleted) {
            return createApiError('Template not found', 404, API_ERROR_CODES.NOT_FOUND);
          }

          return new Response(null, { status: 204 });
        } catch (err) {
          console.error('Delete template error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
    },
  },
});

export default function ApiTemplateId() {
  return null;
}
