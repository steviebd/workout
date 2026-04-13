import { eq, and, sql } from 'drizzle-orm';
import {
  nutritionChatMessages,
  nutritionEntries,
  userBodyStats,
  nutritionTrainingContext,
  whoopRecoveries,
  whoopCycles,
  programCycleWorkouts,
  userProgramCycles,
} from './schema';
import { getDb, type DbOrTx } from './index';

export interface ChatMessage {
  id: string;
  workosId: string;
  date: string;
  role: string;
  content: string;
  hasImage: boolean;
  createdAt: string;
}

export interface DailyIntake {
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
}

export interface WhoopData {
  recoveryScore: number | null;
  recoveryStatus: string | null;
  hrv: number | null;
  restingHeartRate: number | null;
  caloriesBurned: number | null;
  totalStrain: number | null;
}

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface TrainingContext {
  type: 'rest_day' | 'cardio' | 'powerlifting' | 'custom';
  customLabel?: string;
  programName?: string;
  sessionName?: string;
  targetLifts?: string;
}

export interface SystemPromptContext {
  bodyweightKg: number | null;
  energyUnit: 'kcal' | 'kj';
  weightUnit: 'kg' | 'lbs';
  trainingContext: TrainingContext | null;
  whoopData: WhoopData;
  dailyIntake: DailyIntake;
  macroTargets: MacroTargets;
}

export async function saveChatMessage(
  dbOrTx: DbOrTx,
  workosId: string,
  date: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  hasImage = false
): Promise<void> {
  const db = getDb(dbOrTx);

  await db.insert(nutritionChatMessages).values({
    workosId,
    date,
    role,
    content,
    hasImage,
  });
}

export async function getChatHistory(
  dbOrTx: DbOrTx,
  workosId: string,
  date: string
): Promise<ChatMessage[]> {
  const db = getDb(dbOrTx);

  const messages = await db
    .select()
    .from(nutritionChatMessages)
    .where(
      and(
        eq(nutritionChatMessages.workosId, workosId),
        eq(nutritionChatMessages.date, date)
      )
    )
    .orderBy(nutritionChatMessages.createdAt);

  return messages as ChatMessage[];
}

export async function countImageAnalysesToday(
  dbOrTx: DbOrTx,
  workosId: string,
  date: string
): Promise<number> {
  const db = getDb(dbOrTx);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(nutritionChatMessages)
    .where(
      and(
        eq(nutritionChatMessages.workosId, workosId),
        eq(nutritionChatMessages.date, date),
        eq(nutritionChatMessages.role, 'user'),
        eq(nutritionChatMessages.hasImage, true)
      )
    )
    .get();

  return result?.count ?? 0;
}

export async function getUserBodyStats(
  dbOrTx: DbOrTx,
  workosId: string
): Promise<{ bodyweightKg: number | null; targetCalories: number | null; targetProteinG: number | null; targetCarbsG: number | null; targetFatG: number | null } | null> {
  const db = getDb(dbOrTx);

  const stats = await db
    .select()
    .from(userBodyStats)
    .where(eq(userBodyStats.workosId, workosId))
    .get();

  if (!stats) return null;

  return {
    bodyweightKg: stats.bodyweightKg,
    targetCalories: stats.targetCalories,
    targetProteinG: stats.targetProteinG,
    targetCarbsG: stats.targetCarbsG,
    targetFatG: stats.targetFatG,
  };
}

export async function getTodayIntake(
  dbOrTx: DbOrTx,
  workosId: string,
  date: string
): Promise<DailyIntake> {
  const db = getDb(dbOrTx);

  const entries = await db
    .select()
    .from(nutritionEntries)
    .where(
      and(
        eq(nutritionEntries.workosId, workosId),
        eq(nutritionEntries.date, date),
        eq(nutritionEntries.isDeleted, false)
      )
    );

  return entries.reduce(
    (acc, entry) => ({
      totalCalories: acc.totalCalories + (entry.calories ?? 0),
      totalProteinG: acc.totalProteinG + (entry.proteinG ?? 0),
      totalCarbsG: acc.totalCarbsG + (entry.carbsG ?? 0),
      totalFatG: acc.totalFatG + (entry.fatG ?? 0),
    }),
    { totalCalories: 0, totalProteinG: 0, totalCarbsG: 0, totalFatG: 0 }
  );
}

export async function getTrainingContext(
  dbOrTx: DbOrTx,
  workosId: string,
  date: string
): Promise<TrainingContext | null> {
  const db = getDb(dbOrTx);

  const scheduledWorkout = await db
    .select({
      sessionName: programCycleWorkouts.sessionName,
      targetLifts: programCycleWorkouts.targetLifts,
      programName: userProgramCycles.name,
    })
    .from(programCycleWorkouts)
    .leftJoin(
      userProgramCycles,
      eq(programCycleWorkouts.cycleId, userProgramCycles.id)
    )
    .where(
      and(
        eq(programCycleWorkouts.scheduledDate, date),
        eq(userProgramCycles.workosId, workosId),
        eq(userProgramCycles.status, 'active')
      )
    )
    .get();

  if (scheduledWorkout) {
    return {
      type: 'powerlifting',
      programName: scheduledWorkout.programName ?? undefined,
      sessionName: scheduledWorkout.sessionName ?? undefined,
      targetLifts: scheduledWorkout.targetLifts ?? undefined,
    };
  }

  const manualContext = await db
    .select()
    .from(nutritionTrainingContext)
    .where(
      and(
        eq(nutritionTrainingContext.workosId, workosId),
        eq(nutritionTrainingContext.date, date)
      )
    )
    .get();

  if (manualContext) {
    return {
      type: manualContext.trainingType as TrainingContext['type'],
      customLabel: manualContext.customLabel ?? undefined,
    };
  }

  return null;
}

