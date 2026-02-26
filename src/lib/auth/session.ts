import { type SessionPayload } from './jwt';
import { AUTH } from '../constants';

export type { SessionPayload } from './jwt';
export const SESSION_COOKIE_MAX_AGE = AUTH.SESSION_COOKIE_MAX_AGE;

export async function getSession(request: Request): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('session='));
  if (!sessionCookie) return null;

  const token = sessionCookie.split('=')[1];

  const { verifyToken } = await import('./jwt');
  return await verifyToken(token);
}

export function createSessionResponse(token: string, request: Request, redirectPath: string, refreshToken?: string): Response {
  const tokenToSet = refreshToken ?? token;
  const url = new URL(request.url);
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const securePart = isLocalhost ? '' : ' Secure;';
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectPath,
      'Set-Cookie': `session=${tokenToSet}; HttpOnly;${securePart} Path=/; SameSite=Lax; Max-Age=${SESSION_COOKIE_MAX_AGE}`,
    },
  });
}

export function createRefreshedSessionHeaders(token: string): Headers {
  const headers = new Headers();
  headers.set('Set-Cookie', `session=${token}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${SESSION_COOKIE_MAX_AGE}`);
  return headers;
}

export function createApiResponseWithRefresh(data: unknown, status: number, refreshHeaders?: Headers): Response {
  const headers = refreshHeaders ?? new Headers();
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), { status, headers });
}
