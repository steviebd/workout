import { createFileRoute } from '@tanstack/react-router';
import { WorkOS } from '@workos-inc/node';
import { env } from 'cloudflare:workers';
import { getTokenFromCookie, verifyToken } from '../../../lib/auth';

const {WORKOS_API_KEY, WORKOS_CLIENT_ID} = env as typeof env & { WORKOS_API_KEY?: string; WORKOS_CLIENT_ID?: string };

function createClearCookie(cookieName: string, isDev: boolean): string {
  if (isDev) {
    return `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
  }
  return `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export const Route = createFileRoute('/api/auth/signout')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const isDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        const cookieName = isDev ? 'session' : '__Host-session';
        const clearCookie = createClearCookie(cookieName, isDev);

        const cookieHeader = request.headers.get('Cookie');
        
        let token = getTokenFromCookie(cookieHeader, cookieName);
        
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
              const workos = new WorkOS(WORKOS_API_KEY, { clientId: WORKOS_CLIENT_ID });
              
              try {
                await workos.userManagement.revokeSession({
                  sessionId: payload.workosId,
                });
              } catch (revokeErr) {
                console.warn('[/api/auth/signout] Failed to revoke WorkOS session:', revokeErr);
              }
              
              workosLogoutUrl = workos.userManagement.getLogoutUrl({
                sessionId: payload.workosId,
                returnTo: url.origin,
              });
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
