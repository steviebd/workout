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
        console.log('[/api/auth/signout] Signout request received');
        const url = new URL(request.url);
        const isDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        const cookieName = isDev ? 'session_token' : '__Host-session_token';
        const clearCookie = createClearCookie(cookieName, isDev);

        const cookieHeader = request.headers.get('Cookie');
        const token = getTokenFromCookie(cookieHeader, cookieName);
        
        let workosLogoutUrl: string | null = null;

        if (token && WORKOS_API_KEY) {
          try {
            const payload = await verifyToken(token);
            console.log('[/api/auth/signout] Token payload:', JSON.stringify(payload));
            if (payload?.workosSessionId) {
              const workos = new WorkOS(WORKOS_API_KEY);
              workosLogoutUrl = workos.userManagement.getLogoutUrl({
                sessionId: payload.workosSessionId,
              });
              console.log('[/api/auth/signout] WorkOS logout URL:', workosLogoutUrl);
            }
          } catch (err) {
            console.error('[/api/auth/signout] Error:', err);
          }
        }

        // Return HTML page that clears cookies/storage and then redirects to WorkOS logout
        const redirectUrl = workosLogoutUrl ?? `${url.origin}/`;
        const html = `<!DOCTYPE html>
<html>
<head><title>Signing out...</title></head>
<body>
<script>
localStorage.removeItem('auth_user');
sessionStorage.clear();
window.location.href = "${redirectUrl}";
</script>
<noscript><meta http-equiv="refresh" content="0;url=${redirectUrl}"></noscript>
</body>
</html>`;

        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
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
