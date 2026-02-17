import { createFileRoute } from '@tanstack/react-router';
import { WorkOS } from '@workos-inc/node';
import { getTokenFromCookie, verifyToken } from '../../../lib/auth';

const WORKOS_API_KEY = process.env.WORKOS_API_KEY as string | undefined;
const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID as string | undefined;

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

        // If we have a WorkOS logout URL, redirect there; otherwise redirect to home
        // Use an intermediate HTML page to clear localStorage/sessionStorage before redirecting
        // This prevents the browser back button from restoring cached auth state
        if (workosLogoutUrl) {
          const html = `<!DOCTYPE html>
<html>
<head>
  <title>Signing out...</title>
</head>
<body>
<p>Signing out...</p>
<script>
  // Clear localStorage and sessionStorage before redirecting to WorkOS
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch(e) {}
  // Use replace to prevent back button from returning to this page
  window.location.replace(${JSON.stringify(workosLogoutUrl)});
</script>
</body>
</html>`;

          return new Response(html, {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
              'Set-Cookie': clearCookie,
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
          });
        }

        // No WorkOS session - just redirect to home with cookie cleared
        // Use meta refresh to force a hard page reload to clear any SPA state
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${url.origin}/">
  <title>Signed out</title>
</head>
<body>
<p>You have been signed out. <a href="${url.origin}/">Click here</a> to continue.</p>
<script>
  // Clear localStorage and sessionStorage before navigating
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch(e) {}
  // Force hard navigation
  window.location.replace("${url.origin}/");
</script>
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
