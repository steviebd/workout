import { TRAINING_MAX_PERCENTAGE, roundToPlate } from './utils';
import type { LiftType, OneRMValues, ProgramConfig, ProgramWorkout } from './types';

const wendler531Info = {
  slug: '531',
  name: '5/3/1 (Wendler)',
  description: 'The most popular strength program ever created. Flexible, sustainable, and proven to work.',
  difficulty: 'intermediate' as const,
  daysPerWeek: 4,
  estimatedWeeks: 12,
  totalSessions: 48,
  mainLifts: ['squat', 'bench', 'deadlift', 'ohp'] as LiftType[],
};

const WAVE_PERCENTAGES = {
  1: { sets: [0.65, 0.75, 0.85], reps: [5, 5, 5] },
  2: { sets: [0.70, 0.80, 0.90], reps: [3, 3, 3] },
  3: { sets: [0.75, 0.85, 0.95], reps: [5, 3, 5] },
  4: { sets: [0.40, 0.50, 0.60], reps: [5, 5, 5] },
};

function calculateTargetWeight(
  estimatedOneRM: number,
  week: number,
  session: number,
  _lift: string
): number {
  const trainingMax = estimatedOneRM * TRAINING_MAX_PERCENTAGE;
  const weekData = WAVE_PERCENTAGES[week as 1 | 2 | 3 | 4];
  const setIndex = session - 1;
  const percentage = weekData.sets[setIndex] || weekData.sets[0];
  return roundToPlate(trainingMax * percentage);
}

export function generateWorkouts(oneRMs: OneRMValues): ProgramWorkout[] {
  const workouts: ProgramWorkout[] = [];
  const lifts: Array<{ name: string; lift: LiftType; oneRM: number }> = [
    { name: 'Squat', lift: 'squat' as const, oneRM: oneRMs.squat },
    { name: 'Bench Press', lift: 'bench' as const, oneRM: oneRMs.bench },
    { name: 'Deadlift', lift: 'deadlift' as const, oneRM: oneRMs.deadlift },
    { name: 'Overhead Press', lift: 'ohp' as const, oneRM: oneRMs.ohp },
  ];

  for (let cycle = 1; cycle <= 3; cycle++) {
    for (const week of [1, 2, 3, 4] as const) {
      const weekData = WAVE_PERCENTAGES[week];
      
      for (let day = 1; day <= 4; day++) {
        const lift = lifts[day - 1];
        
        const exercises = [
          {
            name: lift.name,
            lift: lift.lift,
            sets: 3,
            reps: week === 4 ? 5 : weekData.reps[0],
            targetWeight: calculateTargetWeight(lift.oneRM, week, 1, lift.lift),
          },
          {
            name: `${lift.name} 2`,
            lift: lift.lift,
            sets: 1,
            reps: week === 4 ? 5 : weekData.reps[1],
            targetWeight: calculateTargetWeight(lift.oneRM, week, 2, lift.lift),
          },
          {
            name: `${lift.name} 3+`,
            lift: lift.lift,
            sets: 1,
            reps: weekData.reps[2],
            targetWeight: calculateTargetWeight(lift.oneRM, week, 3, lift.lift),
          },
        ];

        const weekNumber = (cycle - 1) * 4 + week;
        
        workouts.push({
          weekNumber,
          sessionNumber: (cycle - 1) * 4 + day,
          sessionName: `Cycle ${cycle} - Week ${week} - ${lift.name}`,
          exercises,
        });
      }
    }
  }

  return workouts;
}

export const wendler531: ProgramConfig = {
  info: wendler531Info,
  generateWorkouts,
  calculateTargetWeight,
};

export default wendler531;
