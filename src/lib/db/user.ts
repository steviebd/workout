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

export async function getUserById(db: D1Database, userId: string): Promise<LocalUser | null> {
  const drizzleDb = createDb(db);

  const user = await drizzleDb
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  return user ? (user as LocalUser) : null;
}
