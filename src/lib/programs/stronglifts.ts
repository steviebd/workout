import { roundToPlate } from './utils';
import { generateWorkoutAccessories } from './accessory-data';
import type { LiftType, OneRMValues, ProgramConfig, ProgramWorkout, ProgramAccessory } from './types';

const strongliftsInfo = {
  slug: 'stronglifts-5x5',
  name: 'StrongLifts 5×5',
  description: 'The classic beginner program that has helped millions get stronger. Simple, effective, and proven.',
  difficulty: 'beginner' as const,
  daysPerWeek: 3,
  estimatedWeeks: 8,
  totalSessions: 24,
  mainLifts: ['squat', 'bench', 'deadlift', 'ohp', 'row'] as LiftType[],
  category: 'general-strength' as const,
};

export const strongliftsAccessories: ProgramAccessory[] = [
  { accessoryId: 'pullups', sets: 3, reps: 8, isRequired: false },
  { accessoryId: 'dips', sets: 3, reps: 8, isRequired: false },
  { accessoryId: 'skullcrushers', sets: 3, reps: 8, isRequired: false },
  { accessoryId: 'barbell-curl', sets: 3, reps: 8, isRequired: false },
];

export function getStrongliftsAccessories(_week: number, session: number): ProgramAccessory[] {
  const isDayA = session % 2 === 1;
  return strongliftsAccessories.filter(acc => {
    if (isDayA) {
      return ['pullups', 'dips', 'skullcrushers'].includes(acc.accessoryId);
    }
    return ['barbell-curl'].includes(acc.accessoryId);
  });
}

function calculateTargetWeight(
  estimatedOneRM: number,
  week: number,
  session: number,
  _lift: string
): number {
  const progression = (week - 1) * 3 + session;
  const baseWeight = estimatedOneRM * 0.5;
  return roundToPlate(baseWeight + progression * 2.5);
}

export function generateWorkouts(oneRMs: OneRMValues): ProgramWorkout[] {
  const workouts: ProgramWorkout[] = [];
  let workoutIndex = 0;

  for (let week = 1; week <= 12; week++) {
    for (let session = 1; session <= 3; session++) {
      workoutIndex++;
      const isDayA = session % 2 === 1;

      const exercises = [
        {
          name: 'Squat',
          lift: 'squat' as const,
          sets: 5,
          reps: 5,
          targetWeight: calculateTargetWeight(oneRMs.squat, week, workoutIndex, 'squat'),
        },
        ...(isDayA
          ? [
              {
                name: 'Bench Press',
                lift: 'bench' as const,
                sets: 5,
                reps: 5,
                targetWeight: calculateTargetWeight(oneRMs.bench, week, workoutIndex, 'bench'),
              },
              {
                name: 'Barbell Row',
                lift: 'row' as const,
                sets: 5,
                reps: 5,
                targetWeight: calculateTargetWeight(oneRMs.bench * 0.6, week, workoutIndex, 'row'),
              },
            ]
          : [
              {
                name: 'Overhead Press',
                lift: 'ohp' as const,
                sets: 5,
                reps: 5,
                targetWeight: calculateTargetWeight(oneRMs.ohp, week, workoutIndex, 'ohp'),
              },
              {
                name: 'Deadlift',
                lift: 'deadlift' as const,
                sets: 5,
                reps: 5,
                targetWeight: calculateTargetWeight(oneRMs.deadlift, week, workoutIndex, 'deadlift'),
              },
            ]),
      ];

      workouts.push({
        weekNumber: week,
        sessionNumber: session,
        sessionName: `Week ${week} - ${isDayA ? 'Day A' : 'Day B'}`,
        exercises,
      });
    }
  }

  for (const workout of workouts) {
    const accessories = getStrongliftsAccessories(workout.weekNumber, workout.sessionNumber);
    if (accessories.length > 0) {
      workout.accessories = generateWorkoutAccessories(accessories, oneRMs);
    }
  }

  return workouts;
}

export const stronglifts: ProgramConfig = {
  info: strongliftsInfo,
  generateWorkouts,
  calculateTargetWeight,
};

export default stronglifts;
