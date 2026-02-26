import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { createToken, extractSessionIdFromAccessToken, createSessionResponse } from '~/lib/auth';
import { getOrCreateUser } from '~/lib/db/user';

function getStateFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const stateCookie = cookies.find(c => c.startsWith('oauth_state='));
  if (!stateCookie) return null;
  return stateCookie.split('=')[1];
}

function createErrorRedirect(error: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: `/?error=${error}` },
  });
}

interface WorkOSAuthResponse {
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  access_token: string;
}

export const Route = createFileRoute('/api/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { WORKOS_API_KEY, WORKOS_CLIENT_ID } = env as typeof env & {
          WORKOS_API_KEY?: string;
          WORKOS_CLIENT_ID?: string;
        };

        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (!code) {
          return createErrorRedirect('no_code');
        }

        const storedState = getStateFromCookie(request.headers.get('Cookie'));
        if (!state || !storedState || state !== storedState) {
          console.error('OAuth state mismatch or missing');
          return createErrorRedirect('invalid_state');
        }

        try {
          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            console.error('Database not available in auth callback');
            return createErrorRedirect('db_unavailable');
          }

          if (!WORKOS_API_KEY || !WORKOS_CLIENT_ID) {
            console.error('WorkOS configuration missing');
            return createErrorRedirect('config_missing');
          }

          const authResponse = await fetch('https://api.workos.com/user_management/authenticate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${WORKOS_API_KEY}`,
            },
            body: JSON.stringify({
              grant_type: 'authorization_code',
              client_id: WORKOS_CLIENT_ID,
              client_secret: WORKOS_API_KEY,
              code,
            }),
          });

          if (!authResponse.ok) {
            const errorText = await authResponse.text();
            console.error('WorkOS authenticate failed:', authResponse.status, errorText);
            return createErrorRedirect('auth_failed');
          }

          const data = (await authResponse.json()) as WorkOSAuthResponse;
          const user = {
            id: data.user.id,
            email: data.user.email,
            firstName: data.user.first_name ?? '',
            lastName: data.user.last_name ?? '',
          };

          await getOrCreateUser(db, user);

          const workosSessionId = extractSessionIdFromAccessToken(data.access_token) ?? undefined;

          const token = await createToken(user, workosSessionId);

          return createSessionResponse(token, request, '/');
        } catch (err) {
          console.error('Auth callback error:', err);
          return createErrorRedirect('auth_failed');
        }
      },
    },
  },
});

export default function ApiCallback() {
  return null;
}
