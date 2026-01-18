import { createFileRoute } from '@tanstack/react-router';
import { WorkOS } from '@workos-inc/node';
import { createSessionResponse } from '../../../lib/session';
import { createToken, extractSessionIdFromAccessToken } from '../../../lib/auth';

const WORKOS_API_KEY = process.env.WORKOS_API_KEY;
const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID;

export const Route = createFileRoute('/api/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');

        if (!code) {
          return new Response(null, {
            status: 302,
            headers: { Location: '/?error=no_code' },
          });
        }

        try {
          const workos = new WorkOS(WORKOS_API_KEY!);
          const { user, accessToken } = await workos.userManagement.authenticateWithCode({
            code,
            clientId: WORKOS_CLIENT_ID!,
          });

          const workosSessionId = extractSessionIdFromAccessToken(accessToken) ?? undefined;

          const token = await createToken(
            {
              id: user.id,
              email: user.email,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
            },
            user.id,
            workosSessionId
          );

          return createSessionResponse(token, '/');
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
