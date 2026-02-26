import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';

function isLocalhost(request: Request): boolean {
  const url = new URL(request.url);
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

export const Route = createFileRoute('/auth/signin')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { WORKOS_CLIENT_ID } = env as typeof env & { WORKOS_CLIENT_ID?: string };

        if (!WORKOS_CLIENT_ID) {
          throw new Error('WORKOS_CLIENT_ID is not configured');
        }

        const url = new URL(request.url);
        const redirectUri = `${url.origin}/api/auth/callback`;
        const state = crypto.randomUUID();
        const isDev = isLocalhost(request);

        const params = new URLSearchParams({
          client_id: WORKOS_CLIENT_ID,
          redirect_uri: redirectUri,
          response_type: 'code',
          provider: 'authkit',
          state,
        });

        const authorizationUrl = `https://api.workos.com/user_management/authorize?${params.toString()}`;

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
