import { createFileRoute } from '@tanstack/react-router';
import { createTemplate, getTemplatesByWorkosId } from '../../lib/db/template';
import { validateBody } from '../../lib/api/route-helpers';
import { createTemplateSchema } from '../../lib/validators';
import { withApiContext } from '../../lib/api/context';
import { createApiError, API_ERROR_CODES } from '../../lib/api/errors';
import { parseQueryParams } from '~/lib/api/handler';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const Route = createFileRoute('/api/templates')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { session, db } = await withApiContext(request);

          const url = new URL(request.url);
          const { search, sortBy, sortOrder, limit: limitParam, page } = parseQueryParams<{
            search?: string;
            sortBy?: 'createdAt' | 'name';
            sortOrder?: 'ASC' | 'DESC';
            limit?: string;
            page?: string;
          }>(url);
          const limit = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;
          const pageNum = page ? parseInt(page, 10) : 1;
          const offset = (pageNum - 1) * limit;

          if (search && search.length > 100) {
            return createApiError('Search term too long', 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

          if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
            return createApiError(`Invalid limit (1-${MAX_LIMIT})`, 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

          const templates = await getTemplatesByWorkosId(db, session.sub, {
            search,
            sortBy,
            sortOrder,
            limit,
            offset,
          });

          return Response.json(templates);
        } catch (err) {
          console.error('Get templates error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
      POST: async ({ request }) => {
        try {
          const { session, d1Db } = await withApiContext(request);

          const body = await validateBody(request, createTemplateSchema);
          if (!body) {
            return createApiError('Invalid request body', 400, API_ERROR_CODES.VALIDATION_ERROR);
          }

          const template = await createTemplate(d1Db, {
            workosId: session.sub,
            name: body.name.trim(),
            description: body.description?.trim(),
            notes: body.notes?.trim(),
            localId: body.localId,
          });

          return Response.json(template, { status: 201 });
        } catch (err) {
          console.error('Create template error:', err);
          return createApiError('Server error', 500, API_ERROR_CODES.SERVER_ERROR);
        }
      },
    },
  },
});

export default function ApiTemplates() {
  return null;
}
