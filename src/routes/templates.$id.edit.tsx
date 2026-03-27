import { Link, createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Loader2, Plus, Save } from 'lucide-react';
import { useCallback, useEffect, useReducer } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './__root';
import { type Template, type Exercise } from '@/lib/db/schema';
import { type TemplateExerciseWithDetails } from '@/lib/db/template';
import { useToast } from '@/components/app/ToastProvider';
import { ExerciseSelector } from '@/components/exercise/ExerciseSelector';
import { ExerciseList } from '~/components/templates/ExerciseList';

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

interface TemplateEditState {
  template: Template | null;
  templateExercises: TemplateExerciseWithDetails[];
  allExercises: Exercise[];
  loading: boolean;
  submitting: boolean;
  redirecting: boolean;
  formData: {
    name: string;
    description: string;
    notes: string;
  };
  selectedExercises: SelectedExercise[];
  showExerciseSelector: boolean;
  exerciseSearch: string;
  errors: FormErrors;
}

type TemplateEditAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TEMPLATE'; payload: { template: Template; formData: { name: string; description: string; notes: string } } }
  | { type: 'SET_TEMPLATE_EXERCISES'; payload: { templateExercises: TemplateExerciseWithDetails[]; selectedExercises: SelectedExercise[] } }
  | { type: 'SET_ALL_EXERCISES'; payload: Exercise[] }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_REDIRECTING'; payload: boolean }
  | { type: 'SET_FORM_DATA'; payload: Partial<{ name: string; description: string; notes: string }> }
  | { type: 'ADD_EXERCISE'; payload: SelectedExercise }
  | { type: 'REMOVE_EXERCISE'; payload: string }
  | { type: 'REORDER_EXERCISES'; payload: { index: number; direction: 'up' | 'down' } }
  | { type: 'SET_SHOW_EXERCISE_SELECTOR'; payload: boolean }
  | { type: 'SET_EXERCISE_SEARCH'; payload: string }
  | { type: 'SET_ERRORS'; payload: FormErrors }
  | { type: 'RESET' };

const initialState: TemplateEditState = {
  template: null,
  templateExercises: [],
  allExercises: [],
  loading: true,
  submitting: false,
  redirecting: false,
  formData: {
    name: '',
    description: '',
    notes: '',
  },
  selectedExercises: [],
  showExerciseSelector: false,
  exerciseSearch: '',
  errors: {},
};

