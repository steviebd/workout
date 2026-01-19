import { type JWTPayload, SignJWT, jwtVerify } from 'jose';

let jwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (!jwtSecret) {
    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) {
      throw new Error('AUTH_CONFIG_ERROR: WORKOS_API_KEY not configured');
    }
    jwtSecret = new TextEncoder().encode(apiKey);
  }
  return jwtSecret;
}

export type SessionPayload = JWTPayload & {
  sub: string;
  userId: string;
  email: string;
  workosSessionId?: string;
}

export interface UserFromWorkOS {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export async function createToken(user: UserFromWorkOS, localUserId: string, workosSessionId?: string): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    userId: localUserId,
    email: user.email,
    workosSessionId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());

  return token;
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as SessionPayload;
  } catch {
    return null;
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
    return payload.sid || null;
  } catch {
    return null;
  }
}
