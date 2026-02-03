import { createFileRoute } from '@tanstack/react-router';
import { WorkOS } from '@workos-inc/node';
import { getTokenFromCookie, verifyToken } from '../../../lib/auth';

const { WORKOS_API_KEY } = process.env;

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
        const cookieName = isDev ? 'session_token' : '__Host-session_token';
        const clearCookie = createClearCookie(cookieName, isDev);

        return new Response(null, {
          status: 302,
          headers: {
            'Set-Cookie': clearCookie,
            'Location': '/auth/signout',
          },
        });
      },
      POST: async ({ request }) => {
        console.log('[/api/auth/signout] Signout request received');
        const url = new URL(request.url);
        const isDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        const cookieName = isDev ? 'session_token' : '__Host-session_token';

        const cookieHeader = request.headers.get('Cookie');
        const token = getTokenFromCookie(cookieHeader, cookieName);
        let workosLogoutUrl: string | null = null;

        if (token && WORKOS_API_KEY) {
          try {
            const payload = await verifyToken(token);
            if (payload?.workosSessionId) {
              const workos = new WorkOS(WORKOS_API_KEY);
              workosLogoutUrl = workos.userManagement.getLogoutUrl({
                sessionId: payload.workosSessionId,
              });
              console.log('[/api/auth/signout] WorkOS logout URL generated');
            }
          } catch (err) {
            console.error('[/api/auth/signout] Error getting WorkOS logout URL:', err);
          }
        }

        const clearCookie = createClearCookie(cookieName, isDev);
        console.log('[/api/auth/signout] Clearing cookie:', clearCookie);

        return new Response(JSON.stringify({ success: true, logoutUrl: workosLogoutUrl }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': clearCookie,
          },
        });
      },
    },
  },
});

export default function ApiAuthSignout() {
  return null;
}
