/* eslint-disable @typescript-eslint/no-floating-promises, react-hooks/exhaustive-deps */
import { Link, createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import { AlertCircle, ArrowLeft, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { useToast } from '@/components/ToastProvider';

const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Core',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Full Body',
  'Cardio',
  'Other',
  'Custom',
] as const;

type MuscleGroup = typeof MUSCLE_GROUPS[number];

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  workosId: string;
  createdAt: string;
  updatedAt: string;
}

interface ExerciseResponse {
  id: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  workosId: string;
  createdAt: string;
  updatedAt: string;
}

interface FormErrors {
  name?: string;
  muscleGroup?: string;
  submit?: string;
}

function EditExercise() {
  const { id } = useParams({ from: '/exercises/$id/edit' });
  const navigate = useNavigate();
  const auth = useAuth();
  const toast = useToast();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    muscleGroup: '',
    customMuscleGroup: '',
    description: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
  }, [formData]);

  const handleMuscleGroupChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      muscleGroup: e.target.value,
      customMuscleGroup: e.target.value !== 'Custom' ? '' : formData.customMuscleGroup,
    });
  }, [formData]);

  const handleCustomMuscleGroupChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, customMuscleGroup: e.target.value });
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, description: e.target.value });
  }, []);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  async function fetchExercise() {
    try {
      setLoading(true);
      const response = await fetch(`/api/exercises/${id}`, {
        credentials: 'include',
      });

      if (response.status === 404) {
        navigate({ to: '/exercises' });
        return;
      }

       if (response.ok) {
         const data: ExerciseResponse = await response.json();
         setExercise(data);
         setFormData({
           name: data.name || '',
           muscleGroup: data.muscleGroup ?? '',
           customMuscleGroup: (data.muscleGroup && MUSCLE_GROUPS.includes(data.muscleGroup as MuscleGroup))
             ? ''
              : (data.muscleGroup ?? ''),
           description: data.description ?? '',
         });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!auth.loading && auth.user && id) {
      void fetchExercise();
    }
  }, [auth.loading, auth.user, id]);

  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.muscleGroup) {
      newErrors.muscleGroup = 'Muscle group is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmitAsync(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const finalMuscleGroup = formData.muscleGroup === 'Custom'
        ? formData.customMuscleGroup.trim() || 'Other'
        : formData.muscleGroup;

      const response = await fetch(`/api/exercises/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          muscleGroup: finalMuscleGroup,
          description: formData.description.trim() || undefined,
        }),
      });

      if (response.ok) {
        toast.success('Exercise updated successfully!');
        setTimeout(() => {
          navigate({ to: '/exercises/$id', params: { id } });
        }, 1000);
      } else if (response.status === 403) {
        const errorMsg = 'You do not have permission to edit this exercise';
        setErrors({ submit: errorMsg });
        toast.error(errorMsg);
      } else if (response.status === 404) {
        const errorMsg = 'Exercise not found';
        setErrors({ submit: errorMsg });
        toast.error(errorMsg);
      } else {
        let errorData: { message?: string } = {};
        try {
          errorData = await response.json();
        } catch {
          // use default
        }
        const errorMsg = errorData.message ?? 'Failed to update exercise';
        setErrors({ submit: errorMsg });
        toast.error(errorMsg);
      }
    } catch {
      const errorMsg = 'An error occurred. Please try again.';
      setErrors({ submit: errorMsg });
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmitAsync(e);
  }, [handleSubmitAsync]);


  if (auth.loading || redirecting || loading) {
    return (
	<div className="min-h-screen flex items-center justify-center">
		<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
	</div>
    );
  }

  if (!exercise) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="space-y-4">
          <div className="bg-background rounded-lg border border-border p-8 text-center">
            <p className="text-muted-foreground">Exercise not found</p>
            <Link
              className="mt-4 inline-flex items-center gap-2 text-primary hover:text-primary/80"
              to="/exercises"
            >
              <ArrowLeft size={16} />
              Back to exercises
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const selectedMuscleGroupValue = MUSCLE_GROUPS.includes(formData.muscleGroup as MuscleGroup)
    ? formData.muscleGroup
    : 'Custom';

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <Link
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          params={{ id }}
          to="/exercises/$id"
        >
          <ArrowLeft size={20} />
          Back to exercise
        </Link>
      </div>

      <div className="space-y-4">
        <div className="bg-background rounded-lg border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h1 className="text-xl font-semibold text-foreground">Edit Exercise</h1>
          </div>

          <form className="p-6 space-y-6" onSubmit={handleSubmit}>
            {errors.submit ? (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                <AlertCircle size={20} />
                <span>{errors.submit}</span>
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="name">
                {'Name '}
                <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow ${
                  errors.name ? 'border-red-500' : 'border-input'
                }`}
                id="name"
                onChange={handleNameChange}
                placeholder="e.g., Bench Press"
                type="text"
                value={formData.name}
              />
              {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name}</p> : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="muscleGroup">
                {'Muscle Group '}
                <span className="text-red-500">*</span>
              </label>
              <select
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-background ${
                  errors.muscleGroup ? 'border-red-500' : 'border-input'
                }`}
                id="muscleGroup"
                onChange={handleMuscleGroupChange}
                value={selectedMuscleGroupValue}
              >
                <option value="">Select muscle group</option>
                {MUSCLE_GROUPS.filter((g) => g !== 'Custom').map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
                <option value="Custom">Custom...</option>
              </select>
              {errors.muscleGroup ? <p className="mt-1 text-sm text-red-600">{errors.muscleGroup}</p> : null}
            </div>

            {selectedMuscleGroupValue === 'Custom' ? (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1" htmlFor="customMuscleGroup">
                  Custom Muscle Group
                </label>
                <input
                  className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow"
                  id="customMuscleGroup"
                  onChange={handleCustomMuscleGroupChange}
                  placeholder="Enter custom muscle group"
                  type="text"
                  value={formData.customMuscleGroup}
                />
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="description">
                {'Description '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow resize-none bg-background"
                id="description"
                onChange={handleDescriptionChange}
                placeholder="Add a description for this exercise..."
                rows={4}
                value={formData.description}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Link
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                params={{ id }}
                to="/exercises/$id"
              >
                Cancel
              </Link>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
                type="submit"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export const Route = createFileRoute('/exercises/$id/edit')({
  component: EditExercise,
});
