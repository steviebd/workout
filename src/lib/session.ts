import { verifyToken, getTokenFromCookie } from './auth';

const SESSION_COOKIE_NAME = 'session_token';

export interface Session {
  userId: string;
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
    userId: payload.userId,
    email: payload.email,
    workosId: payload.sub,
  };
}

function createSessionCookie(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;
}

function createClearCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function createSessionResponse(token: string, redirectTo: string = '/'): Response {
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': createSessionCookie(token),
      Location: redirectTo,
    },
  });
}

export function destroySessionResponse(redirectTo: string = '/'): Response {
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': createClearCookie(),
      Location: redirectTo,
    },
  });
}
