import { type JWTPayload, SignJWT, jwtVerify } from 'jose';

let jwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (!jwtSecret) {
    const secret = process.env.SESSION_JWT_SECRET;
    if (!secret) {
      throw new Error('AUTH_CONFIG_ERROR: SESSION_JWT_SECRET not configured');
    }
    jwtSecret = new TextEncoder().encode(secret);
  }
  return jwtSecret;
}

export type SessionPayload = JWTPayload & {
  sub: string;
  email: string;
  workosId?: string;
}

export interface UserFromWorkOS {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export const TOKEN_EXPIRY_SECONDS = 4 * 24 * 60 * 60; // 4 days in seconds
export const REFRESH_THRESHOLD_SECONDS = 24 * 60 * 60; // Refresh if < 24 hours remaining

export async function createToken(user: UserFromWorkOS, workosId?: string): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    workosId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4d')
    .setIssuer('fit-workout-app')
    .setAudience('fit-workout-app')
    .sign(getJwtSecret());

  return token;
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'fit-workout-app',
      audience: 'fit-workout-app',
    });

    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function shouldRefreshToken(exp: number | undefined): boolean {
  if (!exp) return true;
  const now = Math.floor(Date.now() / 1000);
  const remaining = exp - now;
  return remaining < REFRESH_THRESHOLD_SECONDS;
}

export async function refreshTokenIfNeeded(
  token: string,
  user: UserFromWorkOS,
  workosId?: string
): Promise<{ token: string; refreshed: boolean }> {
  try {
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.exp) {
      const newToken = await createToken(user, workosId);
      return { token: newToken, refreshed: true };
    }

    if (shouldRefreshToken(decoded.exp)) {
      const newToken = await createToken(user, workosId);
      return { token: newToken, refreshed: true };
    }

    return { token, refreshed: false };
  } catch {
    const newToken = await createToken(user, workosId);
    return { token: newToken, refreshed: true };
  }
}

export function getTokenFromCookie(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith(`${cookieName}=`));

  if (!sessionCookie) return null;

  return sessionCookie.split('=')[1];
}

export function extractSessionIdFromAccessToken(accessToken: string): string | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString()) as { sid?: string };
    return payload.sid ?? null;
  } catch {
    return null;
  }
}
