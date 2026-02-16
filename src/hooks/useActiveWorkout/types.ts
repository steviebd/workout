export interface ActiveWorkoutExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  orderIndex: number;
  sets: ActiveWorkoutSet[];
  notes?: string;
}

export interface ActiveWorkoutSet {
  id: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  isComplete: boolean;
  completedAt?: string;
}

export interface ActiveWorkout {
  id: string;
  name: string;
  templateId?: string;
  startedAt: string;
  notes?: string;
  exercises: ActiveWorkoutExercise[];
}
