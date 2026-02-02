import { roundToPlate } from './utils';
import { generateWorkoutAccessories } from './accessory-data';
import type { LiftType, OneRMValues, ProgramConfig, ProgramWorkout, ProgramAccessory } from './types';

const sheikoInfo = {
  slug: 'sheiko',
  name: 'Sheiko',
  description: 'Russian-style high volume programming at moderate intensity. Excellent for technique work and building work capacity.',
  difficulty: 'advanced' as const,
  daysPerWeek: 4,
  estimatedWeeks: 8,
  totalSessions: 32,
  mainLifts: ['squat', 'bench', 'deadlift', 'ohp'] as LiftType[],
};

const VOLUME_DAY = {
  squat: { sets: 6, reps: 3, percentage: 0.75 },
  bench: { sets: 4, reps: 4, percentage: 0.70 },
  deadlift: { sets: 5, reps: 3, percentage: 0.80 },
  ohp: { sets: 4, reps: 4, percentage: 0.65 },
};

const INTENSITY_DAY = {
  squat: { sets: 5, reps: 2, percentage: 0.85 },
  bench: { sets: 3, reps: 2, percentage: 0.75 },
  deadlift: { sets: 4, reps: 2, percentage: 0.90 },
  ohp: { sets: 3, reps: 2, percentage: 0.70 },
};

export const sheikoAccessories: ProgramAccessory[] = [
  { accessoryId: 'pullups', sets: 4, reps: '8-12', isRequired: false },
  { accessoryId: 'dumbbell-row', sets: 3, reps: '8-12', isRequired: false },
  { accessoryId: 'dumbbell-curl', sets: 3, reps: '8-12', isRequired: false },
  { accessoryId: 'planks', sets: 3, reps: '30sec', isRequired: false },
  { accessoryId: 'face-pulls', sets: 3, reps: '15-20', isRequired: false },
];

export function getSheikoAccessories(_week: number, _session: number): ProgramAccessory[] {
  return sheikoAccessories;
}

function calculateTargetWeight(
  estimatedOneRM: number,
  week: number,
  _session: number,
  lift: string,
  isVolume: boolean = true
): number {
  const config = isVolume ? VOLUME_DAY : INTENSITY_DAY;
  const liftConfig = config[lift as keyof typeof config];

  const weekModifiers: Record<number, number> = {
    1: 0.90,
    2: 0.925,
    3: 0.95,
    4: 0.975,
    5: 0.85,
    6: 0.875,
    7: 0.90,
    8: 0.70,
  };

  const modifier = weekModifiers[week] || 0.90;
  const percentage = liftConfig.percentage * modifier;
  return roundToPlate(estimatedOneRM * percentage);
}

export function generateWorkouts(oneRMs: OneRMValues): ProgramWorkout[] {
  const workouts: ProgramWorkout[] = [];

  for (let week = 1; week <= 8; week++) {
    const isVolumeWeek = week % 2 === 1;
    const isDeload = week === 8;

    const weekConfig = isVolumeWeek ? VOLUME_DAY : INTENSITY_DAY;

    workouts.push({
      weekNumber: week,
      sessionNumber: (week - 1) * 4 + 1,
      sessionName: `Week ${week} - Day 1 (Squat/Bench)${isDeload ? ' (Deload)' : ''}`,
      exercises: [
        {
          name: 'Squat',
          lift: 'squat' as const,
          sets: isDeload ? 3 : weekConfig.squat.sets,
          reps: isDeload ? 2 : weekConfig.squat.reps,
          targetWeight: calculateTargetWeight(oneRMs.squat, week, 1, 'squat', isVolumeWeek),
        },
        {
          name: 'Bench Press',
          lift: 'bench' as const,
          sets: isDeload ? 2 : weekConfig.bench.sets,
          reps: isDeload ? 3 : weekConfig.bench.reps,
          targetWeight: calculateTargetWeight(oneRMs.bench, week, 1, 'bench', isVolumeWeek),
        },
      ],
    });

    workouts.push({
      weekNumber: week,
      sessionNumber: (week - 1) * 4 + 2,
      sessionName: `Week ${week} - Day 2 (Deadlift/OHP)${isDeload ? ' (Deload)' : ''}`,
      exercises: [
        {
          name: 'Deadlift',
          lift: 'deadlift' as const,
          sets: isDeload ? 2 : weekConfig.deadlift.sets,
          reps: isDeload ? 2 : weekConfig.deadlift.reps,
          targetWeight: calculateTargetWeight(oneRMs.deadlift, week, 1, 'deadlift', isVolumeWeek),
        },
        {
          name: 'Overhead Press',
          lift: 'ohp' as const,
          sets: isDeload ? 2 : weekConfig.ohp.sets,
          reps: isDeload ? 3 : weekConfig.ohp.reps,
          targetWeight: calculateTargetWeight(oneRMs.ohp, week, 1, 'ohp', isVolumeWeek),
        },
      ],
    });

    workouts.push({
      weekNumber: week,
      sessionNumber: (week - 1) * 4 + 3,
      sessionName: `Week ${week} - Day 3 (Squat/Bench)${isDeload ? ' (Deload)' : ''}`,
      exercises: [
        {
          name: 'Squat',
          lift: 'squat' as const,
          sets: isDeload ? 3 : weekConfig.squat.sets - 1,
          reps: isDeload ? 2 : weekConfig.squat.reps,
          targetWeight: calculateTargetWeight(oneRMs.squat, week, 2, 'squat', isVolumeWeek),
        },
        {
          name: 'Bench Press',
          lift: 'bench' as const,
          sets: isDeload ? 2 : weekConfig.bench.sets - 1,
          reps: isDeload ? 3 : weekConfig.bench.reps,
          targetWeight: calculateTargetWeight(oneRMs.bench, week, 2, 'bench', isVolumeWeek),
        },
      ],
    });

    workouts.push({
      weekNumber: week,
      sessionNumber: (week - 1) * 4 + 4,
      sessionName: `Week ${week} - Day 4 (Deadlift/OHP)${isDeload ? ' (Deload)' : ''}`,
      exercises: [
        {
          name: 'Deadlift',
          lift: 'deadlift' as const,
          sets: isDeload ? 2 : weekConfig.deadlift.sets - 1,
          reps: isDeload ? 2 : weekConfig.deadlift.reps,
          targetWeight: calculateTargetWeight(oneRMs.deadlift, week, 2, 'deadlift', isVolumeWeek),
        },
        {
          name: 'Overhead Press',
          lift: 'ohp' as const,
          sets: isDeload ? 2 : weekConfig.ohp.sets - 1,
          reps: isDeload ? 3 : weekConfig.ohp.reps,
          targetWeight: calculateTargetWeight(oneRMs.ohp, week, 2, 'ohp', isVolumeWeek),
        },
      ],
    });
  }

  for (const workout of workouts) {
    const accessories = getSheikoAccessories(workout.weekNumber, workout.sessionNumber);
    if (accessories.length > 0) {
      workout.accessories = generateWorkoutAccessories(accessories, oneRMs);
    }
  }

  return workouts;
}

export const sheiko: ProgramConfig = {
  info: sheikoInfo,
  generateWorkouts,
  calculateTargetWeight: (oneRM, week, session, lift) => calculateTargetWeight(oneRM, week, session, lift, true),
};

export default sheiko;
