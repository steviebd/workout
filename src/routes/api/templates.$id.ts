import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import {
  type UpdateTemplateData,
  getTemplateWithExercises,
  softDeleteTemplate,
  updateTemplate
} from '../../lib/db/template';
import { requireAuth } from '../../lib/api/route-helpers';

export const Route = createFileRoute('/api/templates/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const template = await getTemplateWithExercises(db, params.id, session.sub);

          if (!template) {
            return Response.json({ error: 'Template not found' }, { status: 404 });
          }

          return Response.json(template);
        } catch (err) {
          console.error('Get template error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
      PUT: async ({ request, params }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { name, description, notes } = body as UpdateTemplateData & { localId?: string };

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const template = await updateTemplate(db, params.id, session.sub, {
            name,
            description,
            notes,
          });

          if (!template) {
            return Response.json({ error: 'Template not found' }, { status: 404 });
          }

          return Response.json(template);
        } catch (err) {
          console.error('Update template error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const session = await requireAuth(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const deleted = await softDeleteTemplate(db, params.id, session.sub);

          if (!deleted) {
            return Response.json({ error: 'Template not found' }, { status: 404 });
          }

          return new Response(null, { status: 204 });
        } catch (err) {
          console.error('Delete template error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiTemplateId() {
  return null;
}
