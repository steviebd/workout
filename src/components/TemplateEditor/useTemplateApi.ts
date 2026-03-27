import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormData, type SelectedExercise } from './types';
import { useToast } from '@/components/app/ToastProvider';
import { useAutoSave } from '@/hooks/useAutoSave';
import { type Template, type Exercise, type TemplateExercise } from '@/lib/db/schema';
import { trackEvent } from '@/lib/analytics';

interface UseTemplateApiProps {
  mode: 'create' | 'edit';
  templateId?: string;
  formData: FormData;
  selectedExercises: SelectedExercise[];
  accessoryAddedWeights: Record<string, number>;
}

interface UseTemplateApiReturn {
  exercises: Exercise[];
  exercisesLoading: boolean;
  saving: boolean;
  createdTemplate: Template | null;
  error: { message: string; retry?: () => void } | null;
  autoSave: {
    saving: boolean;
    saved: boolean;
    save: () => Promise<void>;
    scheduleSave: () => void;
  };
  fetchExercises: () => Promise<void>;
  fetchTemplateExercises: (currentTemplateId: string) => Promise<void>;
  saveTemplate: () => Promise<Template | null>;
  syncExercises: (currentTemplateId: string) => Promise<void>;
  handleSubmit: () => Promise<void>;
  setCreatedTemplate: React.Dispatch<React.SetStateAction<Template | null>>;
}

