import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '../../../lib/api/route-helpers';

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireAuth(request);
          
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }
          return Response.json({
            id: session.sub,
            email: session.email,
            name: session.email.split('@')[0],
          });
        } catch (err) {
          console.error('Auth me error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiAuthMe() {
  return null;
}
