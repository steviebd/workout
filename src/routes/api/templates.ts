import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { type CreateTemplateData, createTemplate, getTemplatesByWorkosId } from '../../lib/db/template';
import { getSession } from '../../lib/session';

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_NOTES_LENGTH = 2000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const Route = createFileRoute('/api/templates')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session?.sub) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const url = new URL(request.url);
          const search = url.searchParams.get('search') ?? undefined;
          const sortBy = url.searchParams.get('sortBy') as 'createdAt' | 'name' | undefined;
          const sortOrder = url.searchParams.get('sortOrder') as 'ASC' | 'DESC' | undefined;
          const limitParam = url.searchParams.get('limit');
          const limit = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;
          const page = parseInt(url.searchParams.get('page') ?? '1', 10);
          const offset = (page - 1) * limit;

          if (search && search.length > 100) {
            return Response.json({ error: 'Search term too long' }, { status: 400 });
          }

          if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
            return Response.json({ error: `Invalid limit (1-${MAX_LIMIT})` }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
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
            return Response.json({ error: 'Server error' }, { status: 500 });
         }
       },
       POST: async ({ request }) => {
         try {
           const session = await getSession(request);
           if (!session?.sub) {
             return Response.json({ error: 'Not authenticated' }, { status: 401 });
           }

           const body = await request.json();
           const { name, description, notes, localId } = body as CreateTemplateData & { localId?: string };

           if (!name || typeof name !== 'string') {
             return Response.json({ error: 'Name is required' }, { status: 400 });
           }

           if (name.length > MAX_NAME_LENGTH) {
             return Response.json({ error: `Name too long (max ${MAX_NAME_LENGTH} characters)` }, { status: 400 });
           }

           if (description && typeof description === 'string' && description.length > MAX_DESCRIPTION_LENGTH) {
             return Response.json({ error: `Description too long (max ${MAX_DESCRIPTION_LENGTH} characters)` }, { status: 400 });
           }

           if (notes && typeof notes === 'string' && notes.length > MAX_NOTES_LENGTH) {
             return Response.json({ error: `Notes too long (max ${MAX_NOTES_LENGTH} characters)` }, { status: 400 });
           }

           const db = (env as { DB?: D1Database }).DB;
           if (!db) {
             return Response.json({ error: 'Database not available' }, { status: 500 });
          }

            const template = await createTemplate(db, {
              workosId: session.sub,
             name: name.trim(),
             description: description?.trim(),
             notes: notes?.trim(),
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
