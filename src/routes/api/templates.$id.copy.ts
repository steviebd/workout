import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { copyTemplate } from '../../lib/db/template';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/templates/$id/copy')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const template = await copyTemplate(db, params.id, session.userId);

          if (!template) {
            return Response.json({ error: 'Template not found' }, { status: 404 });
          }

          return Response.json(template, { status: 201 });
        } catch (err) {
          console.error('Copy template error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiTemplateCopy() {
  return null;
}
