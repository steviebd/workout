import { createFileRoute } from '@tanstack/react-router';
import { WorkOS } from '@workos-inc/node';

const {WORKOS_API_KEY} = process.env;
const {WORKOS_CLIENT_ID} = process.env;

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

        const authorizationUrl = workos.userManagement.getAuthorizationUrl({
          clientId: WORKOS_CLIENT_ID,
          redirectUri,
          provider: 'authkit',
        });

        return new Response(null, {
          status: 302,
          headers: { Location: authorizationUrl },
        });
      },
    },
  },
});

export default function SignIn() {
  return null;
}
