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

export async function updateWeightUnit(
  db: D1Database,
  workosId: string,
  weightUnit: WeightUnit
): Promise<UserPreference | null> {
  return upsertUserPreferences(db, workosId, { weightUnit });
}

export async function updateTheme(
  db: D1Database,
  workosId: string,
  theme: Theme
): Promise<UserPreference | null> {
  return upsertUserPreferences(db, workosId, { theme });
}
