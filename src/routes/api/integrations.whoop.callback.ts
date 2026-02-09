import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getSession } from '~/lib/session';
import { whoopRepository } from '~/lib/whoop/repository';
import { encryptToken } from '~/lib/whoop/crypto';

function getCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const cookie = cookies.find(c => c.startsWith(`${name}=`));
  if (!cookie) return null;
  return cookie.split('=')[1];
}

const WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID || '';
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET || '';
const WHOOP_API_URL = process.env.WHOOP_API_URL || 'https://api.prod.whoop.com';
const WHOOP_REDIRECT_URI = process.env.WHOOP_REDIRECT_URI || 'http://localhost:8787/api/integrations/whoop/callback';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    client_id: WHOOP_CLIENT_ID,
    client_secret: WHOOP_CLIENT_SECRET,
    redirect_uri: WHOOP_REDIRECT_URI,
  });

  const response = await fetch(`${WHOOP_API_URL}/oauth/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${error}`);
  }

  return response.json() as Promise<TokenResponse>;
}

async function getWhoopUserId(accessToken: string): Promise<string> {
  const response = await fetch(`${WHOOP_API_URL}/developer/v2/user/profile/basic`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Whoop user: ${response.status}`);
  }

  const data = await response.json() as { user_id: number };
  return data.user_id.toString();
}

export const Route = createFileRoute('/api/integrations/whoop/callback' as const)({
  server: {
    handlers: {
      GET: async (ctx) => {
        const request = ctx.request;

        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        if (error) {
          console.error('Whoop OAuth error:', error, url.searchParams.get('error_description'));
          return new Response(null, {
            status: 302,
            headers: { Location: '/health?whoop_error=oauth_failed' },
          });
        }

        const d1Db = (env as { DB?: D1Database }).DB;
        if (!d1Db) {
          return new Response('Database not available', { status: 500 });
        }
        const session = await getSession(request);
        if (!session?.sub) {
          return new Response('Unauthorized - no session', { status: 401 });
        }

        if (!code || !state) {
          return new Response('Missing code or state', { status: 400 });
        }

        const cookieHeader = request.headers.get('Cookie');
        const stateCookie = getCookie(cookieHeader, 'whoop_oauth_state');

        if (!stateCookie) {
          return new Response('Missing state cookie', { status: 400 });
        }

        let stateData: { codeVerifier: string; workosId: string; createdAt: number };
        try {
          stateData = JSON.parse(Buffer.from(stateCookie, 'base64').toString());
        } catch {
          return new Response('Invalid state cookie', { status: 400 });
        }

        if (Date.now() - stateData.createdAt > 10 * 60 * 1000) {
          return new Response('State expired', { status: 400 });
        }

        if (stateData.workosId !== session.sub) {
          return new Response('User mismatch', { status: 400 });
        }

        let tokens: TokenResponse;
        try {
          tokens = await exchangeCodeForTokens(code, stateData.codeVerifier);
        } catch (err) {
          console.error('Token exchange error:', err);
          return new Response(null, {
            status: 302,
            headers: { Location: '/health?whoop_error=token_exchange_failed' },
          });
        }

        let whoopUserId: string;
        try {
          whoopUserId = await getWhoopUserId(tokens.access_token);
        } catch (err) {
          console.error('Failed to get Whoop user ID:', err);
          return new Response(null, {
            status: 302,
            headers: { Location: '/health?whoop_error=get_user_failed' },
          });
        }

        const encryptedAccess = await encryptToken(tokens.access_token);
        const encryptedRefresh = await encryptToken(tokens.refresh_token);
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        const connection = await whoopRepository.createConnection(
          d1Db,
          session.sub,
          encryptedAccess,
          encryptedRefresh,
          expiresAt,
          whoopUserId,
          'read:recovery,read:cycles,read:sleep,read:workout'
        );

        if (!connection) {
          return new Response(null, {
            status: 302,
            headers: { Location: '/health?whoop_error=connection_failed' },
          });
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: '/health?whoop_connected=true',
            'Set-Cookie': 'whoop_oauth_state=; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=0',
          },
        });
      },
    },
  },
});

export default function ApiWhoopCallback() {
  return null;
}
