import { eq } from 'drizzle-orm';
import { type NewUserPreference, type UserPreference, userPreferences } from './schema';
import { createDb } from './index';

export type { UserPreference, NewUserPreference };

export type WeightUnit = 'kg' | 'lbs';
export type Theme = 'dark' | 'light';
export type DateFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy';

export interface UpdatePreferencesData {
  weightUnit?: WeightUnit;
  theme?: Theme;
  dateFormat?: DateFormat;
  weeklyWorkoutTarget?: number;
}

/**
 * Retrieves user preferences from the database
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @returns The user preferences if found, or null
 */
export async function getUserPreferences(
  db: D1Database,
  workosId: string
): Promise<UserPreference | null> {
  const drizzleDb = createDb(db);

  const prefs = await drizzleDb
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.workosId, workosId))
    .get();

  return prefs ? (prefs as UserPreference) : null;
}

/**
 * Creates or updates user preferences
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param data - Preference fields to update
 * @returns The updated or newly created preferences
 */
export async function upsertUserPreferences(
  db: D1Database,
  workosId: string,
  data: UpdatePreferencesData
): Promise<UserPreference> {
  const drizzleDb = createDb(db);

  const existing = await drizzleDb
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.workosId, workosId))
    .get();

  if (existing) {
    const updated = await drizzleDb
      .update(userPreferences)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userPreferences.workosId, workosId))
      .returning()
      .get();

    return updated;
  }

  const newPrefs = await drizzleDb
    .insert(userPreferences)
    .values({
      workosId,
      weightUnit: data.weightUnit ?? 'kg',
      dateFormat: data.dateFormat ?? 'dd/mm/yyyy',
      theme: data.theme ?? 'light',
      weeklyWorkoutTarget: data.weeklyWorkoutTarget ?? 3,
    })
    .returning()
    .get();

  return newPrefs;
}

/**
 * Updates the weight unit preference for a user
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param weightUnit - The new weight unit (kg or lbs)
 * @returns The updated preferences, or null if not found
 */
export async function updateWeightUnit(
  db: D1Database,
  workosId: string,
  weightUnit: WeightUnit
): Promise<UserPreference | null> {
  return upsertUserPreferences(db, workosId, { weightUnit });
}

/**
 * Updates the theme preference for a user
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param theme - The new theme (dark or light)
 * @returns The updated preferences, or null if not found
 */
export async function updateTheme(
  db: D1Database,
  workosId: string,
  theme: Theme
): Promise<UserPreference | null> {
  return upsertUserPreferences(db, workosId, { theme });
}
