import { createFileRoute } from '@tanstack/react-router';
import { copyTemplate } from '../../lib/db/template';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';

export const Route = createFileRoute('/api/templates/$id/copy')({
  server: {
    handlers: {
        POST: async ({ request, params }) => {
          try {
            const { d1Db, session } = await withApiContext(request);

            const template = await copyTemplate(d1Db, params.id, session.sub);

            if (!template) {
              return createApiError('Template not found', 404, API_ERROR_CODES.NOT_FOUND);
            }

            return Response.json(template, { status: 201 });
          } catch (err) {
            console.error('Copy template error:', err);
            return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
          }
        },
    },
  },
});

export default function ApiTemplateCopy() {
  return null;
}
