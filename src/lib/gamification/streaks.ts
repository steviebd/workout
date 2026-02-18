import { eq, isNotNull, sql, and } from 'drizzle-orm';
import { getDb, type DbOrTx } from '~/lib/db/index';
import { workouts, userStreaks } from '~/lib/db/schema';

export interface WeeklyWorkoutCount {
  weekStart: string;
  count: number;
  meetsTarget: boolean;
}

export interface ThirtyDayStreakResult {
  current: number;
  target: number;
  progress: number;
  maxConsecutive: number;
  weeklyDetails: WeeklyWorkoutCount[];
}

export async function getWorkoutsInDateRange(
  dbOrTx: DbOrTx,
  workosId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  const db = getDb(dbOrTx);
  const results = await db
    .select({ completedAt: workouts.completedAt })
    .from(workouts)
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workouts.isDeleted, false),
      isNotNull(workouts.completedAt),
      sql`date(${workouts.completedAt}) >= ${startDate}`,
      sql`date(${workouts.completedAt}) <= ${endDate}`
    ));

  const dates = new Set<string>();
  for (const w of results) {
    if (w.completedAt) {
      const dateStr = w.completedAt.split('T')[0];
      dates.add(dateStr);
    }
  }
  return Array.from(dates).sort();
}

export async function countWorkoutsInRange(
  dbOrTx: DbOrTx,
  workosId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const db = getDb(dbOrTx);
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(workouts)
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workouts.isDeleted, false),
      isNotNull(workouts.completedAt),
      sql`date(${workouts.completedAt}) >= ${startDate}`,
      sql`date(${workouts.completedAt}) <= ${endDate}`
    ));

  return result[0]?.count ?? 0;
}

export async function getWorkoutsPerWeek(
  dbOrTx: DbOrTx,
  workosId: string,
  weeksBack = 8,
  targetPerWeek = 3
): Promise<WeeklyWorkoutCount[]> {
  const db = getDb(dbOrTx);
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const earliestWeekStart = new Date(today);
  earliestWeekStart.setDate(today.getDate() + mondayOffset - ((weeksBack - 1) * 7));
  earliestWeekStart.setHours(0, 0, 0, 0);
  const startDateStr = new Date(earliestWeekStart.getTime() - earliestWeekStart.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const results = await db
    .select({
      weekStart: sql<string>`date(${workouts.completedAt}, 'weekday 0', '-6 days')`.mapWith(String),
      count: sql<number>`count(distinct date(${workouts.completedAt}))`.mapWith(Number),
    })
    .from(workouts)
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workouts.isDeleted, false),
      isNotNull(workouts.completedAt),
      sql`date(${workouts.completedAt}) >= ${startDateStr}`
    ))
    .groupBy(sql`date(${workouts.completedAt}, 'weekday 0', '-6 days')`)
    .orderBy(sql`date(${workouts.completedAt}, 'weekday 0', '-6 days')`)
    .all();

  const resultMap = new Map(results.map(r => [r.weekStart, r.count]));

  const weeklyDetails: WeeklyWorkoutCount[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset - (i * 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = new Date(weekStart.getTime() - weekStart.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    weeklyDetails.push({
      weekStart: weekStartStr,
      count: resultMap.get(weekStartStr) ?? 0,
      meetsTarget: (resultMap.get(weekStartStr) ?? 0) >= targetPerWeek,
    });
  }

  return weeklyDetails;
}

export async function calculateThirtyDayStreak(
  dbOrTx: DbOrTx,
  workosId: string,
  targetPerWeek = 3,
  weeksBack = 8
): Promise<ThirtyDayStreakResult> {
  const db = getDb(dbOrTx);
  const weeklyDetails = await getWorkoutsPerWeek(db, workosId, weeksBack, targetPerWeek);
  
  let currentStreak = 0;
  let maxConsecutive = 0;
  let tempStreak = 0;
  
  for (const week of weeklyDetails) {
    if (week.meetsTarget) {
      tempStreak++;
      currentStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
    maxConsecutive = Math.max(maxConsecutive, tempStreak);
  }
  
  const targetWeeks = 4;
  const progress = Math.min((currentStreak / targetWeeks) * 100, 100);
  
  return {
    current: currentStreak,
    target: targetWeeks,
    progress,
    maxConsecutive,
    weeklyDetails,
  };
}

export async function getWeeklyWorkoutCount(
  dbOrTx: DbOrTx,
  workosId: string
): Promise<number> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(today);
  weekEnd.setHours(23, 59, 59, 999);
  
    const startDateStr = new Date(weekStart.getTime() - weekStart.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const endDateStr = new Date(weekEnd.getTime() - weekEnd.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  
  return await countWorkoutsInRange(dbOrTx, workosId, startDateStr, endDateStr);
}

export async function getRolling30DayWorkoutCount(
  dbOrTx: DbOrTx,
  workosId: string
): Promise<number> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  
    const startDateStr = new Date(thirtyDaysAgo.getTime() - thirtyDaysAgo.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const endDateStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  
  return await countWorkoutsInRange(dbOrTx, workosId, startDateStr, endDateStr);
}

export async function getTotalWorkouts(
  dbOrTx: DbOrTx,
  workosId: string
): Promise<number> {
  const db = getDb(dbOrTx);
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(workouts)
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workouts.isDeleted, false),
      isNotNull(workouts.completedAt)
    ));
  
  return result[0]?.count ?? 0;
}

