import { TRAINING_MAX_PERCENTAGE, roundToPlate } from './utils';
import { generateWorkoutAccessories } from './accessory-data';
import type { LiftType, OneRMValues, ProgramConfig, ProgramWorkout, ProgramAccessory } from './types';

const canditoInfo = {
  slug: 'candito-6-week',
  name: 'Candito 6 Week',
  description: 'Block periodization with 3-week strength block followed by 3-week peaking block. Great for meet preparation.',
  difficulty: 'advanced' as const,
  daysPerWeek: 4,
  estimatedWeeks: 6,
  totalSessions: 24,
  mainLifts: ['squat', 'bench', 'deadlift', 'ohp'] as LiftType[],
};

const STRENGTH_BLOCK = [
  { week: 1, sets: [4, 3, 2, 0], percentages: [0.75, 0.80, 0.85], baseReps: 4, amrapPercent: 0.75, isDeload: false },
  { week: 2, sets: [4, 3, 2, 0], percentages: [0.80, 0.85, 0.90], baseReps: 3, amrapPercent: 0.80, isDeload: false },
  { week: 3, sets: [4, 3, 2, 0], percentages: [0.85, 0.90, 0.95], baseReps: 2, amrapPercent: 0.85, isDeload: false },
] as const;

const PEAKING_BLOCK = [
  { week: 4, sets: [3, 2, 2, 0], percentages: [0.875, 0.925, 0.975], baseReps: 3, amrapPercent: 0.875, isDeload: false },
  { week: 5, sets: [3, 2, 1, 0], percentages: [0.925, 0.95, 1.0], baseReps: 2, amrapPercent: 0.925, isDeload: false },
  { week: 6, sets: [2, 2, 1, 0], percentages: [0.95, 0.975, 1.025], baseReps: 2, amrapPercent: 0, isDeload: true },
] as const;

export const canditoAccessories: ProgramAccessory[] = [
  { accessoryId: 'dumbbell-row', sets: 3, reps: '6-12', isRequired: true },
  { accessoryId: 'dumbbell-ohp', sets: 3, reps: '6-12', isRequired: true },
  { accessoryId: 'weighted-pullups', sets: 3, reps: '6-12', isRequired: true },
  { accessoryId: 'romanian-dl', sets: 3, reps: 8, isRequired: true },
];

export function getCanditoAccessories(_week: number, session: number): ProgramAccessory[] {
  const dayIndex = (session - 1) % 4;
  if (dayIndex > 1) return [];
  return canditoAccessories;
}

function calculateTargetWeight(
  estimatedOneRM: number,
  week: number,
  session: number,
  _lift: string,
  isT2: boolean = false
): number {
  const trainingMax = estimatedOneRM * TRAINING_MAX_PERCENTAGE;
  let percentage = 0.75;

  if (week <= 3) {
    const blockWeek = STRENGTH_BLOCK[week - 1];
    const setIndex = session - 1;
    percentage = blockWeek.percentages[setIndex] || blockWeek.percentages[0];
  } else {
    const blockWeek = PEAKING_BLOCK[week - 4];
    const setIndex = session - 1;
    percentage = blockWeek.percentages[setIndex] || blockWeek.percentages[0];
  }

  if (isT2) {
    percentage *= 0.75;
  }

  return roundToPlate(trainingMax * percentage);
}

export function generateWorkouts(oneRMs: OneRMValues): ProgramWorkout[] {
  const workouts: ProgramWorkout[] = [];

  const dayConfigs = [
    { t1: 'squat' as const, t2: 'bench' as const },
    { t1: 'bench' as const, t2: 'squat' as const },
    { t1: 'deadlift' as const, t2: 'ohp' as const },
    { t1: 'ohp' as const, t2: 'deadlift' as const },
  ];

  for (let week = 1; week <= 6; week++) {
    const isStrengthBlock = week <= 3;
    const blockData = isStrengthBlock ? STRENGTH_BLOCK[week - 1] : PEAKING_BLOCK[week - 4];
    const isDeload = blockData.isDeload ?? false;

    for (let day = 1; day <= 4; day++) {
      const config = dayConfigs[day - 1];
      const t1OneRM = oneRMs[config.t1];
      const t2OneRM = oneRMs[config.t2];

      const liftName = config.t1.charAt(0).toUpperCase() + config.t1.slice(1);
      const t2LiftName = config.t2.charAt(0).toUpperCase() + config.t2.slice(1);

      const t1Sets = [
        { name: liftName, lift: config.t1, sets: blockData.sets[0], reps: isDeload ? 3 : blockData.baseReps, targetWeight: calculateTargetWeight(t1OneRM, week, 1, config.t1, false), isAmrap: false },
        { name: `${liftName} 2`, lift: config.t1, sets: blockData.sets[1], reps: isDeload ? 3 : blockData.baseReps - 1, targetWeight: calculateTargetWeight(t1OneRM, week, 2, config.t1, false), isAmrap: false },
        { name: `${liftName} 3+`, lift: config.t1, sets: blockData.sets[2], reps: isDeload ? 3 : blockData.baseReps - 2, targetWeight: calculateTargetWeight(t1OneRM, week, 3, config.t1, false), isAmrap: true },
      ];

      const t2Sets = [
        { name: t2LiftName, lift: config.t2, sets: 3, reps: isDeload ? 4 : 6, targetWeight: calculateTargetWeight(t2OneRM, week, 1, config.t2, true), isAmrap: false },
        { name: `${t2LiftName} 2`, lift: config.t2, sets: 3, reps: isDeload ? 4 : 6, targetWeight: calculateTargetWeight(t2OneRM, week, 2, config.t2, true), isAmrap: false },
      ];

      const dayNames = ['Day 1 (Squat/Bench)', 'Day 2 (Bench/Squat)', 'Day 3 (Deadlift/OHP)', 'Day 4 (OHP/Deadlift)'];
      const blockName = isStrengthBlock ? 'Strength' : 'Peaking';

      workouts.push({
        weekNumber: week,
        sessionNumber: (week - 1) * 4 + day,
        sessionName: `Week ${week} (${blockName}) - ${dayNames[day - 1]}${isDeload ? ' (Deload)' : ''}`,
        exercises: [...t1Sets, ...t2Sets],
      });
    }
  }

  for (const workout of workouts) {
    const accessories = getCanditoAccessories(workout.weekNumber, workout.sessionNumber);
    if (accessories.length > 0) {
      workout.accessories = generateWorkoutAccessories(accessories, oneRMs);
    }
  }

  return workouts;
}

export const candito: ProgramConfig = {
  info: canditoInfo,
  generateWorkouts,
  calculateTargetWeight: (oneRM, week, session, lift) => calculateTargetWeight(oneRM, week, session, lift, false),
};

export default candito;
