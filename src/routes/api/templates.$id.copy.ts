import { createFileRoute } from '@tanstack/react-router';
import { copyTemplate } from '../../lib/db/template';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { apiRouteWithParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/templates/$id/copy')({
  server: {
    handlers: {
      POST: apiRouteWithParams('Copy template', async ({ d1Db, session, params }) => {
        const template = await copyTemplate(d1Db, params.id, session.sub);

        if (!template) {
          return createApiError('Template not found', 404, API_ERROR_CODES.NOT_FOUND);
        }

        return Response.json(template, { status: 201 });
      }),
    },
  },
});

export default function ApiTemplateCopy() {
  return null;
}
