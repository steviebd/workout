import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getTokenFromCookie, verifyToken } from '../../../lib/auth';

function createClearCookie(isDev: boolean): string {
  if (isDev) {
    return `session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
  }
  return `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export const Route = createFileRoute('/api/auth/signout')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { WORKOS_API_KEY, WORKOS_CLIENT_ID } = env as typeof env & {
          WORKOS_API_KEY?: string;
          WORKOS_CLIENT_ID?: string;
        };

        const url = new URL(request.url);
        const isDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        const clearCookie = createClearCookie(isDev);

        const cookieHeader = request.headers.get('Cookie');

        let token = getTokenFromCookie(cookieHeader, 'session');

        if (!token) {
          const authHeader = request.headers.get('Authorization');
          if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
          }
        }

        let workosLogoutUrl: string | null = null;

        if (token && WORKOS_API_KEY && WORKOS_CLIENT_ID) {
          try {
            const payload = await verifyToken(token);
            if (payload?.workosId) {
              try {
                await fetch('https://api.workos.com/user_management/sessions/revoke', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${WORKOS_API_KEY}`,
                  },
                  body: JSON.stringify({ session_id: payload.workosId }),
                });
              } catch (revokeErr) {
                console.warn('[/api/auth/signout] Failed to revoke WorkOS session:', revokeErr);
              }

              const logoutUrl = new URL('/user_management/sessions/logout', 'https://api.workos.com');
              logoutUrl.searchParams.set('session_id', payload.workosId);
              logoutUrl.searchParams.set('return_to', url.origin);
              workosLogoutUrl = logoutUrl.toString();
            }
          } catch (err) {
            console.error('[/api/auth/signout] Error:', err);
          }
        }

        const redirectTo = workosLogoutUrl ?? url.origin;

        return new Response(null, {
          status: 302,
          headers: {
            Location: redirectTo,
            'Set-Cookie': clearCookie,
            'Cache-Control': 'no-store',
          },
        });
      },
    },
  },
});

export default function ApiAuthSignout() {
  return null;
}
