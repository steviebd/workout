import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Loader2, Save, Undo, Redo, Plus } from 'lucide-react';
import { useTemplateEditorState } from './useTemplateEditorState';
import { useTemplateApi } from './useTemplateApi';
import { type TemplateEditorProps, type SelectedExercise, type Exercise } from './types';
import { useToast } from '@/components/app/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/Collapsible';
import { ExerciseSearch } from '@/components/exercises/ExerciseSearch';
import { ExerciseList } from '@/components/exercises/ExerciseList';
import { InlineEditExercise } from '@/components/exercises/InlineEditExercise';
import { AccessorySection } from '@/components/workouts/AccessorySection';
import { Drawer, DrawerContent, DrawerClose, DrawerHeader, DrawerTitle } from '@/components/ui/Drawer';

export function TemplateEditor({
  mode,
  templateId,
  initialData,
  onSaved,
}: TemplateEditorProps) {
  const toast = useToast();
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  const {
    formData,
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
    pushUndo,
    errors,
    setErrors,
  } = useTemplateEditorState({ mode, initialData });

  const {
    exercises,
    saving,
    createdTemplate,
    error,
    autoSave,
    fetchExercises,
    handleSubmit,
  } = useTemplateApi({
    mode,
    templateId,
    formData,
    selectedExercises,
    accessoryAddedWeights,
  });

  useEffect(() => {
    if (!loading && initialData && mode === 'edit' && templateId) {
      void fetchExercises().then(() => setLoading(false));
    } else if (!loading && !initialData) {
      void fetchExercises().then(() => setLoading(false));
    }
  }, [initialData, mode, templateId, fetchExercises, loading, setLoading]);

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

          const created = await response.json() as { id: string };
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

    pushUndo(
      'Add exercise',
      { exercises: [...selectedExercises] },
      { exercises: [...selectedExercises, newExercise] }
    );

    setSelectedExercises(prev => [...prev, newExercise]);
    autoSave.scheduleSave();
  }, [selectedExercises, exercises, pushUndo, setSelectedExercises, toast, autoSave, fetchExercises]);

  const handleRemoveExercise = useCallback((id: string) => {
    const exercise = selectedExercises.find(se => se.id === id || se.exerciseId === id);
    if (!exercise) return;

    pushUndo(
      `Remove ${exercise.name}`,
      { exercises: [...selectedExercises] },
      { exercises: selectedExercises.filter(se => se.id !== id && se.exerciseId !== id) }
    );

    setSelectedExercises(prev => prev.filter(se => se.id !== id && se.exerciseId !== id));
    autoSave.scheduleSave();
  }, [selectedExercises, pushUndo, setSelectedExercises, autoSave]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newExercises = [...selectedExercises];
    [newExercises[fromIndex], newExercises[toIndex]] = [
      newExercises[toIndex],
      newExercises[fromIndex],
    ];

    pushUndo(
      'Reorder exercises',
      { exercises: [...selectedExercises] },
      { exercises: newExercises }
    );

    setSelectedExercises(newExercises);
    autoSave.scheduleSave();
  }, [selectedExercises, pushUndo, setSelectedExercises, autoSave]);

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

    pushUndo(
      `Edit ${updates.name ?? 'exercise'}`,
      { exercises: [...selectedExercises] },
      {
        exercises: selectedExercises.map(se =>
          se.id === editingExerciseId
            ? { ...se, ...updates }
            : se
        )
      },
    );

    setSelectedExercises(prev =>
      prev.map(se =>
        se.id === editingExerciseId
          ? { ...se, ...updates }
          : se
      )
    );
    setEditingExerciseId(null);
  }, [editingExerciseId, selectedExercises, pushUndo, setSelectedExercises]);

  const handleCancelEdit = useCallback(() => {
    setEditingExerciseId(null);
  }, []);

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    if (selectedExercises.length === 0) {
      setErrors({ exercises: 'Add at least one exercise to the template' });
      return;
    }

    void handleSubmit().then(() => {
      if (mode === 'edit' && createdTemplate) {
        onSaved?.(createdTemplate);
      }
    });
  }, [validateForm, selectedExercises.length, handleSubmit, mode, createdTemplate, onSaved, setErrors]);

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
            <div className="relative w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          </div>
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 sm:px-6 py-6">
      <div className="mb-6">
        <a
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-2"
          href={mode === 'create' ? '/templates' : `/templates/${templateId}`}
        >
          <ArrowLeft size={20} />
          <span className="text-sm sm:text-base">{mode === 'create' ? 'Back to templates' : 'Back to template'}</span>
        </a>
      </div>

      <Card className="p-6 bg-gradient-to-br from-card to-card/50">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {mode === 'create' ? 'Create Template' : 'Edit Template'}
          </h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo"
            >
              <Undo size={20} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo"
            >
              <Redo size={20} />
            </Button>
          </div>
        </div>

        {autoSave.saving ? (
          <div className="mb-4 p-2 bg-primary/10 text-primary text-sm rounded flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Saving...
          </div>
        ) : null}

        {autoSave.saved ? (
          <div className="mb-4 p-2 bg-success/20 text-success/80 text-sm rounded">
            Saved
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center justify-between gap-3">
            <span>{error.message}</span>
            {error.retry ? (
              <Button variant="outline" size="sm" onClick={error.retry}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : null}

        <form className="space-y-6" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="name">
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
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow resize-none min-h-[100px] text-base"
              rows={3}
              value={formData.description}
              onChange={e => handleFormChange('description', e.target.value)}
              onBlur={() => void autoSave.save()}
              placeholder="Brief description of this template..."
            />
          </CollapsibleSection>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
              <span className="block text-base font-medium text-foreground">
                Exercises <span className="text-destructive">*</span>
              </span>
              <Button
                variant="default"
                size="lg"
                onClick={() => setShowExerciseSelector(true)}
                type="button"
                className="w-full sm:w-auto min-h-[48px] text-base"
              >
                <Plus className="h-5 w-5 sm:mr-2" />
                <span className="sm:hidden">Add Exercise</span>
                <span className="hidden sm:inline">Add Exercise</span>
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

            {editingExerciseId ? (
              <div className="mt-4">
                <InlineEditExercise
                  exercise={selectedExercises.find(se => se.id === editingExerciseId) ?? selectedExercises[0]}
                  onSave={handleSaveExercise}
                  onCancel={handleCancelEdit}
                />
              </div>
            ) : null}

            {selectedExercises.some(se => se.isAccessory) && (
              <div className="border-t pt-6 mt-6">
                <AccessorySection
                  accessories={selectedExercises
                    .filter(se => se.isAccessory)
                    .map(se => ({
                      accessoryId: se.exerciseId,
                      name: se.name,
                      libraryId: se.libraryId ?? undefined,
                      muscleGroup: se.muscleGroup ?? '',
                      sets: se.sets ?? 0,
                      reps: se.repsRaw ?? (se.reps ?? 0).toString(),
                      targetWeight: se.targetWeight ?? 0,
                      addedWeight: accessoryAddedWeights[se.exerciseId] ?? se.addedWeight ?? 0,
                      isRequired: se.isRequired ?? true,
                    }))}
                  unit="kg"
                  onUpdateAddedWeight={(accessoryId, weight) => {
                    setAccessoryAddedWeights(prev => ({ ...prev, [accessoryId]: weight }));
                  }}
                />
              </div>
            )}
          </div>

          <CollapsibleSection label="Notes (optional)" defaultOpen={false}>
            <textarea
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow resize-none min-h-[120px] text-base"
              rows={4}
              value={formData.notes}
              onChange={e => handleFormChange('notes', e.target.value)}
              onBlur={() => void autoSave.save()}
              placeholder="Additional notes or instructions..."
            />
          </CollapsibleSection>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <Button
              variant="ghost"
              asChild={true}
              className="px-5 py-2.5"
            >
              <a href={mode === 'create' ? '/templates' : `/templates/${templateId}`} className="px-6 py-3 text-center rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-colors">
                Cancel
              </a>
            </Button>
            <Button
              disabled={saving}
              type="submit"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save size={20} />
                  {mode === 'create' ? 'Create Template' : 'Save Changes'}
                </>
              )}
            </Button>
          </div>
        </form>

        {createdTemplate ? (
          <div className="mt-6 p-4 bg-success/20 border border-success/30 rounded-lg">
            <h3 className="font-semibold mb-2 text-success">Template Created!</h3>
            <p className="text-sm mb-4 text-success/80">Your template "{createdTemplate.name}" is ready.</p>
            <div className="flex gap-3">
              <Button asChild={true}>
                <a href={`/workouts/start/${createdTemplate.id}`}>Start Workout</a>
              </Button>
              <Button variant="outline" asChild={true}>
                <a href={`/templates/${createdTemplate.id}`} className="px-6 py-3 text-center rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-colors">
                  View Template
                </a>
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {showExerciseSelector ? (
        <Drawer open={showExerciseSelector} onOpenChange={setShowExerciseSelector}>
          <DrawerContent className="max-w-2xl mx-auto">
            <DrawerHeader>
              <DrawerTitle>Add Exercise</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4 max-h-[60vh]">
              <ExerciseSearch
                selectedIds={selectedExercises.map(se => se.exerciseId)}
                onSelect={(exercise) => void handleAddExercise(exercise)}
                onDeselect={(exerciseId) => handleRemoveExercise(exerciseId)}
                onCreateInline={(name: string, muscleGroup: string | null, description: string | null) => {
                  return void fetch('/api/exercises', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ name, muscleGroup, description }),
                  })
                    .then(response => {
                      if (!response.ok) throw new Error('Failed to create exercise');
                      return response.json();
                    })
                    .then((created) => {
                      const data = created as { id: string; name: string; muscleGroup: string; description: string };
                      void handleAddExercise({
                        id: data.id,
                        name: data.name,
                        muscleGroup: data.muscleGroup,
                        description: data.description,
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
        </Drawer>
      ) : null}
    </main>
  );
}

export { type TemplateEditorProps, type SelectedExercise, type FormData } from './types';
