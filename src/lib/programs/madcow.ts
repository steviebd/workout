import { roundToPlate } from './utils';
import { generateWorkoutAccessories } from './accessory-data';
import type { LiftType, OneRMValues, ProgramConfig, ProgramWorkout, ProgramAccessory } from './types';

const madcowInfo = {
  slug: 'madcow-5x5',
  name: 'Madcow 5×5',
  description: 'Bridge from beginner to advanced. Built-in deloads and weekly weight increases.',
  difficulty: 'intermediate' as const,
  daysPerWeek: 3,
  estimatedWeeks: 8,
  totalSessions: 24,
  mainLifts: ['squat', 'bench', 'deadlift', 'ohp'] as LiftType[],
  category: 'powerlifting' as const,
};

const WEEK_PERCENTAGES = [
  { squat: 1.025, bench: 1.025, deadlift: 1.025, ohp: 1.025 },
  { squat: 0.975, bench: 0.975, deadlift: 0.975, ohp: 0.975 },
  { squat: 1.00, bench: 1.00, deadlift: 1.00, ohp: 1.00 },
  { squat: 1.05, bench: 1.05, deadlift: 1.05, ohp: 1.05 },
  { squat: 1.00, bench: 1.00, deadlift: 1.00, ohp: 1.00 },
  { squat: 1.025, bench: 1.025, deadlift: 1.025, ohp: 1.025 },
  { squat: 1.075, bench: 1.075, deadlift: 1.075, ohp: 1.075 },
  { squat: 1.05, bench: 1.05, deadlift: 1.05, ohp: 1.05, isDeload: true },
];

export const madcowAccessories: ProgramAccessory[] = [
  { accessoryId: 'dips', sets: 3, reps: 8, isRequired: false },
  { accessoryId: 'hyperextensions', sets: 2, reps: '10-12', isRequired: false },
  { accessoryId: 'pullups', sets: 3, reps: 8, isRequired: false },
  { accessoryId: 'planks', sets: 3, reps: '30sec', isRequired: false },
  { accessoryId: 'barbell-curl', sets: 3, reps: 8, isRequired: false },
  { accessoryId: 'skullcrushers', sets: 3, reps: 8, isRequired: false },
];

export function getMadcowAccessories(_week: number, session: number): ProgramAccessory[] {
  const dayIndex = (session - 1) % 3;
  if (dayIndex === 0) {
    return madcowAccessories.filter(a => ['dips', 'hyperextensions'].includes(a.accessoryId));
  }
  if (dayIndex === 1) {
    return madcowAccessories.filter(a => ['pullups', 'planks'].includes(a.accessoryId));
  }
  return madcowAccessories.filter(a => ['barbell-curl', 'skullcrushers'].includes(a.accessoryId));
}

function calculateTargetWeight(
  estimatedOneRM: number,
  week: number,
  session: number,
  lift: string
): number {
  const weekData = WEEK_PERCENTAGES[week - 1];
  let percentage = 1;
  if (lift === 'squat') percentage = weekData.squat;
  else if (lift === 'bench') percentage = weekData.bench;
  else if (lift === 'deadlift') percentage = weekData.deadlift;
  else if (lift === 'ohp') percentage = weekData.ohp;
  else if (lift === 'row') percentage = weekData.bench;
  
  const baseWeight = estimatedOneRM * 0.75;
  const progression = (week - 1) * 3 + session;
  const increase = progression * 2.5;
  const weight = (baseWeight * percentage) + increase;
  return roundToPlate(weight);
}

export function generateWorkouts(oneRMs: OneRMValues): ProgramWorkout[] {
  const workouts: ProgramWorkout[] = [];

  for (let week = 1; week <= 8; week++) {
    const weekData = WEEK_PERCENTAGES[week - 1];
    const isDeload = weekData.isDeload ?? false;

    for (let session = 1; session <= 3; session++) {
      const isDayA = session % 2 === 1;

      const exercises = [
        {
          name: 'Squat',
          lift: 'squat' as const,
          sets: 5,
          reps: isDeload ? 3 : 5,
          targetWeight: calculateTargetWeight(oneRMs.squat, week, session, 'squat'),
        },
        ...(isDayA
          ? [
              {
                name: 'Bench Press',
                lift: 'bench' as const,
                sets: 5,
                reps: isDeload ? 3 : 5,
                targetWeight: calculateTargetWeight(oneRMs.bench, week, session, 'bench'),
              },
              {
                name: 'Barbell Row',
                lift: 'row' as const,
                sets: 5,
                reps: isDeload ? 3 : 5,
                targetWeight: calculateTargetWeight(oneRMs.bench * 0.6, week, session, 'row'),
              },
            ]
          : [
              {
                name: 'Overhead Press',
                lift: 'ohp' as const,
                sets: 5,
                reps: isDeload ? 3 : 5,
                targetWeight: calculateTargetWeight(oneRMs.ohp, week, session, 'ohp'),
              },
              {
                name: 'Deadlift',
                lift: 'deadlift' as const,
                sets: 5,
                reps: isDeload ? 3 : 5,
                targetWeight: calculateTargetWeight(oneRMs.deadlift, week, session, 'deadlift'),
              },
            ]),
      ];

      workouts.push({
        weekNumber: week,
        sessionNumber: (week - 1) * 3 + session,
        sessionName: `Week ${week} - ${isDayA ? 'Day A' : 'Day B'}${isDeload ? ' (Deload)' : ''}`,
        exercises,
      });
    }
  }

  for (const workout of workouts) {
    const accessories = getMadcowAccessories(workout.weekNumber, workout.sessionNumber);
    if (accessories.length > 0) {
      workout.accessories = generateWorkoutAccessories(accessories, oneRMs);
    }
  }

  return workouts;
}

export const madcow: ProgramConfig = {
  info: madcowInfo,
  generateWorkouts,
  calculateTargetWeight,
};

export default madcow;
