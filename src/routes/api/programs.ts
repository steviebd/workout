import { createFileRoute } from '@tanstack/react-router';
import { getAllPrograms, getProgramBySlug } from '~/lib/programs';
import { parseQueryParams } from '~/lib/api/handler';

export const Route = createFileRoute('/api/programs')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const { slug } = parseQueryParams<{
          slug?: string;
        }>(url);

        if (slug) {
          const program = getProgramBySlug(slug);
          if (!program) {
            return Response.json({ error: 'Program not found' }, { status: 404 });
          }
          return Response.json(program);
        }

        const programs = getAllPrograms();
        return Response.json(programs);
      },
    },
  },
});

export default function ApiPrograms() {
  return null;
}
