/**
 * Session payload representing an authenticated user.
 *
 * IMPORTANT: Identity field distinction:
 * - `sub`: The WorkOS user ID (e.g., "wos_abc123"). Used for DB queries via `workosId` column.
 * - `workosId`: The local `users.id` surrogate key (UUID). Rarely needed; prefer `sub`.
 *
 * All entity tables (exercises, workouts, templates, etc.) store the WorkOS user ID
 * in their `workosId` column. Query like: `db.select().from(exercises).where(eq(exercises.workosId, session.sub))`
 */
export interface SessionPayload {
  /** The WorkOS user ID - use this for all DB queries filtering by user */
  sub: string;
  email: string;
  /** The local users.id (surrogate PK) - usually not needed for queries */
  workosId?: string;
  exp?: number;
}

export const SESSION_COOKIE_MAX_AGE = 4 * 24 * 60 * 60; // 4 days in seconds

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

export function createSessionResponse(token: string, _request: Request, redirectPath: string, refreshToken?: string): Response {
  const tokenToSet = refreshToken ?? token;
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectPath,
      'Set-Cookie': `session=${tokenToSet}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${SESSION_COOKIE_MAX_AGE}`,
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
