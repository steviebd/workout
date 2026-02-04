export interface SessionPayload {
  sub: string;
  email: string;
  workosId?: string;
  exp?: number;
}

export async function getSession(request: Request): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('session='));
  if (!sessionCookie) return null;

  const token = sessionCookie.split('=')[1];
  
  const { verifyToken } = await import('./auth');
  return await verifyToken(token);
}

export function createSessionResponse(token: string, _request: Request, redirectPath: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectPath,
      'Set-Cookie': `session=${token}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=604800`,
    },
  });
}
