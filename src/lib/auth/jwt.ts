import { type JWTPayload, SignJWT, jwtVerify } from 'jose';
import { AUTH } from '../constants';

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
  /**
   * The WorkOS user ID (from WorkOS `user.id` field).
   * This is the canonical identifier for the user's identity in WorkOS.
   * Maps to `users.workosId` in the database.
   */
  sub: string;
  email: string;
  /**
   * The local surrogate primary key (`users.id`).
   * Optional, populated during initial auth for convenience.
   */
  workosId?: string;
}

export interface UserFromWorkOS {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export const TOKEN_EXPIRY_SECONDS = AUTH.TOKEN_EXPIRY_SECONDS;
export const REFRESH_THRESHOLD_SECONDS = AUTH.REFRESH_THRESHOLD_SECONDS;

export async function createToken(user: UserFromWorkOS, workosId?: string): Promise<string> {
  /**
   * The JWT `sub` claim is set to WorkOS user ID (`user.id`), NOT the local `users.id`.
   * WorkOS user IDs are stable, immutable identifiers from WorkOS (format: "wos_...").
   * All data tables (exercises, workouts, etc.) use `workosId` column for ownership.
   */
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
