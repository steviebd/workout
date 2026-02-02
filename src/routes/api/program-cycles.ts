import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import type { OneRMValues } from '~/lib/programs/types';
import { parseReps } from '~/lib/programs/accessory-data';
import {
  createProgramCycle,
  getActiveProgramCycles,
  getProgramCyclesByWorkosId,
} from '~/lib/db/program';
import { getSession } from '~/lib/session';
import { stronglifts } from '~/lib/programs/stronglifts';
import { wendler531 } from '~/lib/programs/wendler531';
import { madcow } from '~/lib/programs/madcow';
import { nsuns } from '~/lib/programs/nsuns';
import { candito } from '~/lib/programs/candito';
import { sheiko } from '~/lib/programs/sheiko';
import { nuckols } from '~/lib/programs/nuckols';
import { type Exercise } from '~/lib/db/exercise';
import { exerciseLibrary } from '~/lib/exercise-library';

const PROGRAM_MAP: Record<string, typeof stronglifts | typeof wendler531 | typeof madcow | typeof nsuns | typeof candito | typeof sheiko | typeof nuckols> = {
  'stronglifts-5x5': stronglifts,
  '531': wendler531,
  'madcow-5x5': madcow,
  'nsuns-lp': nsuns,
  'candito-6-week': candito,
  'sheiko': sheiko,
  'nuckols-28-programs': nuckols,
};

function normalizeExerciseName(name: string): string {
  return name.replace(/\s*\d+(\+)?$/, '').trim();
}

function getSetInfo(name: string, isAmrap?: boolean): { isAmrap: boolean } {
  return {
    isAmrap: isAmrap ?? name.includes('+'),
  };
}

function generateUUID(): string {
  return crypto.randomUUID();
}

interface ExerciseInfo {
  name: string;
  muscleGroup: string;
  libraryId?: string;
  description?: string;
}

