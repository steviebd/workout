import { createFileRoute } from '@tanstack/react-router';
import { apiRoute } from '~/lib/api/api-route';
import { API } from '~/lib/constants';

function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = Buffer.from(buffer).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function arrayToHex(buffer: Uint8Array): string {
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

function generateState(): string {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return arrayToHex(array);
}

async function sha256Challenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

const WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID ?? '';
const WHOOP_API_URL = process.env.WHOOP_API_URL ?? 'https://api.prod.whoop.com';
const WHOOP_SCOPES = ['read:recovery', 'read:cycles', 'read:sleep', 'read:workout', 'read:profile', 'offline'];

function getWhoopRedirectUri(requestUrl: string): string {
  const url = new URL(requestUrl);
  return `${url.origin}/api/integrations/whoop/callback`;
}

export const Route = createFileRoute('/api/integrations/whoop/connect' as const)({
  server: {
    handlers: {
      GET: apiRoute('Connect Whoop', async ({ session, request }) => {
        const workosId = session.sub;
        const codeVerifier = generateCodeVerifier();
        const state = generateState();
        const codeChallenge = await sha256Challenge(codeVerifier);

        const stateData = {
          codeVerifier,
          workosId,
          createdAt: Date.now(),
        };

        const stateCookie = Buffer.from(JSON.stringify(stateData)).toString('base64');
        const stateExpiry = new Date(Date.now() + API.TIMEOUTS.STATE_EXPIRY_MS).toUTCString();

        const authUrl = new URL(`${WHOOP_API_URL}/oauth/oauth2/auth`);
        authUrl.searchParams.set('client_id', WHOOP_CLIENT_ID);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('redirect_uri', getWhoopRedirectUri(request.url));
        authUrl.searchParams.set('scope', WHOOP_SCOPES.join(' '));
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');

        return new Response(null, {
          status: 302,
          headers: {
            Location: authUrl.toString(),
            'Set-Cookie': `whoop_oauth_state=${stateCookie}; HttpOnly; Secure; Path=/; SameSite=Lax; Expires=${stateExpiry}`,
          },
        });
      }),
    },
  },
});