export async function getWhoopData(
  dbOrTx: DbOrTx,
  workosId: string,
  date: string
): Promise<WhoopData> {
  const db = getDb(dbOrTx);

  const [recovery, cycle] = await Promise.all([
    db
      .select()
      .from(whoopRecoveries)
      .where(
        and(
          eq(whoopRecoveries.workosId, workosId),
          eq(whoopRecoveries.date, date)
        )
      )
      .get(),
    db
      .select()
      .from(whoopCycles)
      .where(
        and(
          eq(whoopCycles.workosId, workosId),
          eq(whoopCycles.date, date)
        )
      )
      .get(),
  ]);

  return {
    recoveryScore: recovery?.score ?? null,
    recoveryStatus: recovery?.status ?? null,
    hrv: recovery?.hrv ?? null,
    restingHeartRate: recovery?.restingHeartRate ?? null,
    caloriesBurned: cycle?.caloriesBurned ?? null,
    totalStrain: cycle?.totalStrain ?? null,
  };
}

export function calculateMacroTargets(
  bodyweightKg: number,
  trainingType: TrainingContext['type'] | null,
  hasProgram: boolean,
  overrides?: { targetCalories?: number; targetProteinG?: number; targetCarbsG?: number; targetFatG?: number }
): MacroTargets {
  if (overrides?.targetCalories && overrides?.targetProteinG && overrides?.targetCarbsG && overrides?.targetFatG) {
    return {
      calories: overrides.targetCalories,
      proteinG: overrides.targetProteinG,
      carbsG: overrides.targetCarbsG,
      fatG: overrides.targetFatG,
    };
  }

  const proteinG = Math.round(bodyweightKg * 2.0);
  const fatG = Math.round(bodyweightKg * 0.8);

  let baseCals = bodyweightKg * 33;

  if (hasProgram && trainingType === 'powerlifting') {
    baseCals *= 1.15;
  } else if (trainingType === 'cardio') {
    baseCals *= 1.05;
  }

  const proteinCals = proteinG * 4;
  const fatCals = fatG * 9;
  const carbsCals = baseCals - proteinCals - fatCals;
  const carbsG = Math.round(carbsCals / 4);

  return {
    calories: Math.round(baseCals),
    proteinG,
    carbsG,
    fatG,
  };
}

export interface NutritionEntryRow {
  id: string;
  workosId: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealType: string;
  date: string;
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
}

export async function getNutritionEntriesForDay(
  dbOrTx: DbOrTx,
  workosId: string,
  date: string
): Promise<NutritionEntryRow[]> {
  const db = getDb(dbOrTx);

  const entries = await db
    .select()
    .from(nutritionEntries)
    .where(
      and(
        eq(nutritionEntries.workosId, workosId),
        eq(nutritionEntries.date, date),
        eq(nutritionEntries.isDeleted, false)
      )
    )
    .orderBy(nutritionEntries.createdAt)
    .all();

  return entries as NutritionEntryRow[];
}

export async function createNutritionEntryRow(
  dbOrTx: DbOrTx,
  workosId: string,
  data: {
    name: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    mealType: string;
    date: string;
  }
): Promise<NutritionEntryRow> {
  const db = getDb(dbOrTx);

  const [entry] = await db
    .insert(nutritionEntries)
    .values({
      workosId,
      name: data.name,
      calories: data.calories,
      proteinG: data.proteinG,
      carbsG: data.carbsG,
      fatG: data.fatG,
      mealType: data.mealType,
      date: data.date,
      loggedAt: new Date().toISOString(),
    })
    .returning();

  return entry as NutritionEntryRow;
}

export async function getNutritionEntryById(
  dbOrTx: DbOrTx,
  id: string,
  workosId: string
): Promise<NutritionEntryRow | null> {
  const db = getDb(dbOrTx);

  const entry = await db
    .select()
    .from(nutritionEntries)
    .where(
      and(
        eq(nutritionEntries.id, id),
        eq(nutritionEntries.workosId, workosId),
        eq(nutritionEntries.isDeleted, false)
      )
    )
    .get();

  return entry ? (entry as NutritionEntryRow) : null;
}

