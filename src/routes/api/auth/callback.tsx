import { createFileRoute } from '@tanstack/react-router';
import { WorkOS } from '@workos-inc/node';
import { env } from 'cloudflare:workers';
import { createToken, extractSessionIdFromAccessToken } from '../../../lib/auth';
import { getOrCreateUser } from '../../../lib/db/user';
import { createSessionResponse } from '../../../lib/session';

function getStateFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const stateCookie = cookies.find(c => c.startsWith('oauth_state='));
  if (!stateCookie) return null;
  return stateCookie.split('=')[1];
}

const {WORKOS_API_KEY} = process.env;
const {WORKOS_CLIENT_ID} = process.env;

export const Route = createFileRoute('/api/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (!code) {
          return new Response(null, {
            status: 302,
            headers: { Location: '/?error=no_code' },
          });
        }

        const storedState = getStateFromCookie(request.headers.get('Cookie'));
        if (!state || !storedState || state !== storedState) {
          console.error('OAuth state mismatch or missing');
          return new Response(null, {
            status: 302,
            headers: { Location: '/?error=invalid_state' },
          });
        }

        try {
          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            console.error('Database not available in auth callback');
            return new Response(null, {
              status: 302,
              headers: { Location: '/?error=db_unavailable' },
            });
          }

          if (!WORKOS_API_KEY || !WORKOS_CLIENT_ID) {
            console.error('WorkOS configuration missing');
            return new Response(null, {
              status: 302,
              headers: { Location: '/?error=config_missing' },
            });
          }

          const workos = new WorkOS(WORKOS_API_KEY);
          const { user, accessToken } = await workos.userManagement.authenticateWithCode({
            code,
            clientId: WORKOS_CLIENT_ID,
          });

          await getOrCreateUser(db, {
            id: user.id,
            email: user.email,
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
          });

          const workosSessionId = extractSessionIdFromAccessToken(accessToken) ?? undefined;

          const token = await createToken(
            {
              id: user.id,
              email: user.email,
              firstName: user.firstName ?? '',
              lastName: user.lastName ?? '',
            },
            workosSessionId
          );

          return createSessionResponse(token, request, '/');
        } catch (err) {
          console.error('Auth callback error:', err);
          return new Response(null, {
            status: 302,
            headers: { Location: '/?error=auth_failed' },
          });
        }
      },
    },
  },
});

export default function ApiCallback() {
  return null;
}
