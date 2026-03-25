import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getOrCreateUser } from '~/lib/db/user';
import { createToken, extractSessionIdFromAccessToken, createSessionResponse } from '~/lib/auth';

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

function Callback() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </main>
  );
}

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: search.code as string | undefined,
    error: search.error as string | undefined,
  }),
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get('code') ?? undefined;
        const error = url.searchParams.get('error') ?? undefined;

        if (error) {
          return createErrorRedirect(error as string);
        }

        if (!code) {
          return createErrorRedirect('no_code');
        }

        const state = getStateFromCookie(request.headers.get('Cookie'));
        const urlState = url.searchParams.get('state');

        if (!urlState || !state || urlState !== state) {
          console.error('OAuth state mismatch or missing');
          return createErrorRedirect('invalid_state');
        }

        try {
          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            console.error('Database not available in auth callback');
            return createErrorRedirect('db_unavailable');
          }

          const { WORKOS_API_KEY, WORKOS_CLIENT_ID } = env as typeof env & {
            WORKOS_API_KEY?: string;
            WORKOS_CLIENT_ID?: string;
          };

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
  component: Callback,
});
