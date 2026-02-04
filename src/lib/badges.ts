import { eq, and, sql } from 'drizzle-orm';
import { createDb } from './db/index';
import { workouts, workoutSets, workoutExercises, userStreaks } from './db/schema';
import { calculateThirtyDayStreak, getTotalWorkouts } from './streaks';

export interface BadgeDefinition {
  id: string
  name: string
  description: string
  icon: 'flame' | 'dumbbell' | 'trophy' | 'crown' | 'medal' | 'star' | 'zap' | 'footprints' | 'check'
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

async function calculateStreakBadgeProgress(
  db: D1Database,
  workosId: string,
  requirement: number
): Promise<{ progress: number; unlocked: boolean; unlockedAt?: string }> {
  const thirtyDayStreak = await calculateThirtyDayStreak(db, workosId, 3, 12);
  const progress = thirtyDayStreak.maxConsecutive;

  const [streakRecord] = await createDb(db)
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.workosId, workosId));

  return {
    progress,
    unlocked: progress >= requirement,
    unlockedAt: progress >= requirement && streakRecord?.updatedAt ? streakRecord.updatedAt.split('T')[0] : undefined,
  };
}

async function calculateWeeklyBadgeProgress(
  db: D1Database,
  workosId: string,
  requirement: number
): Promise<{ progress: number; unlocked: boolean; unlockedAt?: string }> {
  const { getWeeklyWorkoutCount } = await import('./streaks');
  const weeklyCount = await getWeeklyWorkoutCount(db, workosId);

  return {
    progress: weeklyCount,
    unlocked: weeklyCount >= requirement,
    unlockedAt: weeklyCount >= requirement ? new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] : undefined,
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

async function calculateTotalWorkoutsBadgeProgress(
  db: D1Database,
  workosId: string,
  requirement: number
): Promise<{ progress: number; unlocked: boolean; unlockedAt?: string }> {
  const totalWorkouts = await getTotalWorkouts(db, workosId);

  const [streakRecord] = await createDb(db)
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.workosId, workosId));

  return {
    progress: totalWorkouts,
    unlocked: totalWorkouts >= requirement,
    unlockedAt: totalWorkouts >= requirement && streakRecord?.updatedAt ? streakRecord.updatedAt.split('T')[0] : undefined,
  };
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'weekly-3', name: 'Getting Started', description: 'Complete 3 workouts in a week', icon: 'check', category: 'consistency', requirement: 3 },
  { id: 'weekly-4', name: 'On Fire', description: 'Complete 4 workouts in a week', icon: 'check', category: 'consistency', requirement: 4 },
  { id: 'weekly-5', name: 'Unstoppable', description: 'Complete 5 workouts in a week', icon: 'check', category: 'consistency', requirement: 5 },
  { id: 'streak-4w', name: '30-Day Streak', description: '4 weeks with 3+ workouts each', icon: 'flame', category: 'streak', requirement: 4 },
  { id: 'streak-8w', name: '60-Day Streak', description: '8 weeks with 3+ workouts each', icon: 'flame', category: 'streak', requirement: 8 },
  { id: 'streak-12w', name: '90-Day Streak', description: '12 weeks with 3+ workouts each', icon: 'crown', category: 'streak', requirement: 12 },
  { id: 'volume-1000', name: '1000 Club', description: 'Lift over 1,000 total lbs/kg', icon: 'dumbbell', category: 'volume', requirement: 1000 },
  { id: 'volume-10000', name: '10K Club', description: 'Lift over 10,000 total lbs/kg', icon: 'dumbbell', category: 'volume', requirement: 10000 },
  { id: 'workouts-10', name: 'First 10', description: 'Complete 10 total workouts', icon: 'trophy', category: 'consistency', requirement: 10 },
  { id: 'workouts-25', name: 'Quarter Century', description: 'Complete 25 total workouts', icon: 'trophy', category: 'consistency', requirement: 25 },
  { id: 'workouts-50', name: 'Half Century', description: 'Complete 50 total workouts', icon: 'trophy', category: 'consistency', requirement: 50 },
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
        case 'consistency':
          if (def.id.startsWith('weekly-')) {
            result = await calculateWeeklyBadgeProgress(db, workosId, def.requirement);
          } else if (def.id.startsWith('workouts-')) {
            result = await calculateTotalWorkoutsBadgeProgress(db, workosId, def.requirement);
          } else {
            result = { progress: 0, unlocked: false };
          }
          break;
        case 'volume':
          result = await calculateVolumeBadgeProgress(db, workosId, def.requirement);
          break;
        case 'pr':
          result = await calculatePRBadgeProgress(db, workosId, def.requirement);
          break;
        default:
          result = { progress: 0, unlocked: false };
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
