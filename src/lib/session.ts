import { getTokenFromCookie, verifyToken } from './auth';

const SESSION_COOKIE_NAME = 'session_token';

export interface Session {
  email: string;
  workosId: string;
}

export async function getSession(request: Request): Promise<Session | null> {
  const cookieHeader = request.headers.get('Cookie');
  const token = getTokenFromCookie(cookieHeader, SESSION_COOKIE_NAME);

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    email: payload.email,
    workosId: payload.sub,
  };
}

function isLocalhost(request: Request): boolean {
  const url = new URL(request.url);
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

function createSessionCookie(token: string, isDev: boolean): string {
  const secure = isDev ? '' : ' Secure';
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=604800`;
}

function createClearCookie(isDev: boolean): string {
  const secure = isDev ? '' : ' Secure';
  return `${SESSION_COOKIE_NAME}=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0`;
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
