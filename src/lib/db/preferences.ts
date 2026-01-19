import { eq } from 'drizzle-orm';
import { type NewUserPreference, type UserPreference, userPreferences } from './schema';
import { createDb } from './index';

export type { UserPreference, NewUserPreference };

export type WeightUnit = 'kg' | 'lbs';
export type Theme = 'dark' | 'light';

export interface UpdatePreferencesData {
  weightUnit?: WeightUnit;
  theme?: Theme;
}

export async function getUserPreferences(
  db: D1Database,
  userId: string
): Promise<UserPreference | null> {
  const drizzleDb = createDb(db);

  const prefs = await drizzleDb
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .get();

  return prefs ? (prefs as UserPreference) : null;
}

export async function upsertUserPreferences(
  db: D1Database,
  userId: string,
  data: UpdatePreferencesData
): Promise<UserPreference> {
  const drizzleDb = createDb(db);

  const existing = await drizzleDb
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .get();

  if (existing) {
    const updated = await drizzleDb
      .update(userPreferences)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userPreferences.userId, userId))
      .returning()
      .get();

    return updated;
  }

  const newPrefs = await drizzleDb
    .insert(userPreferences)
    .values({
      userId,
      weightUnit: data.weightUnit || 'kg',
      theme: data.theme || 'light',
    })
    .returning()
    .get();

  return newPrefs;
}

export async function updateWeightUnit(
  db: D1Database,
  userId: string,
  weightUnit: WeightUnit
): Promise<UserPreference | null> {
  return upsertUserPreferences(db, userId, { weightUnit });
}

export async function updateTheme(
  db: D1Database,
  userId: string,
  theme: Theme
): Promise<UserPreference | null> {
  return upsertUserPreferences(db, userId, { theme });
}