async function getOrCreateExercisesBatch(
  db: D1Database,
  workosId: string,
  exerciseInfos: ExerciseInfo[]
): Promise<Map<string, Exercise>> {
  const exerciseMap = new Map<string, Exercise>();
  if (exerciseInfos.length === 0) return exerciseMap;
  
  const existingResult = await db.prepare(
    `SELECT * FROM exercises WHERE workos_id = ? AND is_deleted = 0`
  ).bind(workosId).all<{
    id: string;
    workos_id: string;
    name: string;
    muscle_group: string | null;
    description: string | null;
    library_id: string | null;
    local_id: string | null;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
  }>();
  
  const existingExercises = existingResult.results ?? [];
  const existingByName = new Map<string, Exercise>();
  for (const row of existingExercises) {
    existingByName.set(row.name.toLowerCase(), {
      id: row.id,
      workosId: row.workos_id,
      name: row.name,
      muscleGroup: row.muscle_group,
      description: row.description,
      libraryId: row.library_id,
      localId: row.local_id,
      isDeleted: row.is_deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  
  const toCreate: Array<{ id: string; info: ExerciseInfo }> = [];
  const seenNames = new Set<string>();
  
  for (const info of exerciseInfos) {
    const nameLower = info.name.toLowerCase();
    if (seenNames.has(nameLower)) continue;
    seenNames.add(nameLower);
    
    const existing = existingByName.get(nameLower);
    if (existing) {
      exerciseMap.set(nameLower, existing);
    } else {
      const id = generateUUID();
      toCreate.push({ id, info });
      exerciseMap.set(nameLower, {
        id,
        workosId,
        name: info.name,
        muscleGroup: info.muscleGroup,
        description: info.description ?? null,
        libraryId: info.libraryId ?? null,
        localId: null,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }
  
  if (toCreate.length > 0) {
    const statements = toCreate.map(({ id, info }) =>
      db.prepare(
        `INSERT INTO exercises (id, workos_id, name, muscle_group, description, library_id, is_deleted, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
      ).bind(id, workosId, info.name, info.muscleGroup, info.description ?? '', info.libraryId ?? null)
    );
    await db.batch(statements);
  }
  
  return exerciseMap;
}

export const Route = createFileRoute('/api/program-cycles')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const url = new URL(request.url);
          const status = url.searchParams.get('status') ?? undefined;
          const activeOnly = url.searchParams.get('active') === 'true';

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          let cycles;
          if (activeOnly) {
            cycles = await getActiveProgramCycles(db, session.workosId);
          } else {
            cycles = await getProgramCyclesByWorkosId(db, session.workosId, { status });
          }

          return Response.json(cycles);
        } catch (err) {
          console.error('Get program cycles error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          const session = await getSession(request);
          if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
          }

          const body = await request.json();
          const { programSlug, squat1rm, bench1rm, deadlift1rm, ohp1rm } = body as {
            programSlug: string;
            squat1rm: number;
            bench1rm: number;
            deadlift1rm: number;
            ohp1rm: number;
          };

          if (!programSlug || !squat1rm || !bench1rm || !deadlift1rm || !ohp1rm) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
          }

          const programConfig = PROGRAM_MAP[programSlug];
          if (!programConfig) {
            return Response.json({ error: 'Invalid program' }, { status: 400 });
          }

          const db = (env as { DB?: D1Database }).DB;
          if (!db) {
            return Response.json({ error: 'Database not available' }, { status: 500 });
          }

          const oneRMs: OneRMValues = { squat: squat1rm, bench: bench1rm, deadlift: deadlift1rm, ohp: ohp1rm };
          const workouts = programConfig.generateWorkouts(oneRMs);

          const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          const cycleName = `${programConfig.info.name} - ${monthYear}`;

          // Step 1: Collect all unique exercises needed
          const allExerciseInfos: ExerciseInfo[] = [];
          for (const workout of workouts) {
            for (const exercise of workout.exercises) {
              const muscleGroup = exercise.lift === 'squat' || exercise.lift === 'deadlift' || exercise.lift === 'row'
                ? 'Back'
                : exercise.lift === 'bench' || exercise.lift === 'ohp'
                  ? 'Chest'
                  : 'Shoulders';
              
              allExerciseInfos.push({
                name: normalizeExerciseName(exercise.name),
                muscleGroup,
              });
            }
            
            if (workout.accessories) {
              for (const accessory of workout.accessories) {
                let name = accessory.name;
                let muscleGroup = accessory.muscleGroup;
                const libraryId = accessory.libraryId;
                let description: string | undefined;
                
                if (accessory.libraryId) {
                  const libraryMatch = exerciseLibrary.find(e => e.id === accessory.libraryId);
                  if (libraryMatch) {
                    name = libraryMatch.name;
                    muscleGroup = libraryMatch.muscleGroup;
                    description = libraryMatch.description;
                  }
                }
                
                allExerciseInfos.push({ name, muscleGroup, libraryId, description });
              }
            }
          }

          // Step 2: Batch create/lookup all exercises in one operation
          const exerciseMap = await getOrCreateExercisesBatch(db, session.workosId, allExerciseInfos);

          // Step 3: Create program cycle
          const cycle = await createProgramCycle(db, session.workosId, {
            programSlug,
            name: cycleName,
            squat1rm,
            bench1rm,
            deadlift1rm,
            ohp1rm,
            totalSessionsPlanned: workouts.length,
          });

          // Step 4: Batch create all templates
          const templateIds: string[] = [];
          const templateStatements = workouts.map((workout) => {
            const id = generateUUID();
            templateIds.push(id);
            return db.prepare(
              `INSERT INTO templates (id, workos_id, name, description, program_cycle_id, is_deleted, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
            ).bind(
              id,
              session.workosId,
              `${cycleName} - ${workout.sessionName}`,
              `Week ${workout.weekNumber} - ${workout.sessionName}`,
              cycle.id
            );
          });
          await db.batch(templateStatements);

          // Step 5: Batch create all template exercises
          const templateExerciseStatements: D1PreparedStatement[] = [];
          for (let i = 0; i < workouts.length; i++) {
            const workout = workouts[i];
            const templateId = templateIds[i];
            let orderIndex = 0;
            const exerciseSetCounts = new Map<string, number>();
            
            for (const exercise of workout.exercises) {
              const normalizedName = normalizeExerciseName(exercise.name);
              const dbExercise = exerciseMap.get(normalizedName.toLowerCase());
              if (!dbExercise) continue;
              
              const currentCount = exerciseSetCounts.get(dbExercise.id) ?? 0;
              const setNumber = currentCount + 1;
              exerciseSetCounts.set(dbExercise.id, setNumber);
              
              const { isAmrap } = getSetInfo(exercise.name, exercise.isAmrap);
              
              templateExerciseStatements.push(
                db.prepare(
                  `INSERT INTO template_exercises (id, template_id, exercise_id, order_index, target_weight, added_weight, sets, reps, reps_raw, is_amrap, set_number, is_accessory, is_required) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                  generateUUID(),
                  templateId,
                  dbExercise.id,
                  orderIndex,
                  exercise.targetWeight,
                  0,
                  exercise.sets,
                  exercise.reps,
                  null,
                  isAmrap ? 1 : 0,
                  setNumber,
                  0,
                  1
                )
              );
              orderIndex++;
            }
            
            if (workout.accessories) {
              for (const accessory of workout.accessories) {
                let name = accessory.name;
                if (accessory.libraryId) {
                  const libraryMatch = exerciseLibrary.find(e => e.id === accessory.libraryId);
                  if (libraryMatch) name = libraryMatch.name;
                }
                
                const dbExercise = exerciseMap.get(name.toLowerCase());
                if (!dbExercise) continue;
                
                const parsedReps = parseReps(accessory.reps);
                
                templateExerciseStatements.push(
                  db.prepare(
                    `INSERT INTO template_exercises (id, template_id, exercise_id, order_index, target_weight, added_weight, sets, reps, reps_raw, is_amrap, set_number, is_accessory, is_required) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                  ).bind(
                    generateUUID(),
                    templateId,
                    dbExercise.id,
                    orderIndex,
                    accessory.targetWeight ?? null,
                    accessory.addedWeight ?? 0,
                    accessory.sets,
                    parsedReps.numericValue,
                    parsedReps.rawString,
                    0,
                    1,
                    1,
                    accessory.isRequired ? 1 : 0
                  )
                );
                orderIndex++;
              }
            }
          }
          
          // Batch template exercises in chunks (D1 has a limit of 100 statements per batch)
          const BATCH_SIZE = 100;
          for (let i = 0; i < templateExerciseStatements.length; i += BATCH_SIZE) {
            const chunk = templateExerciseStatements.slice(i, i + BATCH_SIZE);
            await db.batch(chunk);
          }

          // Step 6: Batch create all program cycle workouts
          const cycleWorkoutStatements = workouts.map((workout, i) => {
            const templateId = templateIds[i];
            const targetLifts = JSON.stringify([
              ...workout.exercises.map(e => ({ name: e.name, lift: e.lift, targetWeight: e.targetWeight, sets: e.sets, reps: e.reps })),
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
            
            return db.prepare(
              `INSERT INTO program_cycle_workouts (id, cycle_id, template_id, week_number, session_number, session_name, target_lifts, is_complete, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
            ).bind(
              generateUUID(),
              cycle.id,
              templateId,
              workout.weekNumber,
              workout.sessionNumber,
              workout.sessionName,
              targetLifts
            );
          });
          await db.batch(cycleWorkoutStatements);

          return Response.json(cycle, { status: 201 });
        } catch (err) {
          console.error('Create program cycle error:', err);
          return Response.json({ error: 'Server error' }, { status: 500 });
        }
      },
    },
  },
});

export default function ApiProgramCycles() {
  return null;
}
