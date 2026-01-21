/* eslint-disable @typescript-eslint/consistent-type-definitions, react/jsx-closing-tag-location */
import { createFileRoute } from '@tanstack/react-router';
import { ArrowLeft, Loader2, Plus, Save, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { type Template } from '@/lib/db/schema';
import { trackEvent } from '@/lib/posthog';
import { useToast } from '@/components/ToastProvider';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Card } from '~/components/ui/Card';

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string | null;
}

type SelectedExercise = {
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
}

function NewTemplate() {
  const auth = useAuth();
  const toast = useToast();
  const [redirecting, setRedirecting] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    notes: '',
  });
  const [errors, setErrors] = useState<{ name?: string; exercises?: string }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
  }, [formData]);

   const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
     setFormData(prev => ({ ...prev, description: e.target.value }));
   }, []);

   const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
     setFormData(prev => ({ ...prev, notes: e.target.value }));
   }, []);



    const handleCloseExerciseSelector = useCallback(() => {
      setShowExerciseSelector(false);
      setExerciseSearch('');
    }, []);



     const _handleExerciseSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
       setExerciseSearch(e.target.value);
     }, []);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  async function fetchExercises() {
    try {
      setLoading(true);
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
  }

  useEffect(() => {
    if (!auth.loading && auth.user) {
      void fetchExercises();
    }
  }, [auth.loading, auth.user]);

  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

   const handleAddExercise = useCallback((exercise: Exercise) => {
     if (!selectedExercises.some((se) => se.exerciseId === exercise.id)) {
       setSelectedExercises([
         ...selectedExercises,
         {
           exerciseId: exercise.id,
           name: exercise.name,
           muscleGroup: exercise.muscleGroup,
         },
       ]);
     }
     setShowExerciseSelector(false);
     setExerciseSearch('');
   }, [selectedExercises]);

  const handleRemoveExercise = useCallback((exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter((se) => se.exerciseId !== exerciseId));
  }, [selectedExercises]);

    const handleMoveExercise = useCallback((idx: number, direction: 'down' | 'up') => {
      const newExercises = [...selectedExercises];
      const newIndex = direction === 'up' ? idx - 1 : idx + 1;

      if (newIndex >= 0 && newIndex < selectedExercises.length) {
        [newExercises[idx], newExercises[newIndex]] = [
          newExercises[newIndex],
          newExercises[idx],
        ];
        setSelectedExercises(newExercises);
      }
    }, [selectedExercises]);

   const handleAddExerciseButtonClick = useCallback(() => {
     setShowExerciseSelector(true);
   }, []);

   const handleMoveClick = useCallback((e: React.MouseEvent) => {
     const indexStr = (e.currentTarget as HTMLElement).getAttribute('data-index');
     const direction = (e.currentTarget as HTMLElement).getAttribute('data-direction') as 'up' | 'down';
     if (indexStr) {
       const idx = parseInt(indexStr, 10);
       handleMoveExercise(idx, direction);
     }
   }, [handleMoveExercise]);

   const handleRemoveClick = useCallback((e: React.MouseEvent) => {
     const exerciseId = (e.currentTarget as HTMLElement).getAttribute('data-id');
     if (exerciseId) {
       handleRemoveExercise(exerciseId);
     }
   }, [handleRemoveExercise]);

   const handleExerciseSelectorClick = useCallback((e: React.MouseEvent) => {
     const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
     const exerciseItem = filteredExercises.find(ex => ex.id === id);
     if (exerciseItem) {
       handleAddExercise(exerciseItem);
     }
   }, [filteredExercises, handleAddExercise]);







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
    setError(null);

    if (!validateForm()) return;

    if (selectedExercises.length === 0) {
      setErrors({ exercises: 'Add at least one exercise to the template' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const data: { message?: string } = await response.json();
        throw new Error(data.message ?? 'Failed to create template');
      }

      const template: Template = await response.json();

      void trackEvent('template_created', {
        template_id: template.id,
        template_name: template.name,
        exercise_count: selectedExercises.length,
      });

      for (let i = 0; i < selectedExercises.length; i++) {
        await fetch(`/api/templates/${template.id}/exercises`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            exerciseId: selectedExercises[i].exerciseId,
            orderIndex: i,
          }),
        });
      }

      window.location.href = `/templates/${template.id}`;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [formData.name, formData.description, formData.notes, selectedExercises, validateForm, toast]);

  const onFormSubmit = useCallback((e: React.FormEvent) => {
    void handleSubmit(e);
  }, [handleSubmit]);

  if (auth.loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6">
          <a
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            href="/templates"
          >
            <ArrowLeft size={20} />
            Back to templates
          </a>
        </div>

        <Card className="p-6">
          <h1 className="text-2xl font-bold text-foreground mb-6">Create Template</h1>

          {error ? <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div> : null}

          <form className="space-y-6" onSubmit={onFormSubmit}>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="name">
                Template Name
                <span className="text-destructive"> *</span>
              </label>
              <Input
                id="name"
                onChange={handleNameChange}
                placeholder="e.g., Upper Body Workout"
                type="text"
                value={formData.name}
              />
              {errors.name ? <p className="mt-1 text-sm text-destructive">{errors.name}</p> : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="description">
                Description
                <span className="text-muted-foreground font-normal"> (optional)</span>
              </label>
              <textarea
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow resize-none"
                id="description"
                onChange={handleDescriptionChange}
                placeholder="Brief description of this template..."
                rows={2}
                value={formData.description}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="notes">
                Notes
                <span className="text-muted-foreground font-normal"> (optional)</span>
              </label>
              <textarea
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow resize-none"
                id="notes"
                onChange={handleNotesChange}
                placeholder="Additional notes or instructions..."
                rows={3}
                value={formData.notes}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="block text-sm font-medium text-foreground">
                  Exercises
                  <span className="text-destructive"> *</span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddExerciseButtonClick}
                  type="button"
                >
                  <Plus size={16} />
                  Add Exercise
                </Button>
              </div>

              {errors.exercises ? <p className="mb-2 text-sm text-destructive">{errors.exercises}</p> : null}

              {selectedExercises.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <p className="text-muted-foreground">No exercises added yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Add Exercise" to add exercises to this template
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedExercises.map((exercise, index) => (
                    <div
                      className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border"
                      key={exercise.exerciseId}
                    >
                      <span className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-sm font-medium rounded">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{exercise.name}</p>
                        {exercise.muscleGroup ? <p className="text-sm text-muted-foreground">{exercise.muscleGroup}</p> : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground"
                          data-index={index}
                          data-direction="up"
                          disabled={index === 0}
                          onClick={handleMoveClick}
                          type="button"
                        >
                          ↑
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground"
                          data-direction="down"
                          data-index={index}
                          disabled={index === selectedExercises.length - 1}
                          onClick={handleMoveClick}
                          type="button"
                        >
                          ↓
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          data-id={exercise.exerciseId}
                          onClick={handleRemoveClick}
                          type="button"
                        >
                          <X size={18} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="ghost"
                asChild={true}
              >
                <a href="/templates">
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Create Template
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </main>

      {showExerciseSelector ? <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Add Exercise</h2>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-secondary"
              onClick={handleCloseExerciseSelector}
            >
              <X size={20} />
            </Button>
          </div>

          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                autoFocus={true}
                className="pl-10"
                onChange={_handleExerciseSearchChange}
                placeholder="Search exercises..."
                type="text"
                value={exerciseSearch}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No exercises found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExercises.map((exerciseItem) => (
                  <Button
                    className="w-full justify-start h-auto p-3"
                    variant="outline"
                    disabled={selectedExercises.some((se) => se.exerciseId === exerciseItem.id)}
                    key={exerciseItem.id}
                    onClick={handleExerciseSelectorClick}
                  >
                    <div className="flex items-center justify-between flex-1">
                      <div>
                        <h3 className="font-medium text-foreground">{exerciseItem.name}</h3>
                        {exerciseItem.muscleGroup ? <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-primary bg-primary/10 rounded-full">
                          {exerciseItem.muscleGroup}
                        </span> : null}
                      </div>
                      {selectedExercises.some((se) => se.exerciseId === exerciseItem.id) ? <span className="text-green-600 text-sm font-medium">Added</span> : null}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div> : null}
    </>
  );
}

export const Route = createFileRoute('/templates/new')({
  component: NewTemplate,
});
