import { createFileRoute } from '@tanstack/react-router';
import { getSession } from '../../lib/session';

export const Route = createFileRoute('/api/progress')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSession(request);
        if (!session) {
          return Response.json({ error: 'Not authenticated' }, { status: 401 });
        }

        return Response.json(
          {
            error: 'Deprecated',
            message: 'This endpoint is deprecated. Use /api/progress/strength, /api/progress/volume, and /api/progress/prs instead.',
          },
          { status: 410 }
        );
      },
    },
  },
});

export default function ApiProgress() {
  return null;
}
