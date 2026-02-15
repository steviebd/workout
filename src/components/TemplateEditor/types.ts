import { type Template, type Exercise, type TemplateExercise } from '@/lib/db/schema';

export interface TemplateEditorProps {
  mode: 'create' | 'edit';
  templateId?: string;
  initialData?: {
    name: string;
    description: string;
    notes: string;
    exercises: Array<{
      id: string;
      exerciseId: string;
      name: string;
      muscleGroup: string | null;
      description: string | null;
    }>;
  };
  onSaved?: (template: Template) => void;
}

export interface SelectedExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  libraryId?: string | null;
  isAmrap?: boolean;
  isAccessory?: boolean;
  isRequired?: boolean;
  sets?: number;
  reps?: number;
  repsRaw?: string;
  targetWeight?: number;
  addedWeight?: number;
}

export interface FormData {
  name: string;
  description: string;
  notes: string;
  exercises?: SelectedExercise[];
}

export interface UndoState {
  name?: string;
  description?: string;
  notes?: string;
  exercises?: SelectedExercise[];
}

export type { Template, Exercise, TemplateExercise };
