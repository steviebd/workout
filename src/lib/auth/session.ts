import { type SessionPayload } from './jwt';
import { AUTH } from '../constants';

export type { SessionPayload } from './jwt';
export const SESSION_COOKIE_MAX_AGE = AUTH.SESSION_COOKIE_MAX_AGE;

function isLocalRequest(request: Request): boolean {
  const url = new URL(request.url);
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

function createCookie(name: string, value: string, isLocalhost: boolean, maxAge: number): string {
  const securePart = isLocalhost ? '' : ' Secure;';
  return `${name}=${value}; HttpOnly;${securePart} Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function getSession(request: Request): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('session='));
  if (!sessionCookie) return null;

  const token = sessionCookie.slice('session='.length);

  const { verifyToken } = await import('./jwt');
  return await verifyToken(token);
}

export function createSessionResponse(token: string, request: Request, redirectPath: string, refreshToken?: string): Response {
  const tokenToSet = refreshToken ?? token;
  const url = new URL(request.url);
  const isLocalhost = isLocalRequest(request);
  const redirectUrl = new URL(redirectPath, url.origin).toString();
  const headers = new Headers();

  headers.append('Set-Cookie', createCookie('session', tokenToSet, isLocalhost, SESSION_COOKIE_MAX_AGE));
  headers.append('Set-Cookie', createCookie('oauth_state', '', isLocalhost, 0));
  headers.set('Location', redirectUrl);
  headers.set('Cache-Control', 'no-store, max-age=0');
  headers.set('Pragma', 'no-cache');
  return new Response(null, {
    status: 303,
    headers,
  });
}

export function createRefreshedSessionHeaders(token: string, request?: Request): Headers {
  const headers = new Headers();
  const isLocalhost = request ? isLocalRequest(request) : false;
  headers.set('Set-Cookie', createCookie('session', token, isLocalhost, SESSION_COOKIE_MAX_AGE));
  return headers;
}

export function createApiResponseWithRefresh(data: unknown, status: number, refreshHeaders?: Headers): Response {
  const headers = refreshHeaders ?? new Headers();
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), { status, headers });
}
