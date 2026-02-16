import { eq } from 'drizzle-orm';
import { type NewProgramCycleWorkout, programCycleWorkouts, templates, templateExercises, generateId } from '../schema';
import { getDb, calculateChunkSize, type DbOrTx } from '../index';
import type { UserProgramCycle, ProgramCycleWorkout, TargetLift, TargetLiftWorkout } from './types';

function getBaseExerciseName(name: string): string {
  return name.replace(/\s+\d+$/, '').replace(/\s+\d+\+$/, '');
}

/**
 * Creates new workouts for a program cycle with target lift data
 * @param db - D1 database instance
 * @param cycleId - The program cycle ID
 * @param cycleWorkouts - Array of workout definitions with target lifts
 * @param defaultScheduledDate - Optional default date for scheduled workouts
 */
export async function createProgramCycleWorkouts(
  dbOrTx: DbOrTx,
  cycleId: string,
  cycleWorkouts: TargetLiftWorkout[],
  defaultScheduledDate?: string
): Promise<void> {
  const db = getDb(dbOrTx);

  const workoutData: NewProgramCycleWorkout[] = cycleWorkouts.map((workout) => {
    const targetLifts = JSON.stringify([
      ...(workout.exercises?.map(e => ({ name: e.name, lift: e.lift, targetWeight: e.targetWeight, sets: e.sets, reps: e.reps })) ?? []),
      ...(workout.accessories?.map(a => ({
        name: a.name,
        accessoryId: a.accessoryId,
        targetWeight: a.targetWeight,
        addedWeight: a.addedWeight,
        sets: a.sets,
        reps: a.reps,
        isAccessory: true,
        isRequired: a.isRequired,
      })) ?? []),
    ]);

    return {
      id: generateId(),
      cycleId,
      templateId: null,
      weekNumber: workout.weekNumber,
      sessionNumber: workout.sessionNumber,
      sessionName: workout.sessionName,
      targetLifts,
      isComplete: false,
      scheduledDate: defaultScheduledDate ?? new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
      scheduledTime: null,
    };
  });

  const BATCH_SIZE = 4;

  for (let i = 0; i < workoutData.length; i += BATCH_SIZE) {
    const batch = workoutData.slice(i, i + BATCH_SIZE);
    await db.insert(programCycleWorkouts).values(batch).run();
  }
}

/**
 * Generates a template from a program cycle workout
 * @param dbOrTx - D1 database instance or transaction
 * @param workosId - The user's WorkOS ID
 * @param cycleWorkout - The program cycle workout to generate a template from
 * @param cycle - The program cycle containing the workout
 * @returns The ID of the newly created template
 * @throws Will throw if no target lifts are found for the workout
 */
export async function generateTemplateFromWorkout(
  dbOrTx: DbOrTx,
  workosId: string,
  cycleWorkout: ProgramCycleWorkout,
  cycle: UserProgramCycle
): Promise<string> {
  const db = getDb(dbOrTx);

  console.log('generateTemplateFromWorkout - cycleWorkout.targetLifts:', cycleWorkout.targetLifts, 'type:', typeof cycleWorkout.targetLifts);
  
  let targetLifts: TargetLift[] = [];
  if (cycleWorkout.targetLifts) {
    let parsed: unknown;
    if (typeof cycleWorkout.targetLifts === 'string') {
      parsed = JSON.parse(cycleWorkout.targetLifts);
    } else {
      parsed = cycleWorkout.targetLifts;
    }
    
    if (Array.isArray(parsed)) {
      targetLifts = parsed as TargetLift[];
    } else if (parsed && typeof parsed === 'object') {
      const obj = parsed as { exercises?: TargetLift[]; accessories?: TargetLift[] };
      const targetExercises = obj.exercises ?? [];
      const accessories = (obj.accessories ?? []).map(a => ({ ...a, isAccessory: true, isRequired: false }));
      targetLifts = [...targetExercises, ...accessories];
    }
  }

  if (targetLifts.length === 0) {
    throw new Error('No target lifts found for workout');
  }

  const templateName = `${cycle.name} - ${cycleWorkout.sessionName}`;

  const template = await db
    .insert(templates)
    .values({
      workosId,
      name: templateName,
      description: cycleWorkout.sessionName,
      programCycleId: cycle.id,
    })
    .returning()
    .get();

  const templateExercisesData: Array<typeof templateExercises.$inferInsert> = [];
  let orderIndex = 0;
  const exerciseSetCounts = new Map<string, number>();

  // Import here to avoid circular dependency
  const { getOrCreateExerciseForWorkout } = await import('./exercise-creator');

  for (const lift of targetLifts) {
    const baseName = getBaseExerciseName(lift.name);
    const exerciseId = await getOrCreateExerciseForWorkout(db, workosId, baseName, lift.lift);

    const currentCount = exerciseSetCounts.get(exerciseId) ?? 0;
    const setNumber = currentCount + 1;
    exerciseSetCounts.set(exerciseId, setNumber);

    const isAmrap = lift.name.endsWith('+');

    templateExercisesData.push({
      templateId: template.id,
      exerciseId,
      orderIndex,
      targetWeight: lift.targetWeight,
      addedWeight: lift.addedWeight ?? 0,
      sets: lift.sets,
      reps: lift.reps,
      repsRaw: null,
      isAmrap,
      setNumber,
      isAccessory: lift.isAccessory ?? false,
      isRequired: lift.isRequired ?? true,
    });

    orderIndex++;
  }

  const CHUNK_SIZE = calculateChunkSize(12);

  for (let i = 0; i < templateExercisesData.length; i += CHUNK_SIZE) {
    const batch = templateExercisesData.slice(i, i + CHUNK_SIZE);
    await db.insert(templateExercises).values(batch).run();
  }

  await db
    .update(programCycleWorkouts)
    .set({ templateId: template.id, updatedAt: new Date().toISOString() })
    .where(eq(programCycleWorkouts.id, cycleWorkout.id))
    .run();

  return template.id;
}
