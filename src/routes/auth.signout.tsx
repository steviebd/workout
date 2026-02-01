import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { getTokenFromCookie, verifyToken } from '../lib/auth';
import { destroySessionResponse } from '../lib/session';
import { useAuth } from './__root';

function isLocalhost(request: Request): boolean {
  const url = new URL(request.url);
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

function getSessionCookieName(isDev: boolean): string {
  return isDev ? 'session_token' : '__Host-session_token';
}

export const Route = createFileRoute('/auth/signout')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const isDev = isLocalhost(request);
        const cookieName = getSessionCookieName(isDev);
        const cookieHeader = request.headers.get('Cookie');
        const token = getTokenFromCookie(cookieHeader, cookieName);

        if (token) {
          const payload = await verifyToken(token);
          if (payload?.workosSessionId) {
            const signOutUrl = `https://api.workos.com/user_management/sessions/logout?session_id=${payload.workosSessionId}&return_to=${encodeURIComponent(request.url.split('?')[0])}`;
            const clearCookie = isDev
              ? `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
              : `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
            return new Response(null, {
              status: 302,
              headers: {
                'Set-Cookie': clearCookie,
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
