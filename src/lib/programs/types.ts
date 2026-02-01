export type LiftType = 'squat' | 'bench' | 'deadlift' | 'ohp' | 'row';

export type ProgramDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface ProgramInfo {
  slug: string;
  name: string;
  description: string;
  difficulty: ProgramDifficulty;
  daysPerWeek: number;
  estimatedWeeks: number;
  totalSessions: number;
  mainLifts: LiftType[];
}

export interface ProgramExercise {
  name: string;
  lift: LiftType;
  sets: number;
  reps: number;
}

export interface ProgramSession {
  weekNumber: number;
  sessionNumber: number;
  name: string;
  exercises: ProgramExercise[];
}

export interface OneRMValues {
  squat: number;
  bench: number;
  deadlift: number;
  ohp: number;
}

export interface ProgramWorkout {
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  exercises: Array<{
    name: string;
    lift: LiftType;
    sets: number;
    reps: number;
    targetWeight: number;
  }>;
}

export interface ProgramConfig {
  info: ProgramInfo;
  generateWorkouts(oneRMs: OneRMValues): ProgramWorkout[];
  calculateTargetWeight(estimatedOneRM: number, week: number, session: number, lift: LiftType): number;
}

export interface ProgramListItem {
  slug: string;
  name: string;
  description: string;
  difficulty: ProgramDifficulty;
  daysPerWeek: number;
  estimatedWeeks: number;
}

export const PROGRAM_SLUGS = {
  stronglifts5x5: 'stronglifts-5x5',
  wendler531: '531',
  madcow5x5: 'madcow-5x5',
  candito6Week: 'candito-6-week',
  nsunsLp: 'nsuns-lp',
  sheiko: 'sheiko',
  nuckols28: 'nuckols-28-programs',
} as const;

export type ProgramSlug = typeof PROGRAM_SLUGS[keyof typeof PROGRAM_SLUGS];
