import { useState, useCallback, useEffect } from 'react';
import { type FormData, type SelectedExercise, type UndoState } from './types';
import { useAuth } from '@/routes/__root';
import { useUndo } from '@/hooks/useUndo';

interface UseTemplateEditorStateProps {
  mode: 'create' | 'edit';
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
}

interface UseTemplateEditorStateReturn {
  formData: FormData;
  errors: { name?: string; exercises?: string };
  setErrors: React.Dispatch<React.SetStateAction<{ name?: string; exercises?: string }>>;
  selectedExercises: SelectedExercise[];
  accessoryAddedWeights: Record<string, number>;
  redirecting: boolean;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  handleFormChange: (field: keyof FormData, value: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  validateForm: () => boolean;
  setSelectedExercises: React.Dispatch<React.SetStateAction<SelectedExercise[]>>;
  setAccessoryAddedWeights: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  pushUndo: (description: string, before: UndoState, after: UndoState) => void;
}

export function useTemplateEditorState({
  mode,
  initialData,
}: UseTemplateEditorStateProps): UseTemplateEditorStateReturn {
  const auth = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [accessoryAddedWeights, setAccessoryAddedWeights] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    notes: '',
  });
  const [errors, setErrors] = useState<{ name?: string; exercises?: string }>({});

  const {
    push: pushUndo,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndo<FormData>();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!auth.loading && auth.user && initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description || '',
        notes: initialData.notes || '',
      });
      setSelectedExercises(
        initialData.exercises.map((ex) => ({
          id: ex.id,
          exerciseId: ex.exerciseId,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          description: ex.description,
          isAccessory: false,
          isRequired: true,
        }))
      );
    }
  }, [auth.loading, auth.user, initialData]);

  const handleUndo = useCallback(() => {
    const previousState = undo();
    if (previousState) {
      if (previousState.name !== undefined) {
        setFormData(prev => ({ ...prev, name: previousState.name as string }));
      }
      if (previousState.description !== undefined) {
        setFormData(prev => ({ ...prev, description: previousState.description as string }));
      }
      if (previousState.notes !== undefined) {
        setFormData(prev => ({ ...prev, notes: previousState.notes as string }));
      }
      if (previousState.exercises) {
        setSelectedExercises(previousState.exercises);
      }
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      if (nextState.name !== undefined) {
        setFormData(prev => ({ ...prev, name: nextState.name as string }));
      }
      if (nextState.description !== undefined) {
        setFormData(prev => ({ ...prev, description: nextState.description as string }));
      }
      if (nextState.notes !== undefined) {
        setFormData(prev => ({ ...prev, notes: nextState.notes as string }));
      }
      if (nextState.exercises) {
        setSelectedExercises(nextState.exercises);
      }
    }
  }, [redo]);

  const handleFormChange = useCallback((field: keyof FormData, value: string) => {
    pushUndo(
      { description: `Change ${field}`, before: { [field]: formData[field] }, after: { [field]: value } },
      { ...formData, [field]: value }
    );
    setFormData(prev => ({ ...prev, [field]: value }));
  }, [formData, pushUndo]);

  const validateForm = useCallback(() => {
    const newErrors: { name?: string; exercises?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.name]);

  const pushUndoAction = useCallback((description: string, before: UndoState, after: UndoState) => {
    pushUndo(
      { description, before, after },
      { ...formData, exercises: selectedExercises }
    );
  }, [pushUndo, formData, selectedExercises]);

  return {
    formData,
    errors,
    setErrors,
    selectedExercises,
    accessoryAddedWeights,
    redirecting,
    loading,
    setLoading,
    handleFormChange,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    validateForm,
    setSelectedExercises,
    setAccessoryAddedWeights,
    pushUndo: pushUndoAction,
  };
}
