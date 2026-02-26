import { createFileRoute } from '@tanstack/react-router';
import { WorkOS } from '@workos-inc/node';
import { env } from 'cloudflare:workers';

function isLocalhost(request: Request): boolean {
  const url = new URL(request.url);
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

const {WORKOS_API_KEY, WORKOS_CLIENT_ID} = env as typeof env & { WORKOS_API_KEY?: string; WORKOS_CLIENT_ID?: string };

export const Route = createFileRoute('/auth/signin')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const workos = new WorkOS(WORKOS_API_KEY);
        const url = new URL(request.url);
        const redirectUri = `${url.origin}/api/auth/callback`;

        if (!WORKOS_CLIENT_ID) {
          throw new Error('WORKOS_CLIENT_ID is not configured');
        }

        const state = crypto.randomUUID();
        const isDev = isLocalhost(request);

        const authorizationUrl = workos.userManagement.getAuthorizationUrl({
          clientId: WORKOS_CLIENT_ID,
          redirectUri,
          provider: 'authkit',
          state,
        });

        const stateCookie = isDev
          ? `oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`
          : `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;

        return new Response(null, {
          status: 302,
          headers: {
            Location: authorizationUrl,
            'Set-Cookie': stateCookie,
          },
        });
      },
    },
  },
});

export default function SignIn() {
  return null;
}
