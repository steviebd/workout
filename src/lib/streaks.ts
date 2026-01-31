import { eq, isNotNull, sql, and } from 'drizzle-orm';
import { createDb } from './db/index';
import { workouts, userStreaks } from './db/schema';

export async function getWorkoutDatesForUser(db: D1Database, workosId: string): Promise<string[]> {
  const drizzleDb = createDb(db);
  const workoutResults = await drizzleDb
    .select({ completedAt: workouts.completedAt })
    .from(workouts)
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workouts.isDeleted, false),
      isNotNull(workouts.completedAt)
    ));

  const dates = new Set<string>();
  for (const w of workoutResults) {
    if (w.completedAt) {
      const dateStr = w.completedAt.split('T')[0];
      dates.add(dateStr);
    }
  }

  return Array.from(dates).sort();
}

export async function calculateCurrentStreak(db: D1Database, workosId: string): Promise<number> {
  const dates = await getWorkoutDatesForUser(db, workosId);
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastWorkoutDate = dates[dates.length - 1];
  const lastDate = new Date(lastWorkoutDate);
  const daysSinceLastWorkout = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLastWorkout > 1) {
    return 0;
  }

  let currentStreak = 0;
  const checkDate = new Date(today);
  const dateSet = new Set(dates);

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (dateSet.has(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr === today.toISOString().split('T')[0]) {
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return currentStreak;
}

export async function calculateLongestStreak(db: D1Database, workosId: string): Promise<number> {
  const dates = await getWorkoutDatesForUser(db, workosId);
  if (dates.length === 0) return 0;

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}

export async function getLastWorkoutDate(db: D1Database, workosId: string): Promise<string | null> {
  const dates = await getWorkoutDatesForUser(db, workosId);
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

export async function getWeeklyWorkouts(db: D1Database, workosId: string): Promise<number> {
  const drizzleDb = createDb(db);
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startDateStr = startOfWeek.toISOString().split('T')[0];

  const result = await drizzleDb
    .select({ count: sql<number>`count(*)` })
    .from(workouts)
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workouts.isDeleted, false),
      isNotNull(workouts.completedAt),
      sql`date(${workouts.completedAt}) >= ${startDateStr}`
    ));

  return result[0]?.count ?? 0;
}

export async function getWorkoutDatesInRange(db: D1Database, workosId: string, startDate: string, endDate: string): Promise<string[]> {
  const dates = await getWorkoutDatesForUser(db, workosId);
  return dates.filter(date => date >= startDate && date <= endDate);
}

export async function getTotalWorkouts(db: D1Database, workosId: string): Promise<number> {
  const drizzleDb = createDb(db);
  const result = await drizzleDb
    .select({ count: sql<number>`count(*)` })
    .from(workouts)
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workouts.isDeleted, false),
      isNotNull(workouts.completedAt)
    ));

  return result[0]?.count ?? 0;
}

export async function updateStreakAfterWorkout(db: D1Database, workosId: string, workoutCompletedAt: string): Promise<void> {
  const drizzleDb = createDb(db);
  const workoutDateStr = workoutCompletedAt.split('T')[0];

  const currentStreak = await calculateCurrentStreak(db, workosId);
  const longestStreak = await calculateLongestStreak(db, workosId);

  await drizzleDb
    .insert(userStreaks)
    .values({
      workosId,
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastWorkoutDate: workoutDateStr,
    })
    .onConflictDoUpdate({
      target: userStreaks.workosId,
      set: {
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        lastWorkoutDate: workoutDateStr,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}

export async function checkAndResetBrokenStreaks(db: D1Database, workosId: string): Promise<void> {
  const drizzleDb = createDb(db);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [streakRecord] = await drizzleDb
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.workosId, workosId));

  if (!streakRecord?.lastWorkoutDate) return;

  const lastWorkoutDate = new Date(streakRecord.lastWorkoutDate);
  const daysSinceLastWorkout = Math.floor((today.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLastWorkout > 1) {
    await drizzleDb
      .update(userStreaks)
      .set({
        currentStreak: 0,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(userStreaks.workosId, workosId));
  }
}

export async function backfillUserStreaks(db: D1Database, workosId: string): Promise<void> {
  const drizzleDb = createDb(db);
  const currentStreak = await calculateCurrentStreak(db, workosId);
  const longestStreak = await calculateLongestStreak(db, workosId);
  const lastWorkoutDate = await getLastWorkoutDate(db, workosId);

  await drizzleDb
    .insert(userStreaks)
    .values({
      workosId,
      currentStreak,
      longestStreak,
      lastWorkoutDate,
    })
    .onConflictDoUpdate({
      target: userStreaks.workosId,
      set: {
        currentStreak,
        longestStreak,
        lastWorkoutDate,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}
