import { eq, isNotNull, sql, and } from 'drizzle-orm';
import { createDb } from './db/index';
import { workouts, userStreaks } from './db/schema';

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
  db: D1Database,
  workosId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  const drizzleDb = createDb(db);
  const results = await drizzleDb
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
  db: D1Database,
  workosId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const drizzleDb = createDb(db);
  const result = await drizzleDb
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
  db: D1Database,
  workosId: string,
  weeksBack: number = 8,
  targetPerWeek: number = 3
): Promise<WeeklyWorkoutCount[]> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const weeklyDetails: WeeklyWorkoutCount[] = [];
  
  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset - (i * 7));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const startDateStr = weekStart.toISOString().split('T')[0];
    const endDateStr = weekEnd.toISOString().split('T')[0];
    
    const workoutCount = await countWorkoutsInRange(db, workosId, startDateStr, endDateStr);
    
    weeklyDetails.push({
      weekStart: startDateStr,
      count: workoutCount,
      meetsTarget: workoutCount >= targetPerWeek,
    });
  }
  
  return weeklyDetails;
}

export async function calculateThirtyDayStreak(
  db: D1Database,
  workosId: string,
  targetPerWeek: number = 3,
  weeksBack: number = 8
): Promise<ThirtyDayStreakResult> {
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
  db: D1Database,
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
  
  const startDateStr = weekStart.toISOString().split('T')[0];
  const endDateStr = weekEnd.toISOString().split('T')[0];
  
  return await countWorkoutsInRange(db, workosId, startDateStr, endDateStr);
}

export async function getRolling30DayWorkoutCount(
  db: D1Database,
  workosId: string
): Promise<number> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  
  const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];
  const endDateStr = today.toISOString().split('T')[0];
  
  return await countWorkoutsInRange(db, workosId, startDateStr, endDateStr);
}

export async function getTotalWorkouts(
  db: D1Database,
  workosId: string
): Promise<number> {
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

export async function getLastWorkoutDate(
  db: D1Database,
  workosId: string
): Promise<string | null> {
  const drizzleDb = createDb(db);
  const result = await drizzleDb
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
  db: D1Database,
  workosId: string,
  workoutDate: string
): Promise<void> {
  const drizzleDb = createDb(db);
  
  await drizzleDb
    .insert(userStreaks)
    .values({
      workosId,
      lastWorkoutDate: workoutDate,
    })
    .onConflictDoUpdate({
      target: userStreaks.workosId,
      set: {
        lastWorkoutDate: workoutDate,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}

export async function checkAndResetBrokenStreaks(
  db: D1Database,
  workosId: string,
  targetPerWeek: number = 3
): Promise<void> {
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
    const drizzleDb = createDb(db);
    await drizzleDb
      .update(userStreaks)
      .set({
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(userStreaks.workosId, workosId));
  }
}

export async function getCurrentMonthStreak(
  db: D1Database,
  workosId: string
): Promise<number> {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startDateStr = startOfMonth.toISOString().split('T')[0];
  
  const workoutsThisMonth = await getWorkoutsInDateRange(db, workosId, startDateStr, today.toISOString().split('T')[0]);
  
  return workoutsThisMonth.length > 0 ? 1 : 0;
}

export async function calculateMonthlyStreak(
  db: D1Database,
  workosId: string
): Promise<number> {
  const monthlyCounts: Array<{ month: string; hasWorkout: boolean }> = [];
  const today = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date();
    monthDate.setMonth(today.getMonth() - i);
    monthDate.setDate(1);
    monthDate.setHours(0, 0, 0, 0);
    
    const nextMonth = new Date(monthDate);
    nextMonth.setMonth(monthDate.getMonth() + 1);
    
    const startStr = monthDate.toISOString().split('T')[0];
    const endStr = nextMonth.toISOString().split('T')[0];
    
    const workoutDates = await getWorkoutsInDateRange(db, workosId, startStr, endStr);
    
    monthlyCounts.push({
      month: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
      hasWorkout: workoutDates.length > 0,
    });
  }
  
  let streak = 0;
  for (const month of monthlyCounts) {
    if (month.hasWorkout) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}
