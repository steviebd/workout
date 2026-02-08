import { eq } from 'drizzle-orm';
import { users } from './schema';
import { createDb } from './index';

export interface UserFromWorkOS {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface LocalUser {
  id: string;
  workosId: string;
  email: string;
  name: string;
  createdAt: string;
}

/**
 * Retrieves or creates a user from WorkOS profile data
 * @param db - D1 database instance
 * @param profile - WorkOS user profile data
 * @returns The local user record
 */
export async function getOrCreateUser(db: D1Database, profile: UserFromWorkOS): Promise<LocalUser> {
  const drizzleDb = createDb(db);

  const existing = await drizzleDb
    .select()
    .from(users)
    .where(eq(users.workosId, profile.id))
    .get();

  if (existing) {
    return existing as LocalUser;
  }

  const newUser = await drizzleDb
    .insert(users)
    .values({
      workosId: profile.id,
      email: profile.email,
      name: `${profile.firstName} ${profile.lastName}`.trim(),
    })
    .returning()
    .get();

  return newUser as LocalUser;
}

/**
 * Retrieves a user by their WorkOS ID
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @returns The user if found, or null
 */
export async function getUserByWorkosId(db: D1Database, workosId: string): Promise<LocalUser | null> {
  const drizzleDb = createDb(db);

  const user = await drizzleDb
    .select()
    .from(users)
    .where(eq(users.workosId, workosId))
    .get();

  return user ? (user as LocalUser) : null;
}
