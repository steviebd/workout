
import { Link, createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Loader2, Plus, Save, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { type Template, type Exercise } from '@/lib/db/schema';
import { type TemplateExerciseWithDetails } from '@/lib/db/template';
import { useToast } from '@/components/app/ToastProvider';

interface SelectedExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
}

interface FormErrors {
  name?: string;
  exercises?: string;
  submit?: string;
}

interface ApiError {
  message?: string;
}

function EditTemplate() {
  const { id } = useParams({ from: '/templates/$id/edit' });
  const navigate = useNavigate();
  const auth = useAuth();
  const toast = useToast();

  const [template, setTemplate] = useState<Template | null>(null);
  const [templateExercises, setTemplateExercises] = useState<TemplateExerciseWithDetails[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    notes: '',
  });

  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});

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

   const handleExerciseSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExerciseSearch(e.target.value);
  }, []);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [templateRes, exercisesRes, allExercisesRes] = await Promise.all([
        fetch(`/api/templates/${id}`, { credentials: 'include' }),
        fetch(`/api/templates/${id}/exercises`, { credentials: 'include' }),
        fetch('/api/exercises', { credentials: 'include' }),
      ]);

      if (templateRes.status === 404) {
        void navigate({ to: '/templates' });
        return;
      }

      if (!templateRes.ok) {
        console.error('Failed to fetch template:', templateRes.status);
        setErrors({ submit: 'Failed to load template' });
        return;
      }

      const templateData: Template = await templateRes.json();
      setTemplate(templateData);
      setFormData({
        name: templateData.name,
        description: templateData.description ?? '',
        notes: templateData.notes ?? '',
      });

      if (exercisesRes.ok) {
        const exercisesData: TemplateExerciseWithDetails[] = await exercisesRes.json();
        setTemplateExercises(exercisesData);
        setSelectedExercises(
          exercisesData.map((te) => ({
            id: te.id,
            exerciseId: te.exerciseId,
            name: te.exercise?.name ?? 'Unknown',
            muscleGroup: te.exercise?.muscleGroup ?? null,
          }))
        );
      }

      if (allExercisesRes.ok) {
        const allExercisesData: Exercise[] = await allExercisesRes.json();
        setAllExercises(allExercisesData);
      }
    } catch (error) {
      console.error('Failed to fetch template:', error);
      setErrors({ submit: 'Failed to load template' });
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!auth.loading && auth.user && id) {
      fetchData().catch(console.error);
    }
  }, [auth.loading, auth.user, id, fetchData]);

  const filteredExercises = allExercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

    const handleAddExercise = useCallback((exercise: Exercise) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      setSelectedExercises([
        ...selectedExercises,
        {
          id: tempId,
          exerciseId: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
        },
      ]);
      setShowExerciseSelector(false);
      setExerciseSearch('');
    }, [selectedExercises]);

   const handleRemoveExercise = useCallback((exerciseId: string) => {
      setSelectedExercises(selectedExercises.filter((se) => se.id !== exerciseId));
    }, [selectedExercises]);

   const handleMoveExercise = useCallback((index: number, direction: 'down' | 'up') => {
     const newExercises = [...selectedExercises];
     const newIndex = direction === 'up' ? index - 1 : index + 1;

     if (newIndex >= 0 && newIndex < selectedExercises.length) {
       [newExercises[index], newExercises[newIndex]] = [
         newExercises[newIndex],
         newExercises[index],
       ];
       setSelectedExercises(newExercises);
     }
   }, [selectedExercises]);

     const handleMoveClick = useCallback((e: React.MouseEvent) => {
       const indexStr = (e.currentTarget as HTMLElement).getAttribute('data-index');
       const direction = (e.currentTarget as HTMLElement).getAttribute('data-direction') as 'up' | 'down';
       if (indexStr) {
         const index = parseInt(indexStr);
         handleMoveExercise(index, direction);
       }
     }, [handleMoveExercise]);

     const handleRemoveClick = useCallback((e: React.MouseEvent) => {
       const exerciseId = (e.currentTarget as HTMLElement).getAttribute('data-id');
       if (exerciseId) {
         handleRemoveExercise(exerciseId);
       }
     }, [handleRemoveExercise]);

      const handleAddExerciseClick = useCallback((e: React.MouseEvent) => {
        const exerciseId = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const exercise = filteredExercises.find(ex => ex.id === exerciseId);
        if (exercise) {
          void handleAddExercise(exercise);
        }
      }, [filteredExercises, handleAddExercise]);

   const handleAddExerciseButtonClick = useCallback(() => {
     setShowExerciseSelector(true);
   }, []);

    const validateForm = useCallback((): boolean => {
      const newErrors: FormErrors = {};

      if (!formData.name.trim()) {
        newErrors.name = 'Template name is required';
      } else if (formData.name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }, [formData, setErrors]);

     const handleSubmit = useCallback(async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});

      if (!validateForm()) {
        return;
      }

      if (selectedExercises.length === 0) {
        setErrors({ exercises: 'Add at least one exercise to the template' });
        return;
      }

      setSubmitting(true);

      try {
        const templateRes = await fetch(`/api/templates/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            notes: formData.notes.trim() || undefined,
          }),
        });

        if (templateRes.status === 404) {
          const errorMsg = 'Template not found';
          setErrors({ submit: errorMsg });
          toast.error(errorMsg);
          return;
        }

        if (templateRes.status === 403) {
          const errorMsg = 'You do not have permission to edit this template';
          setErrors({ submit: errorMsg });
          toast.error(errorMsg);
          return;
        }

        if (!templateRes.ok) {
          const errorData = await templateRes.json().catch((): ApiError => ({})) as ApiError;
          const errorMsg = errorData.message ?? 'Failed to update template';
          setErrors({ submit: errorMsg });
          toast.error(errorMsg);
          return;
        }

        const newExerciseIds = new Set(selectedExercises.map((se) => se.exerciseId));

        const exercisesToRemove = templateExercises.filter(
          (te) => !newExerciseIds.has(te.exerciseId)
        );

        for (const te of exercisesToRemove) {
          await fetch(`/api/templates/${id}/exercises/${te.exerciseId}`, {
            method: 'DELETE',
            credentials: 'include',
          });
        }

        for (let i = 0; i < selectedExercises.length; i++) {
          const se = selectedExercises[i];
          const exerciseInOriginal = templateExercises.find((te) => te.exerciseId === se.exerciseId);

          if (exerciseInOriginal) {
            if (exerciseInOriginal.orderIndex !== i) {
              await fetch(`/api/templates/${id}/exercises/reorder`, {
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
            await fetch(`/api/templates/${id}/exercises`, {
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

        void navigate({ to: '/templates/$id', params: { id } });
      } catch {
        const errorMsg = 'An error occurred. Please try again.';
        setErrors({ submit: errorMsg });
        toast.error(errorMsg);
      } finally {
        setSubmitting(false);
      }
    }, [formData, id, navigate, selectedExercises, setErrors, setSubmitting, templateExercises, validateForm, toast]);

     const handleFormSubmit = useCallback((e: React.FormEvent) => {
       e.preventDefault();
       void handleSubmit(e);
     }, [handleSubmit]);

    if (auth.loading || redirecting || loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
              <div className="relative w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            </div>
            <p className="text-muted-foreground">Loading template...</p>
          </div>
        </div>
      );
    }

   if (!template) {
     return (
       <main className="mx-auto max-w-lg px-4 py-6">
         <div className="rounded-lg border border-border p-8 text-center">
           <p className="text-muted-foreground">Template not found</p>
           <Link
             className="mt-4 inline-flex items-center gap-2 text-primary hover:text-primary/80"
             to="/templates"
           >
             <ArrowLeft size={16} />
             Back to templates
           </Link>
         </div>
       </main>
     );
   }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <Link
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          params={{ id }}
          to="/templates/$id"
        >
          <ArrowLeft size={20} />
          Back to template
        </Link>
      </div>

      <div className="rounded-lg border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h1 className="text-2xl font-semibold text-foreground">Edit Template</h1>
        </div>

        <form className="p-6 space-y-6" onSubmit={handleFormSubmit}>
          {errors.submit ? <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            <span>{errors.submit}</span>
                           </div> : null}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="name">
              {'Template Name '}
              <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow ${
                errors.name ? 'border-red-500' : 'border-border'
              }`}
              id="name"
              onChange={handleNameChange}
              placeholder="e.g., Upper Body Workout"
              type="text"
              value={formData.name}
            />
            {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name}</p> : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="description">
              {'Description '}
              <span className="text-muted-foreground font-normal">(optional)</span>
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
              {'Notes '}
              <span className="text-muted-foreground font-normal">(optional)</span>
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
              <label className="block text-sm font-medium text-foreground">
                {'Exercises '}
                <span className="text-red-500">*</span>
              </label>
              <button
                className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                onClick={handleAddExerciseButtonClick}
                type="button"
              >
                <Plus size={16} />
                Add Exercise
              </button>
            </div>

            {errors.exercises ? <p className="mb-2 text-sm text-red-500">{errors.exercises}</p> : null}

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
                    key={exercise.id}
                  >
                    <span className="flex items-center justify-center w-6 h-6 bg-primary/20 text-primary text-sm font-medium rounded">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{exercise.name}</p>
                      {exercise.muscleGroup ? <p className="text-sm text-muted-foreground">{exercise.muscleGroup}</p> : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        data-direction="down"
                        data-index={index}
                        disabled={index === selectedExercises.length - 1}
                        onClick={handleMoveClick}
                        type="button"
                      >
                        ↓
                      </button>

                      <button
                        className="p-1 text-muted-foreground hover:text-red-600"
                        data-id={exercise.id}
                        onClick={handleRemoveClick}
                        type="button"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Link
              className="px-4 py-2 text-foreground hover:text-foreground/80 transition-colors"
              params={{ id }}
              to="/templates/$id"
            >
              Cancel
            </Link>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
              type="submit"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {showExerciseSelector ? <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Add Exercise</h2>
            <button
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              onClick={handleCloseExerciseSelector}
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                autoFocus={true}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                onChange={handleExerciseSearchChange}
                placeholder="Search exercises..."
                type="text"
                value={exerciseSearch}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filteredExercises.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No exercises found</div>
            ) : (
              <div className="space-y-2">
                {filteredExercises.map((exercise) => {
                  const isSelected = selectedExercises.some(
                    (se) => se.exerciseId === exercise.id
                  );
                  return (
                    <button
                      className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      data-id={exercise.id}
                      disabled={isSelected}
                      key={exercise.id}
                      onClick={handleAddExerciseClick}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{exercise.name}</h3>
                          {exercise.muscleGroup ? <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-primary bg-primary/20 rounded-full">
                            {exercise.muscleGroup}
                                                  </span> : null}
                        </div>
                        {isSelected ? <span className="text-green-600 text-sm font-medium">Added</span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
                              </div> : null}
    </main>
  );
}

export const Route = createFileRoute('/templates/$id/edit')({
  component: EditTemplate,
});