function templateEditReducer(state: TemplateEditState, action: TemplateEditAction): TemplateEditState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_TEMPLATE':
      return {
        ...state,
        template: action.payload.template,
        formData: action.payload.formData,
        loading: false,
      };
    case 'SET_TEMPLATE_EXERCISES':
      return {
        ...state,
        templateExercises: action.payload.templateExercises,
        selectedExercises: action.payload.selectedExercises,
      };
    case 'SET_ALL_EXERCISES':
      return { ...state, allExercises: action.payload };
    case 'SET_SUBMITTING':
      return { ...state, submitting: action.payload };
    case 'SET_REDIRECTING':
      return { ...state, redirecting: action.payload };
    case 'SET_FORM_DATA':
      return { ...state, formData: { ...state.formData, ...action.payload } };
    case 'ADD_EXERCISE':
      return { ...state, selectedExercises: [...state.selectedExercises, action.payload], showExerciseSelector: false, exerciseSearch: '' };
    case 'REMOVE_EXERCISE':
      return { ...state, selectedExercises: state.selectedExercises.filter((se) => se.id !== action.payload) };
    case 'REORDER_EXERCISES': {
      const newExercises = [...state.selectedExercises];
      const newIndex = action.payload.direction === 'up' ? action.payload.index - 1 : action.payload.index + 1;
      if (newIndex >= 0 && newIndex < newExercises.length) {
        [newExercises[action.payload.index], newExercises[newIndex]] = [
          newExercises[newIndex],
          newExercises[action.payload.index],
        ];
        return { ...state, selectedExercises: newExercises };
      }
      return state;
    }
    case 'SET_SHOW_EXERCISE_SELECTOR':
      return { ...state, showExerciseSelector: action.payload };
    case 'SET_EXERCISE_SEARCH':
      return { ...state, exerciseSearch: action.payload };
    case 'SET_ERRORS':
      return { ...state, errors: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

function EditTemplate() {
  const { id } = useParams({ from: '/templates/$id/edit' });
  const navigate = useNavigate();
  const auth = useAuth();
  const toast = useToast();

  const [state, dispatch] = useReducer(templateEditReducer, initialState);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      dispatch({ type: 'SET_REDIRECTING', payload: true });
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  const templateQuery = useQuery({
    queryKey: ['template', id],
    queryFn: () => fetch(`/api/templates/${id}`, { credentials: 'include' }).then((res) => {
      if (res.status === 404) {
        void navigate({ to: '/templates' });
        return null;
      }
      if (!res.ok) throw new Error(`Failed to fetch template: ${res.status}`);
      return res.json() as Promise<Template>;
    }),
  });

  const templateExercisesQuery = useQuery({
    queryKey: ['template-exercises', id],
    queryFn: () => fetch(`/api/templates/${id}/exercises`, { credentials: 'include' }).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch template exercises: ${res.status}`);
      return res.json() as Promise<TemplateExerciseWithDetails[]>;
    }),
    enabled: !!id,
  });

  const allExercisesQuery = useQuery({
    queryKey: ['exercises'],
    queryFn: () => fetch('/api/exercises', { credentials: 'include' }).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch exercises: ${res.status}`);
      return res.json() as Promise<Exercise[]>;
    }),
  });

  useEffect(() => {
    if (templateQuery.data) {
      dispatch({
        type: 'SET_TEMPLATE',
        payload: {
          template: templateQuery.data,
          formData: {
            name: templateQuery.data.name,
            description: templateQuery.data.description ?? '',
            notes: templateQuery.data.notes ?? '',
          },
        },
      });
    }
  }, [templateQuery.data]);

  useEffect(() => {
    if (templateExercisesQuery.data) {
      dispatch({
        type: 'SET_TEMPLATE_EXERCISES',
        payload: {
          templateExercises: templateExercisesQuery.data,
          selectedExercises: templateExercisesQuery.data.map((te) => ({
            id: te.id,
            exerciseId: te.exerciseId,
            name: te.exercise?.name ?? 'Unknown',
            muscleGroup: te.exercise?.muscleGroup ?? null,
          })),
        },
      });
    }
  }, [templateExercisesQuery.data]);

  useEffect(() => {
    if (allExercisesQuery.data) {
      dispatch({ type: 'SET_ALL_EXERCISES', payload: allExercisesQuery.data });
    }
  }, [allExercisesQuery.data]);

  const handleAddExercise = useCallback((exercise: Exercise) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    dispatch({
      type: 'ADD_EXERCISE',
      payload: {
        id: tempId,
        exerciseId: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
      },
    });
  }, []);

  const handleRemoveExercise = useCallback((exerciseId: string) => {
    dispatch({ type: 'REMOVE_EXERCISE', payload: exerciseId });
  }, []);

  const handleMoveExercise = useCallback((index: number, direction: 'down' | 'up') => {
    dispatch({ type: 'REORDER_EXERCISES', payload: { index, direction } });
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!state.formData.name.trim()) {
      newErrors.name = 'Template name is required';
    } else if (state.formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    dispatch({ type: 'SET_ERRORS', payload: newErrors });
    return Object.keys(newErrors).length === 0;
  }, [state.formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_ERRORS', payload: {} });

    if (!validateForm()) {
      return;
    }

    if (state.selectedExercises.length === 0) {
      dispatch({ type: 'SET_ERRORS', payload: { exercises: 'Add at least one exercise to the template' } });
      return;
    }

    dispatch({ type: 'SET_SUBMITTING', payload: true });

    try {
      const templateRes = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: state.formData.name.trim(),
          description: state.formData.description.trim() || undefined,
          notes: state.formData.notes.trim() || undefined,
        }),
      });

      if (templateRes.status === 404) {
        const errorMsg = 'Template not found';
        dispatch({ type: 'SET_ERRORS', payload: { submit: errorMsg } });
        toast.error(errorMsg);
        return;
      }

      if (templateRes.status === 403) {
        const errorMsg = 'You do not have permission to edit this template';
        dispatch({ type: 'SET_ERRORS', payload: { submit: errorMsg } });
        toast.error(errorMsg);
        return;
      }

      if (!templateRes.ok) {
        const errorData = await templateRes.json().catch(() => ({})) as { message?: string };
        const errorMsg = errorData.message ?? 'Failed to update template';
        dispatch({ type: 'SET_ERRORS', payload: { submit: errorMsg } });
        toast.error(errorMsg);
        return;
      }

      const newExerciseIds = new Set(state.selectedExercises.map((se) => se.exerciseId));

      const exercisesToRemove = state.templateExercises.filter(
        (te) => !newExerciseIds.has(te.exerciseId)
      );

      for (const te of exercisesToRemove) {
        await fetch(`/api/templates/${id}/exercises/${te.exerciseId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }

      for (let i = 0; i < state.selectedExercises.length; i++) {
        const se = state.selectedExercises[i];
        const exerciseInOriginal = state.templateExercises.find((te) => te.exerciseId === se.exerciseId);

        if (exerciseInOriginal) {
          if (exerciseInOriginal.orderIndex !== i) {
            await fetch(`/api/templates/${id}/exercises/reorder`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                exerciseOrders: state.selectedExercises.map((se2, idx) => ({
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
      dispatch({ type: 'SET_ERRORS', payload: { submit: errorMsg } });
      toast.error(errorMsg);
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [state.formData, id, navigate, state.selectedExercises, state.templateExercises, validateForm, toast]);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmit(e);
  }, [handleSubmit]);

  const handleInputChange = useCallback((field: 'name' | 'description' | 'notes') => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      dispatch({ type: 'SET_FORM_DATA', payload: { [field]: e.target.value } });
    }, []
  );

  if (auth.loading || state.redirecting || state.loading) {
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

  if (!state.template) {
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
          {state.errors.submit ? <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            <span>{state.errors.submit}</span>
                                 </div> : null}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="name">
              {'Template Name '}
              <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow ${
                state.errors.name ? 'border-red-500' : 'border-border'
              }`}
              id="name"
              onChange={handleInputChange('name')}
              placeholder="e.g., Upper Body Workout"
              type="text"
              value={state.formData.name}
            />
            {state.errors.name ? <p className="mt-1 text-sm text-red-600">{state.errors.name}</p> : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="description">
              {'Description '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow resize-none"
              id="description"
              onChange={handleInputChange('description')}
              placeholder="Brief description of this template..."
              rows={2}
              value={state.formData.description}
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
              onChange={handleInputChange('notes')}
              placeholder="Additional notes or instructions..."
              rows={3}
              value={state.formData.notes}
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
                onClick={() => dispatch({ type: 'SET_SHOW_EXERCISE_SELECTOR', payload: true })}
                type="button"
              >
                <Plus size={16} />
                Add Exercise
              </button>
            </div>

            {state.errors.exercises ? <p className="mb-2 text-sm text-red-500">{state.errors.exercises}</p> : null}

            {state.selectedExercises.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No exercises added yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "Add Exercise" to add exercises to this template
                </p>
              </div>
            ) : (
              <ExerciseList
                exercises={state.selectedExercises}
                onMoveDown={(index) => handleMoveExercise(index, 'down')}
                onMoveUp={(index) => handleMoveExercise(index, 'up')}
                onRemove={handleRemoveExercise}
              />
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
              disabled={state.submitting}
              type="submit"
            >
              {state.submitting ? (
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

      <ExerciseSelector
        exercises={state.allExercises}
        onAddExercise={handleAddExercise}
        onOpenChange={(open) => dispatch({ type: 'SET_SHOW_EXERCISE_SELECTOR', payload: open })}
        open={state.showExerciseSelector}
        searchValue={state.exerciseSearch}
        onSearchChange={(search) => dispatch({ type: 'SET_EXERCISE_SEARCH', payload: search })}
        selectedExerciseIds={state.selectedExercises.map((se) => se.exerciseId)}
      />
    </main>
  );
}

export const Route = createFileRoute('/templates/$id/edit')({
  component: EditTemplate,
});