export function useTemplateApi({
  mode,
  templateId,
  formData,
  selectedExercises,
  accessoryAddedWeights,
}: UseTemplateApiProps): UseTemplateApiReturn {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [createdTemplate, setCreatedTemplate] = useState<Template | null>(null);
  const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null);

  const saveTemplate = useCallback(async (): Promise<Template | null> => {
    try {
      const url = mode === 'create' ? '/api/templates' : `/api/templates/${templateId}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description ?? undefined,
          notes: formData.notes ?? undefined,
        }),
      });

      if (!response.ok) {
        const data: { message?: string } = await response.json();
        throw new Error(data.message ?? 'Failed to save template');
      }

      return await response.json();
    } catch (err) {
      console.error('Save template error:', err);
      return null;
    }
  }, [formData.name, formData.description, formData.notes, mode, templateId]);

  const syncExercises = useCallback(async (currentTemplateId: string) => {
    const newExerciseIds = new Set(selectedExercises.map(se => se.exerciseId));

    const existingRes = await fetch(`/api/templates/${currentTemplateId}/exercises`, {
      credentials: 'include',
    });
    const existingExercises: Array<{ exerciseId: string; orderIndex: number }> = await existingRes.json();

    for (const existing of existingExercises) {
      if (!newExerciseIds.has(existing.exerciseId)) {
        await fetch(`/api/templates/${currentTemplateId}/exercises/${existing.exerciseId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }
    }

    for (let i = 0; i < selectedExercises.length; i++) {
      const se = selectedExercises[i];
      const existing = existingExercises.find((ee: { exerciseId: string }) => ee.exerciseId === se.exerciseId);

      if (existing) {
        if (existing.orderIndex !== i) {
          await fetch(`/api/templates/${currentTemplateId}/exercises/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              exerciseOrders: selectedExercises.map((se2, idx) => ({
                exerciseId: se2.exerciseId,
                orderIndex: idx,
              })),
            }),
          });
        }
      } else {
        await fetch(`/api/templates/${currentTemplateId}/exercises`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            exerciseId: se.exerciseId,
            orderIndex: i,
            isAccessory: se.isAccessory ?? false,
            isRequired: se.isRequired ?? true,
            sets: se.sets,
            reps: se.reps,
            repsRaw: se.repsRaw,
            targetWeight: se.targetWeight,
            addedWeight: se.isAccessory 
              ? (accessoryAddedWeights[se.exerciseId] ?? se.addedWeight ?? 0)
              : 0,
          }),
        });
      }
    }
  }, [selectedExercises, accessoryAddedWeights]);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const template = await saveTemplate();
      if (!template) {
        throw new Error('Failed to save template');
      }

      if (mode === 'create') {
        await Promise.all(
          selectedExercises.map((exercise, index) =>
            fetch(`/api/templates/${template.id}/exercises`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                exerciseId: exercise.exerciseId,
                orderIndex: index,
                isAccessory: exercise.isAccessory ?? false,
                isRequired: exercise.isRequired ?? true,
                sets: exercise.sets,
                reps: exercise.reps,
                repsRaw: exercise.repsRaw,
                targetWeight: exercise.targetWeight,
                addedWeight: exercise.isAccessory 
                  ? (accessoryAddedWeights[exercise.exerciseId] ?? exercise.addedWeight ?? 0)
                  : 0,
              }),
            })
          )
        );

        void trackEvent('template_created', {
          template_id: template.id,
          template_name: formData.name,
          exercise_count: selectedExercises.length,
        });
        toast.success('Template created successfully!');
        setCreatedTemplate(template);
      } else {
        await syncExercises(template.id);
        void trackEvent('template_updated', {
          template_id: template.id,
          template_name: formData.name,
          exercise_count: selectedExercises.length,
        });
        toast.success('Template saved!');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError({ message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [selectedExercises, mode, toast, saveTemplate, syncExercises, accessoryAddedWeights, formData.name]);

  const { data: exercisesData, isLoading: exercisesLoading } = useQuery<Exercise[]>({
    queryKey: ['template-editor-exercises'],
    queryFn: async () => {
      const response = await fetch('/api/exercises', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch exercises');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: templateExercisesData } = useQuery<TemplateExercise[]>({
    queryKey: ['template-exercises', templateId],
    queryFn: async () => {
      if (!templateId) throw new Error('No template ID');
      const response = await fetch(`/api/templates/${templateId}/exercises`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch template exercises');
      return response.json();
    },
    enabled: mode === 'edit' && !!templateId,
    staleTime: 5 * 60 * 1000,
  });

  const exercises: Exercise[] = exercisesData ?? [];

  const fetchTemplateExercises = useCallback(async (_currentTemplateId: string, onWeights?: (weights: Record<string, number>) => void) => {
    const accessoryWeights: Record<string, number> = {};
    if (templateExercisesData) {
      templateExercisesData.forEach((te) => {
        if (te.isAccessory && te.exerciseId && te.addedWeight) {
          accessoryWeights[te.exerciseId] = te.addedWeight;
        }
      });
      if (onWeights) {
        onWeights(accessoryWeights);
      }
    }
  }, [templateExercisesData]);

  const fetchExercises = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['template-editor-exercises'] });
  }, [queryClient]);

  const autoSave = useAutoSave({
    data: {
      ...formData,
      exerciseCount: selectedExercises.length,
      exerciseIds: selectedExercises.map(e => e.exerciseId).join(','),
    },
    onSave: async () => {
      if (mode === 'edit' && templateId) {
        void saveTemplate();
        void syncExercises(templateId);
      }
    },
    enabled: mode === 'edit',
    delay: 1500,
    onSuccess: () => {
      setError(null);
    },
    onError: (saveError) => {
      console.error('Auto-save failed:', saveError);
      setError({ message: 'Failed to auto-save changes', retry: () => void autoSave.save() });
      toast.error('Failed to auto-save');
    },
  });

  return {
    exercises,
    exercisesLoading,
    saving,
    createdTemplate,
    error,
    autoSave: {
      saving: autoSave.saving,
      saved: autoSave.saved,
      save: autoSave.save,
      scheduleSave: autoSave.scheduleSave,
    },
    fetchExercises,
    fetchTemplateExercises,
    saveTemplate,
    syncExercises,
    handleSubmit,
    setCreatedTemplate,
  };
}
