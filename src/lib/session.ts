import { getTokenFromCookie, verifyToken } from './auth';

const SESSION_COOKIE_NAME = 'session_token';

export interface Session {
  email: string;
  workosId: string;
}

function isLocalhost(request: Request): boolean {
  const url = new URL(request.url);
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

export async function getSession(request: Request): Promise<Session | null> {
  const cookieHeader = request.headers.get('Cookie');
  const isDev = isLocalhost(request);
  const cookieName = isDev ? SESSION_COOKIE_NAME : `__Host-${SESSION_COOKIE_NAME}`;
  const token = getTokenFromCookie(cookieHeader, cookieName);

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    email: payload.email,
    workosId: payload.sub,
  };
}

function getCookieName(isDev: boolean): string {
  return isDev ? SESSION_COOKIE_NAME : `__Host-${SESSION_COOKIE_NAME}`;
}

function createSessionCookie(token: string, isDev: boolean): string {
  const cookieName = getCookieName(isDev);
  if (isDev) {
    return `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=172800`;
  }
  return `${cookieName}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=172800`;
}

function createClearCookie(isDev: boolean): string {
  const cookieName = getCookieName(isDev);
  if (isDev) {
    return `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
  }
  return `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function createSessionResponse(token: string, request: Request, redirectTo = '/'): Response {
  const isDev = isLocalhost(request);
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': createSessionCookie(token, isDev),
      'Location': redirectTo,
    },
  });
}

export function destroySessionResponse(request: Request, redirectTo = '/'): Response {
  const isDev = isLocalhost(request);
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': createClearCookie(isDev),
      'Location': redirectTo,
    },
  });
}
