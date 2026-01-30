import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Loader2, Save, Undo, Redo } from 'lucide-react';
import { useAuth } from '@/routes/__root';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/Collapsible';
import { ExerciseSearch } from '@/components/ExerciseSearch';
import { ExerciseList } from '@/components/ExerciseList';
import { InlineEditExercise } from '@/components/InlineEditExercise';
import { useUndo } from '@/hooks/useUndo';
import { useAutoSave } from '@/hooks/useAutoSave';
import { type Template, type Exercise } from '@/lib/db/schema';
import { Drawer, DrawerContent, DrawerClose, DrawerHeader, DrawerTitle } from '@/components/ui/Drawer';

interface TemplateEditorProps {
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

interface SelectedExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  libraryId?: string | null;
}

interface FormData {
  name: string;
  description: string;
  notes: string;
  exercises?: SelectedExercise[];
}

export function TemplateEditor({
  mode,
  templateId,
  initialData,
  onSaved,
}: TemplateEditorProps) {
  const auth = useAuth();
  const toast = useToast();
  const [redirecting, setRedirecting] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [createdTemplate, setCreatedTemplate] = useState<Template | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    notes: '',
  });

  const [errors, setErrors] = useState<{ name?: string; exercises?: string }>({});
  const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null);

  const {
    push: pushUndo,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndo<FormData>();

  const handleUndo = useCallback(() => {
    const previousState = undo();
    if (previousState) {
      if (previousState.name !== undefined) {
        setFormData(prev => ({ ...prev, ...previousState }));
      }
      if (previousState.exercises) {
        setSelectedExercises(previousState.exercises as SelectedExercise[]);
      }
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      if (nextState.name !== undefined) {
        setFormData(prev => ({ ...prev, ...nextState }));
      }
      if (nextState.exercises) {
        setSelectedExercises(nextState.exercises as SelectedExercise[]);
      }
    }
  }, [redo]);

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
    } finally {
      setLoading(false);
    }
  }, []);

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
          }),
        });
      }
    }
  }, [selectedExercises]);

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
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      void fetchExercises();
      if (initialData) {
        setFormData({
          name: initialData.name,
          description: initialData.description || '',
          notes: initialData.notes || '',
        });
        setSelectedExercises(
          initialData.exercises.map(ex => ({
            id: ex.id,
            exerciseId: ex.exerciseId,
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            description: ex.description,
          }))
        );
      }
    }
  }, [auth.loading, auth.user, initialData, fetchExercises]);

  const validateForm = useCallback(() => {
    const newErrors: { name?: string; exercises?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.name]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    if (selectedExercises.length === 0) {
      setErrors({ exercises: 'Add at least one exercise to the template' });
      return;
    }

    setSaving(true);

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
              }),
            })
          )
        );

        toast.success('Template created successfully!');
        setCreatedTemplate(template);
      } else {
        await syncExercises(template.id);
        toast.success('Template saved!');
        onSaved?.(template);
      }
      } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError({ message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [selectedExercises, validateForm, mode, toast, onSaved, saveTemplate, syncExercises]);

  const handleAddExercise = useCallback(async (exercise: Exercise | { id: string; name: string; muscleGroup: string | null; description: string | null; isLibrary?: boolean }) => {
    if (selectedExercises.some(se => se.name === exercise.name)) {
      toast.warning('Exercise already added to template');
      return;
    }

    let exerciseId = exercise.id;
    let libraryId: string | undefined;

    if ('isLibrary' in exercise && exercise.isLibrary) {
      const existing = exercises.find(e => e.libraryId === exercise.id);
      if (existing) {
        exerciseId = existing.id;
        libraryId = exercise.id;
      } else {
        try {
          const response = await fetch('/api/exercises', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: exercise.name,
              muscleGroup: exercise.muscleGroup,
              description: exercise.description,
              libraryId: exercise.id,
            }),
          });

          if (!response.ok) throw new Error('Failed to create exercise');

          const created = await response.json() as Exercise;
          exerciseId = created.id;
          libraryId = exercise.id;
          void fetchExercises();
        } catch {
          toast.error('Failed to add library exercise');
          return;
        }
      }
    }

    const newExercise: SelectedExercise = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      exerciseId,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      description: exercise.description,
      libraryId,
    };

    pushUndo({
      description: 'Add exercise',
      before: { exercises: [...selectedExercises] },
      after: { exercises: [...selectedExercises, newExercise] },
    }, { ...formData, exercises: [...selectedExercises] });

    setSelectedExercises(prev => [...prev, newExercise]);
    autoSave.scheduleSave();
  }, [selectedExercises, exercises, pushUndo, formData, toast, autoSave, fetchExercises]);

  const handleRemoveExercise = useCallback((id: string) => {
    const exercise = selectedExercises.find(se => se.id === id);
    if (!exercise) return;

    pushUndo({
      description: `Remove ${exercise.name}`,
      before: { exercises: [...selectedExercises] },
      after: { exercises: selectedExercises.filter(se => se.id !== id) },
    }, { ...formData, exercises: [...selectedExercises] });

    setSelectedExercises(prev => prev.filter(se => se.id !== id));
    autoSave.scheduleSave();
  }, [selectedExercises, pushUndo, formData, autoSave]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newExercises = [...selectedExercises];
    [newExercises[fromIndex], newExercises[toIndex]] = [
      newExercises[toIndex],
      newExercises[fromIndex],
    ];

    pushUndo({
      description: 'Reorder exercises',
      before: { exercises: [...selectedExercises] },
      after: { exercises: newExercises },
    }, { ...formData, exercises: [...selectedExercises] });

    setSelectedExercises(newExercises);
    autoSave.scheduleSave();
  }, [selectedExercises, pushUndo, formData, autoSave]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    handleReorder(index, index - 1);
  }, [handleReorder]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === selectedExercises.length - 1) return;
    handleReorder(index, index + 1);
  }, [handleReorder, selectedExercises.length]);

  const handleEditExercise = useCallback((id: string) => {
    setEditingExerciseId(id);
  }, []);

  const handleSaveExercise = useCallback((updates: Partial<Exercise>) => {
    if (!editingExerciseId) return;

    pushUndo({
      description: `Edit ${updates.name ?? 'exercise'}`,
      before: { exercises: [...selectedExercises] },
      after: {
        exercises: selectedExercises.map(se =>
          se.id === editingExerciseId
            ? { ...se, ...updates }
            : se
        )
      },
    }, { ...formData, exercises: [...selectedExercises] });

    setSelectedExercises(prev =>
      prev.map(se =>
        se.id === editingExerciseId
          ? { ...se, ...updates }
          : se
      )
    );
    setEditingExerciseId(null);
  }, [editingExerciseId, selectedExercises, pushUndo, formData]);

  const handleCancelEdit = useCallback(() => {
    setEditingExerciseId(null);
  }, []);

  const handleFormChange = useCallback((field: keyof FormData, value: string) => {
    pushUndo({
      description: `Change ${field}`,
      before: { [field]: formData[field] },
      after: { [field]: value },
    }, { ...formData, [field]: value });

    setFormData(prev => ({ ...prev, [field]: value }));
  }, [formData, pushUndo]);

  if (auth.loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <a
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          href={mode === 'create' ? '/templates' : `/templates/${templateId}`}
        >
          <ArrowLeft size={20} />
          {mode === 'create' ? 'Back to templates' : 'Back to template'}
        </a>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {mode === 'create' ? 'Create Template' : 'Edit Template'}
          </h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo"
            >
              <Undo size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo"
            >
              <Redo size={18} />
            </Button>
          </div>
        </div>

        {autoSave.saving ? <div className="mb-4 p-2 bg-primary/10 text-primary text-sm rounded flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Saving...
                           </div> : null}

        {autoSave.saved ? <div className="mb-4 p-2 bg-success/20 text-success/80 text-sm rounded">
            Saved
                          </div> : null}

        {error ? <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center justify-between gap-3">
            <span>{error.message}</span>
            {error.retry ? <Button variant="outline" size="sm" onClick={error.retry}>
                Retry
                           </Button> : null}
                 </div> : null}

         <form className="space-y-6" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="name">
              Template Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => handleFormChange('name', e.target.value)}
              onBlur={() => void autoSave.save()}
              placeholder="e.g., Upper Body Workout"
            />
            {errors.name ? <p className="mt-1 text-sm text-destructive">{errors.name}</p> : null}
          </div>

          <CollapsibleSection label="Description (optional)" defaultOpen={false}>
            <textarea
              id="description"
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow resize-none"
              rows={2}
              value={formData.description}
              onChange={e => handleFormChange('description', e.target.value)}
              onBlur={() => void autoSave.save()}
              placeholder="Brief description of this template..."
            />
          </CollapsibleSection>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="block text-sm font-medium text-foreground">
                Exercises <span className="text-destructive">*</span>
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowExerciseSelector(true)}
                type="button"
              >
                Add Exercise
              </Button>
            </div>

            {errors.exercises ? <p className="mb-2 text-sm text-destructive">{errors.exercises}</p> : null}

            <ExerciseList
              exercises={selectedExercises}
              onReorder={handleReorder}
              onRemove={handleRemoveExercise}
              onEdit={handleEditExercise}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />

            {editingExerciseId ? <div className="mt-4">
                <InlineEditExercise
                  exercise={selectedExercises.find(se => se.id === editingExerciseId) ?? selectedExercises[0]}
                  onSave={handleSaveExercise}
                  onCancel={handleCancelEdit}
                />
                                 </div> : null}
          </div>

          <CollapsibleSection label="Notes (optional)" defaultOpen={false}>
            <textarea
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow resize-none"
              rows={3}
              value={formData.notes}
              onChange={e => handleFormChange('notes', e.target.value)}
              onBlur={() => void autoSave.save()}
              placeholder="Additional notes or instructions..."
            />
          </CollapsibleSection>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              asChild={true}
            >
              <a href={mode === 'create' ? '/templates' : `/templates/${templateId}`}>
                Cancel
              </a>
            </Button>
            <Button
              disabled={saving}
              type="submit"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save size={18} />
                  {mode === 'create' ? 'Create Template' : 'Save Changes'}
                </>
              )}
            </Button>
          </div>
         </form>

        {createdTemplate ? <div className="mt-6 p-4 bg-success/20 border border-success/30 rounded-lg">
            <h3 className="font-semibold mb-2 text-success">Template Created!</h3>
            <p className="text-sm mb-4 text-success/80">Your template "{createdTemplate.name}" is ready.</p>
            <div className="flex gap-3">
              <Button asChild={true}>
                <a href={`/workouts/start/${createdTemplate.id}`}>Start Workout</a>
              </Button>
              <Button variant="outline" asChild={true}>
                <a href={`/templates/${createdTemplate.id}`}>View Template</a>
              </Button>
            </div>
                           </div> : null}
      </Card>

      {showExerciseSelector ? <Drawer open={showExerciseSelector} onOpenChange={setShowExerciseSelector}>
          <DrawerContent className="max-w-2xl mx-auto">
            <DrawerHeader>
              <DrawerTitle>Add Exercise</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <ExerciseSearch
                selectedIds={selectedExercises.map(se => se.exerciseId)}
                onSelect={(exercise) => void handleAddExercise(exercise)}
                onCreateInline={(name: string, muscleGroup: string | null, description: string | null) => {
                  return void fetch('/api/exercises', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ name, muscleGroup, description }),
                  })
                    .then(response => {
                      if (!response.ok) throw new Error('Failed to create exercise');
                      return response.json() as Promise<Exercise>;
                    })
                    .then(created => {
                      void handleAddExercise({
                        id: created.id,
                        name: created.name,
                        muscleGroup: created.muscleGroup,
                        description: created.description,
                      });
                      toast.success(`Created "${name}"`);
                      void fetchExercises();
                    })
                    .catch(() => {
                      toast.error('Failed to create exercise');
                    });
                }}
                userExercises={exercises}
              />
            </div>
            <DrawerClose asChild={true}>
              <Button variant="outline" className="mx-4 mb-4">Done</Button>
            </DrawerClose>
          </DrawerContent>
                              </Drawer> : null}
    </main>
  );
}
