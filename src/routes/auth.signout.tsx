import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { getTokenFromCookie, verifyToken } from '../lib/auth';
import { destroySessionResponse } from '../lib/session';
import { useAuth } from './__root';

export const Route = createFileRoute('/auth/signout')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cookieHeader = request.headers.get('Cookie');
        const token = getTokenFromCookie(cookieHeader, 'session_token');

        if (token) {
          const payload = await verifyToken(token);
          if (payload?.workosSessionId) {
            const signOutUrl = `https://api.workos.com/user_management/sessions/logout?session_id=${payload.workosSessionId}&return_to=${encodeURIComponent(request.url.split('?')[0])}`;
            const isLocalhost = new URL(request.url).hostname === 'localhost';
            const secure = isLocalhost ? '' : ' Secure';
            return new Response(null, {
              status: 302,
              headers: {
                'Set-Cookie': `session_token=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0`,
                'Location': signOutUrl,
              },
            });
          }
        }

        return destroySessionResponse(request, '/');
      },
    },
  },
});

export default function SignOut() {
  const { setUser } = useAuth();

  useEffect(() => {
    setUser(null);
  }, [setUser]);

  return null;
}
