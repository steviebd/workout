import { createFileRoute, useParams, useRouter, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuth } from './__root';
import { ArrowLeft, Plus, X, Search, Save, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/templates/$id/edit')({
  component: EditTemplate,
});

interface Template {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateExercise {
  id: string;
  exerciseId: string;
  orderIndex: number;
  exercise?: {
    id: string;
    name: string;
    muscleGroup: string | null;
  };
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
}

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

function EditTemplate() {
  const params = useParams({ from: '/templates/$id/edit' });
  const router = useRouter();
  const auth = useAuth();

  const [template, setTemplate] = useState<Template | null>(null);
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);
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

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!auth.loading && auth.user && params.id) {
      fetchData();
    }
  }, [auth.loading, auth.user, params.id]);

  async function fetchData() {
    try {
      setLoading(true);

      const [templateRes, exercisesRes, allExercisesRes] = await Promise.all([
        fetch(`/api/templates/${params.id}`, { credentials: 'include' }),
        fetch(`/api/templates/${params.id}/exercises`, { credentials: 'include' }),
        fetch('/api/exercises', { credentials: 'include' }),
      ]);

      if (templateRes.status === 404) {
        router.navigate({ to: '/templates' });
        return;
      }

      if (templateRes.ok) {
        const templateData = await templateRes.json() as Template;
        setTemplate(templateData);
        setFormData({
          name: templateData.name || '',
          description: templateData.description || '',
          notes: templateData.notes || '',
        });
      }

      if (exercisesRes.ok) {
        const exercisesData = await exercisesRes.json() as TemplateExercise[];
        setTemplateExercises(exercisesData);
        setSelectedExercises(
          exercisesData.map((te) => ({
            id: te.id,
            exerciseId: te.exerciseId,
            name: te.exercise?.name || 'Unknown',
            muscleGroup: te.exercise?.muscleGroup || null,
          }))
        );
      }

      if (allExercisesRes.ok) {
        const allExercisesData = await allExercisesRes.json() as Exercise[];
        setAllExercises(allExercisesData);
      }
    } catch (error) {
      console.error('Failed to fetch template:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredExercises = allExercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const handleAddExercise = (exercise: Exercise) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
  };

  const handleRemoveExercise = (id: string) => {
    setSelectedExercises(selectedExercises.filter((se) => se.id !== id));
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const newExercises = [...selectedExercises];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < selectedExercises.length) {
      [newExercises[index], newExercises[newIndex]] = [
        newExercises[newIndex],
        newExercises[index],
      ];
      setSelectedExercises(newExercises);
    }
  };

  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
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
      const templateRes = await fetch(`/api/templates/${params.id}`, {
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
        setErrors({ submit: 'Template not found' });
        return;
      }

      if (templateRes.status === 403) {
        setErrors({ submit: 'You do not have permission to edit this template' });
        return;
      }

      if (!templateRes.ok) {
        const errorData = await templateRes.json().catch(() => ({}));
        setErrors({ submit: errorData.message || 'Failed to update template' });
        return;
      }

      const originalExerciseIds = new Set(templateExercises.map((te) => te.exerciseId));
      const newExerciseIds = new Set(selectedExercises.map((se) => se.exerciseId));

      const exercisesToRemove = templateExercises.filter(
        (te) => !newExerciseIds.has(te.exerciseId)
      );

      for (const te of exercisesToRemove) {
        await fetch(`/api/templates/${params.id}/exercises/${te.exerciseId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }

      const existingExerciseIds = new Set(templateExercises.map((te) => te.exerciseId));
      const exercisesToAdd = selectedExercises.filter(
        (se) => !existingExerciseIds.has(se.exerciseId)
      );

      for (let i = 0; i < selectedExercises.length; i++) {
        const se = selectedExercises[i];
        const exerciseInOriginal = templateExercises.find((te) => te.exerciseId === se.exerciseId);

        if (exerciseInOriginal) {
          if (exerciseInOriginal.orderIndex !== i) {
            await fetch(`/api/templates/${params.id}/exercises/reorder`, {
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
          await fetch(`/api/templates/${params.id}/exercises`, {
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

      router.navigate({ to: '/templates/$id', params: { id: params.id } });
    } catch (error) {
      setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (auth.loading || redirecting || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">Template not found</p>
            <Link
              to="/templates"
              className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft size={16} />
              Back to templates
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            to="/templates/$id"
            params={{ id: params.id }}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to template
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">Edit Template</h1>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {errors.submit && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <span>{errors.submit}</span>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Upper Body Workout"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none"
                placeholder="Brief description of this template..."
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none"
                placeholder="Additional notes or instructions..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Exercises <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowExerciseSelector(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus size={16} />
                  Add Exercise
                </button>
              </div>

              {errors.exercises && (
                <p className="mb-2 text-sm text-red-500">{errors.exercises}</p>
              )}

              {selectedExercises.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <p className="text-gray-500">No exercises added yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Click "Add Exercise" to add exercises to this template
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedExercises.map((exercise, index) => (
                    <div
                      key={exercise.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-sm font-medium rounded">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{exercise.name}</p>
                        {exercise.muscleGroup && (
                          <p className="text-sm text-gray-500">{exercise.muscleGroup}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveExercise(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveExercise(index, 'down')}
                          disabled={index === selectedExercises.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(exercise.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Link
                to="/templates/$id"
                params={{ id: params.id }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
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
      </div>

      {showExerciseSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Add Exercise</h2>
              <button
                onClick={() => {
                  setShowExerciseSelector(false);
                  setExerciseSearch('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder="Search exercises..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No exercises found</div>
              ) : (
                <div className="space-y-2">
                  {filteredExercises.map((exercise) => {
                    const isSelected = selectedExercises.some(
                      (se) => se.exerciseId === exercise.id
                    );
                    return (
                      <button
                        key={exercise.id}
                        onClick={() => handleAddExercise(exercise)}
                        disabled={isSelected}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{exercise.name}</h3>
                            {exercise.muscleGroup && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                                {exercise.muscleGroup}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <span className="text-green-600 text-sm font-medium">Added</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
