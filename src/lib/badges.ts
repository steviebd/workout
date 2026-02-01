import { eq, and, sql } from 'drizzle-orm';
import { createDb } from './db/index';
import { workouts, workoutSets, workoutExercises, userStreaks } from './db/schema';

export interface BadgeDefinition {
  id: string
  name: string
  description: string
  icon: 'flame' | 'dumbbell' | 'trophy' | 'crown' | 'medal' | 'star' | 'zap' | 'footprints'
  category: 'streak' | 'volume' | 'pr' | 'consistency'
  requirement: number
}

interface BadgeResult {
  id: string
  name: string
  description: string
  icon: string
  category: string
  progress: number
  requirement: number
  unlocked: boolean
  unlockedAt?: string
}

async function calculateStreakBadgeProgress(db: D1Database, workosId: string, requirement: number): Promise<{ progress: number; unlocked: boolean; unlockedAt?: string }> {
  const { calculateCurrentStreak, calculateLongestStreak } = await import('./streaks');
  const currentStreak = await calculateCurrentStreak(db, workosId);
  const longestStreak = await calculateLongestStreak(db, workosId);
  const streak = Math.max(currentStreak, longestStreak);

  const [streakRecord] = await createDb(db)
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.workosId, workosId));

  return {
    progress: streak,
    unlocked: streak >= requirement,
    unlockedAt: streak >= requirement && streakRecord?.updatedAt ? streakRecord.updatedAt.split('T')[0] : undefined,
  };
}

async function calculateVolumeBadgeProgress(db: D1Database, workosId: string, requirement: number): Promise<{ progress: number; unlocked: boolean; unlockedAt?: string }> {
  const drizzleDb = createDb(db);

  const result = await drizzleDb
    .select({
      total: sql<number>`coalesce(sum(${workoutSets.weight} * ${workoutSets.reps}), 0)`
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workouts.workosId, workosId),
      eq(workoutSets.isComplete, true)
    ));

  const totalVolume = result[0]?.total ?? 0;

  return {
    progress: Math.floor(totalVolume),
    unlocked: totalVolume >= requirement,
  };
}

async function calculatePRBadgeProgress(db: D1Database, workosId: string, requirement: number): Promise<{ progress: number; unlocked: boolean; unlockedAt?: string }> {
  const drizzleDb = createDb(db);

  const result = await drizzleDb
    .select({
      count: sql<number>`count(distinct ${workoutExercises.exerciseId})`
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(
      eq(workouts.workosId, workosId),
      sql`exists (
        select 1 from ${workoutSets}
        where ${workoutSets.workoutExerciseId} = ${workoutExercises.id}
        and ${workoutSets.isComplete} = true
      )`
    ));

  const exerciseCount = result[0]?.count ?? 0;

  return {
    progress: exerciseCount,
    unlocked: exerciseCount >= requirement,
  };
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'streak-7', name: '7 Day Streak', description: 'Work out 7 days in a row', icon: 'flame', category: 'streak', requirement: 7 },
  { id: 'streak-14', name: '14 Day Streak', description: 'Work out 14 days in a row', icon: 'flame', category: 'streak', requirement: 14 },
  { id: 'streak-30', name: '30 Day Streak', description: 'Work out 30 days in a row', icon: 'flame', category: 'streak', requirement: 30 },
  { id: 'streak-60', name: '60 Day Streak', description: 'Work out 60 days in a row', icon: 'flame', category: 'streak', requirement: 60 },
  { id: 'streak-100', name: '100 Day Streak', description: 'Work out 100 days in a row', icon: 'crown', category: 'streak', requirement: 100 },
  { id: 'streak-365', name: 'Year of Fitness', description: 'Work out 365 days in a row', icon: 'crown', category: 'streak', requirement: 365 },
  { id: 'volume-1000', name: '1000 Club', description: 'Lift over 1,000 total lbs/kg', icon: 'dumbbell', category: 'volume', requirement: 1000 },
  { id: 'volume-10000', name: '10K Club', description: 'Lift over 10,000 total lbs/kg', icon: 'dumbbell', category: 'volume', requirement: 10000 },
  { id: 'pr-first', name: 'First PR', description: 'Set your first personal record', icon: 'trophy', category: 'pr', requirement: 1 },
  { id: 'pr-5', name: '5 Exercises', description: 'Complete workouts with 5 different exercises', icon: 'trophy', category: 'pr', requirement: 5 },
];

export async function calculateAllBadges(db: D1Database, workosId: string): Promise<BadgeResult[]> {
  const badges = await Promise.all(
    BADGE_DEFINITIONS.map(async (def) => {
      let result: { progress: number; unlocked: boolean; unlockedAt?: string };

      switch (def.category) {
        case 'streak':
          result = await calculateStreakBadgeProgress(db, workosId, def.requirement);
          break;
        case 'volume':
          result = await calculateVolumeBadgeProgress(db, workosId, def.requirement);
          break;
      case 'pr':
        result = await calculatePRBadgeProgress(db, workosId, def.requirement);
        break;
      case 'consistency':
        result = { progress: 0, unlocked: false };
        break;
    }

      return {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        category: def.category,
        progress: result.progress,
        requirement: def.requirement,
        unlocked: result.unlocked,
        unlockedAt: result.unlockedAt,
      };
    })
  );

  return badges;
}
