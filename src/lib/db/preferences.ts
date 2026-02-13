import { eq } from 'drizzle-orm';
import { type NewUserPreference, type UserPreference, userPreferences } from './schema';
import { getDb, type DbOrTx } from './index';

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
  dbOrTx: DbOrTx,
  workosId: string
): Promise<UserPreference | null> {
  const db = getDb(dbOrTx);

  const prefs = await db
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
  dbOrTx: DbOrTx,
  workosId: string,
  data: UpdatePreferencesData
): Promise<UserPreference> {
  const db = getDb(dbOrTx);

  const existing = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.workosId, workosId))
    .get();

  if (existing) {
    const updated = await db
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

  const newPrefs = await db
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
  dbOrTx: DbOrTx,
  workosId: string,
  weightUnit: WeightUnit
): Promise<UserPreference | null> {
  return upsertUserPreferences(dbOrTx, workosId, { weightUnit });
}

/**
 * Updates the theme preference for a user
 * @param db - D1 database instance
 * @param workosId - The user's WorkOS ID
 * @param theme - The new theme (dark or light)
 * @returns The updated preferences, or null if not found
 */
export async function updateTheme(
  dbOrTx: DbOrTx,
  workosId: string,
  theme: Theme
): Promise<UserPreference | null> {
  return upsertUserPreferences(dbOrTx, workosId, { theme });
}