export async function updateNutritionEntryRow(
  dbOrTx: DbOrTx,
  id: string,
  workosId: string,
  data: {
    name?: string;
    calories?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    mealType?: string;
  }
): Promise<NutritionEntryRow | null> {
  const db = getDb(dbOrTx);

  const [entry] = await db
    .update(nutritionEntries)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(nutritionEntries.id, id),
        eq(nutritionEntries.workosId, workosId),
        eq(nutritionEntries.isDeleted, false)
      )
    )
    .returning();

  return entry ? (entry as NutritionEntryRow) : null;
}

export async function softDeleteNutritionEntry(
  dbOrTx: DbOrTx,
  id: string,
  workosId: string
): Promise<boolean> {
  const db = getDb(dbOrTx);

  const result = await db
    .update(nutritionEntries)
    .set({
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(nutritionEntries.id, id),
        eq(nutritionEntries.workosId, workosId),
        eq(nutritionEntries.isDeleted, false)
      )
    )
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export interface DailyConsumed {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DailyTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DailySummary {
  consumed: DailyConsumed;
  targets: DailyTargets;
  bodyweightKg: number | null;
}

export async function getDailySummary(
  dbOrTx: DbOrTx,
  workosId: string,
  date: string
): Promise<DailySummary> {
  const db = getDb(dbOrTx);

  const entries = await db
    .select({
      calories: nutritionEntries.calories,
      proteinG: nutritionEntries.proteinG,
      carbsG: nutritionEntries.carbsG,
      fatG: nutritionEntries.fatG,
    })
    .from(nutritionEntries)
    .where(
      and(
        eq(nutritionEntries.workosId, workosId),
        eq(nutritionEntries.date, date),
        eq(nutritionEntries.isDeleted, false)
      )
    )
    .all();

  const consumed: DailyConsumed = {
    calories: entries.reduce((sum, e) => sum + (e.calories ?? 0), 0),
    proteinG: entries.reduce((sum, e) => sum + (e.proteinG ?? 0), 0),
    carbsG: entries.reduce((sum, e) => sum + (e.carbsG ?? 0), 0),
    fatG: entries.reduce((sum, e) => sum + (e.fatG ?? 0), 0),
  };

  const stats = await getUserBodyStats(dbOrTx, workosId);

  const targets: DailyTargets = {
    calories: stats?.targetCalories ?? 2500,
    proteinG: stats?.targetProteinG ?? 150,
    carbsG: stats?.targetCarbsG ?? 250,
    fatG: stats?.targetFatG ?? 80,
  };

  return {
    consumed,
    targets,
    bodyweightKg: stats?.bodyweightKg ?? null,
  };
}

export async function upsertBodyStatsRow(
  dbOrTx: DbOrTx,
  workosId: string,
  data: {
    bodyweightKg?: number;
    heightCm?: number;
    targetCalories?: number;
    targetProteinG?: number;
    targetCarbsG?: number;
    targetFatG?: number;
    recordedAt?: string;
  }
): Promise<typeof userBodyStats.$inferSelect> {
  const db = getDb(dbOrTx);

  const existing = await db
    .select()
    .from(userBodyStats)
    .where(eq(userBodyStats.workosId, workosId))
    .get();

  if (existing) {
    const [updated] = await db
      .update(userBodyStats)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userBodyStats.workosId, workosId))
      .returning();

    return updated as typeof userBodyStats.$inferSelect;
  }

  const [created] = await db
    .insert(userBodyStats)
    .values({
      workosId,
      ...data,
      recordedAt: data.recordedAt ?? new Date().toISOString(),
    })
    .returning();

  return created as typeof userBodyStats.$inferSelect;
}

export interface NutritionTrainingContextRow {
  id: string;
  workosId: string;
  date: string;
  trainingType: string;
  customLabel: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getTrainingContextRow(
  dbOrTx: DbOrTx,
  workosId: string,
  date: string
): Promise<NutritionTrainingContextRow | null> {
  const db = getDb(dbOrTx);

  const context = await db
    .select()
    .from(nutritionTrainingContext)
    .where(
      and(
        eq(nutritionTrainingContext.workosId, workosId),
        eq(nutritionTrainingContext.date, date)
      )
    )
    .get();

  return context ? (context as NutritionTrainingContextRow) : null;
}

export async function upsertTrainingContextRow(
  dbOrTx: DbOrTx,
  workosId: string,
  date: string,
  data: {
    trainingType: string;
    customLabel?: string;
  }
): Promise<NutritionTrainingContextRow> {
  const db = getDb(dbOrTx);

  const existing = await db
    .select()
    .from(nutritionTrainingContext)
    .where(
      and(
        eq(nutritionTrainingContext.workosId, workosId),
        eq(nutritionTrainingContext.date, date)
      )
    )
    .get();

  if (existing) {
    const [updated] = await db
      .update(nutritionTrainingContext)
      .set({
        trainingType: data.trainingType,
        customLabel: data.customLabel,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(nutritionTrainingContext.workosId, workosId),
          eq(nutritionTrainingContext.date, date)
        )
      )
      .returning();

    return updated as NutritionTrainingContextRow;
  }

  const [created] = await db
    .insert(nutritionTrainingContext)
    .values({
      workosId,
      date,
      trainingType: data.trainingType,
      customLabel: data.customLabel,
    })
    .returning();

  return created as NutritionTrainingContextRow;
}