export async function getLastWorkoutDate(
  dbOrTx: DbOrTx,
  workosId: string
): Promise<string | null> {
  const db = getDb(dbOrTx);
  const result = await db
    .select({ completedAt: workouts.completedAt })
    .from(workouts)
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workouts.isDeleted, false),
      isNotNull(workouts.completedAt)
    ))
    .orderBy(sql`${workouts.completedAt} DESC`)
    .limit(1);
  
  return result[0]?.completedAt?.split('T')[0] ?? null;
}

export async function updateUserLastWorkout(
  dbOrTx: DbOrTx,
  workosId: string,
  workoutDate: string
): Promise<void> {
  const db = getDb(dbOrTx);
  
  await db
    .insert(userStreaks)
    .values({
      workosId,
      lastWorkoutDate: workoutDate,
    })
    .onConflictDoUpdate({
      target: userStreaks.workosId,
      set: {
        lastWorkoutDate: workoutDate,
        updatedAt: new Date().toISOString(),
      },
    });
}

export async function checkAndResetBrokenStreaks(
  dbOrTx: DbOrTx,
  workosId: string,
  targetPerWeek = 3
): Promise<void> {
  const db = getDb(dbOrTx);
  const weeklyDetails = await getWorkoutsPerWeek(db, workosId, 2, targetPerWeek);
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  let shouldReset = false;
  
  if (dayOfWeek === 1) {
    const lastWeek = weeklyDetails[weeklyDetails.length - 1];
    if (lastWeek && !lastWeek.meetsTarget) {
      shouldReset = true;
    }
  }
  
  if (shouldReset) {
    await db
      .update(userStreaks)
      .set({
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userStreaks.workosId, workosId));
  }
}

export async function getCurrentMonthStreak(
  dbOrTx: DbOrTx,
  workosId: string
): Promise<number> {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startDateStr = new Date(startOfMonth.getTime() - startOfMonth.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const endDateStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  
  const workoutsThisMonth = await getWorkoutsInDateRange(dbOrTx, workosId, startDateStr, endDateStr);
  
  return workoutsThisMonth.length > 0 ? 1 : 0;
}

export async function calculateMonthlyStreak(
  dbOrTx: DbOrTx,
  workosId: string
): Promise<number> {
  const db = getDb(dbOrTx);
  const today = new Date();
  const twelveMonthsAgo = new Date(today);
  twelveMonthsAgo.setMonth(today.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);
  
  const startDateStr = new Date(twelveMonthsAgo.getTime() - twelveMonthsAgo.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  
  const results = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${workouts.completedAt})`.mapWith(String),
      hasWorkout: sql<number>`count(*)`.mapWith(Number),
    })
    .from(workouts)
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workouts.isDeleted, false),
      isNotNull(workouts.completedAt),
      sql`date(${workouts.completedAt}) >= ${startDateStr}`
    ))
    .groupBy(sql`strftime('%Y-%m', ${workouts.completedAt})`)
    .orderBy(sql`strftime('%Y-%m', ${workouts.completedAt})`)
    .all();

  const monthlyHasWorkout = new Map(results.map(r => [r.month, r.hasWorkout > 0]));
  
  let streak = 0;
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date();
    monthDate.setMonth(today.getMonth() - i);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (monthlyHasWorkout.get(monthKey) === true) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}
