import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { type CreateTemplateData, createTemplate, getTemplatesByWorkosId } from '../../lib/db/template';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/templates')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const url = new URL(request.url);
          const search = url.searchParams.get('search') ?? undefined;
          const sortBy = url.searchParams.get('sortBy') as 'createdAt' | 'name' | undefined;
          const sortOrder = url.searchParams.get('sortOrder') as 'ASC' | 'DESC' | undefined;
          const page = parseInt(url.searchParams.get('page') ?? '1', 10);
          const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
          const offset = (page - 1) * limit;

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           const templates = await getTemplatesByWorkosId(db, session.workosId, {
            search,
            sortBy,
            sortOrder,
            limit,
            offset,
          });

           return Response.json(templates);
         } catch (err) {
           console.error('Get templates error:', err);
           return Response.json({ error: 'Server error' }, { status: 500 });
         }
       },
       POST: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { name, description, notes, localId } = body as CreateTemplateData & { localId?: string };

          if (!name) {
            return Response.json({ error: 'Name is required' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

           const template = await createTemplate(db, {
             workosId: session.workosId,
            name,
            description,
            notes,
            localId,
          });

           return Response.json(template, { status: 201 });
         } catch (err) {
           console.error('Create template error:', err);
           return Response.json({ error: 'Server error' }, { status: 500 });
         }
       },
    },
  },
});

export default function ApiTemplates() {
  return null;
}
