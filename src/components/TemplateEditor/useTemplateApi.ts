import { useCallback, useEffect, useState } from 'react';
import { type FormData, type SelectedExercise } from './types';
import { useToast } from '@/components/ToastProvider';
import { useAutoSave } from '@/hooks/useAutoSave';
import { type Template, type Exercise, type TemplateExercise } from '@/lib/db/schema';

interface UseTemplateApiProps {
  mode: 'create' | 'edit';
  templateId?: string;
  formData: FormData;
  selectedExercises: SelectedExercise[];
  accessoryAddedWeights: Record<string, number>;
}

interface UseTemplateApiReturn {
  exercises: Exercise[];
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
  const [exercises, setExercises] = useState<Exercise[]>([]);
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

        toast.success('Template created successfully!');
        setCreatedTemplate(template);
      } else {
        await syncExercises(template.id);
        toast.success('Template saved!');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError({ message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [selectedExercises, mode, toast, saveTemplate, syncExercises, accessoryAddedWeights]);

  const fetchExercises = useCallback(async () => {
    try {
      const response = await fetch('/api/exercises', {
        credentials: 'include',
      });

      if (response.ok) {
        const data: Exercise[] = await response.json();
        setExercises(data);
      }
    } catch (err) {
      console.error('Failed to fetch exercises:', err);
    }
  }, []);

  const fetchTemplateExercises = useCallback(async (currentTemplateId: string, onWeights?: (weights: Record<string, number>) => void) => {
    try {
      const response = await fetch(`/api/templates/${currentTemplateId}/exercises`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data: TemplateExercise[] = await response.json();
        const accessoryWeights: Record<string, number> = {};
        data.forEach((te) => {
          if (te.isAccessory && te.exerciseId && te.addedWeight) {
            accessoryWeights[te.exerciseId] = te.addedWeight;
          }
        });
        if (onWeights) {
          onWeights(accessoryWeights);
        }
      }
    } catch (err) {
      console.error('Failed to fetch template exercises:', err);
    }
  }, []);

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
      console.log('Auto-saved');
    },
    onError: (saveError) => {
      console.error('Auto-save failed:', saveError);
      setError({ message: 'Failed to auto-save changes', retry: () => void autoSave.save() });
      toast.error('Failed to auto-save');
    },
  });

  useEffect(() => {
    if (mode === 'edit' && templateId) {
      void fetchTemplateExercises(templateId);
    }
  }, [mode, templateId, fetchTemplateExercises]);

  return {
    exercises,
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
