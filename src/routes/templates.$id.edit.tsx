/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-definitions */
import { Link, createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Loader2, Plus, Save, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { type Template, type Exercise } from '@/lib/db/schema';
import { type TemplateExerciseWithDetails } from '@/lib/db/template';

type SelectedExercise = {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
}

type FormErrors = {
  name?: string;
  exercises?: string;
  submit?: string;
}

function EditTemplate() {
  const { id } = useParams({ from: '/templates/$id/edit' });
  const navigate = useNavigate();
  const auth = useAuth();

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

      if (templateRes.ok) {
        const templateData: Template = await templateRes.json();
        setTemplate(templateData);
        setFormData({
          name: templateData.name || '',
          description: templateData.description || '',
          notes: templateData.notes || '',
        });
      }

      if (exercisesRes.ok) {
        const exercisesData: TemplateExerciseWithDetails[] = await exercisesRes.json();
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
        const allExercisesData: Exercise[] = await allExercisesRes.json();
        setAllExercises(allExercisesData);
      }
    } catch (error) {
      console.error('Failed to fetch template:', error);
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

  const handleAddExercise = (exercise: Exercise) => {
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
  };

  const handleRemoveExercise = (id: string) => {
    setSelectedExercises(selectedExercises.filter((se) => se.id !== id));
  };

  const handleMoveExercise = (index: number, direction: 'down' | 'up') => {
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
        setErrors({ submit: 'Template not found' });
        return;
      }

      if (templateRes.status === 403) {
        setErrors({ submit: 'You do not have permission to edit this template' });
        return;
      }

      if (!templateRes.ok) {
        const errorData = await templateRes.json().catch(() => ({})) as any;
        setErrors({ submit: errorData.message || 'Failed to update template' });
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
      setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (auth.loading || redirecting || loading) {
    return (
	<div className={'min-h-screen flex items-center justify-center'}>
		<div className={'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'} />
	</div>
    );
  }

  if (!template) {
    return (
	<div className={'min-h-screen bg-gray-50 p-4 sm:p-8'}>
		<div className={'max-w-4xl mx-auto'}>
			<div className={'bg-white rounded-lg border border-gray-200 p-8 text-center'}>
				<p className={'text-gray-600'}>{'Template not found'}</p>
				<Link
					className={'mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700'}
					to={'/templates'}
				>
					<ArrowLeft size={16} />
					{'Back to templates'}
				</Link>
			</div>
		</div>
	</div>
    );
  }

  return (
	<div className={'min-h-screen bg-gray-50 p-4 sm:p-8'}>
		<div className={'max-w-4xl mx-auto'}>
			<div className={'mb-6'}>
				<Link
					className={'inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors'}
							params={{ id }}
					to={'/templates/$id'}
				>
					<ArrowLeft size={20} />
					{'Back to template'}
				</Link>
			</div>

			<div className={'bg-white rounded-lg border border-gray-200 shadow-sm'}>
				<div className={'px-6 py-4 border-b border-gray-200'}>
					<h1 className={'text-xl font-semibold text-gray-900'}>{'Edit Template'}</h1>
				</div>

				<form className={'p-6 space-y-6'} onSubmit={(e) => void handleSubmit(e)}>
					{errors.submit ? <div className={'flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700'}>
						<span>{errors.submit}</span>
                      </div> : null}

					<div>
						<label className={'block text-sm font-medium text-gray-700 mb-1'} htmlFor={'name'}>
							{'Template Name '}
							<span className={'text-red-500'}>{'*'}</span>
						</label>
						<input
							className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
							id={'name'}
							onChange={(e) => void setFormData({ ...formData, name: e.target.value })}
							placeholder={'e.g., Upper Body Workout'}
							type={'text'}
							value={formData.name}
						/>
						{errors.name ? <p className={'mt-1 text-sm text-red-600'}>{errors.name}</p> : null}
					</div>

					<div>
						<label className={'block text-sm font-medium text-gray-700 mb-1'} htmlFor={'description'}>
							{'Description '}
							<span className={'text-gray-400 font-normal'}>{'(optional)'}</span>
						</label>
						<textarea
							className={'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none'}
							id={'description'}
							onChange={(e) => void setFormData({ ...formData, description: e.target.value })}
							placeholder={'Brief description of this template...'}
							rows={2}
							value={formData.description}
						/>
					</div>

					<div>
						<label className={'block text-sm font-medium text-gray-700 mb-1'} htmlFor={'notes'}>
							{'Notes '}
							<span className={'text-gray-400 font-normal'}>{'(optional)'}</span>
						</label>
						<textarea
							className={'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none'}
							id={'notes'}
							onChange={(e) => void setFormData({ ...formData, notes: e.target.value })}
							placeholder={'Additional notes or instructions...'}
							rows={3}
							value={formData.notes}
						/>
					</div>

					<div>
						<div className={'flex items-center justify-between mb-2'}>
							<label className={'block text-sm font-medium text-gray-700'}>
								{'Exercises '}
								<span className={'text-red-500'}>{'*'}</span>
							</label>
							<button
								className={'inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors'}
								onClick={() => void setShowExerciseSelector(true)}
								type={'button'}
							>
								<Plus size={16} />
								{'Add Exercise'}
							</button>
						</div>

						{errors.exercises ? <p className={'mb-2 text-sm text-red-500'}>{errors.exercises}</p> : null}

						{selectedExercises.length === 0 ? (
							<div className={'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center'}>
								<p className={'text-gray-500'}>{'No exercises added yet'}</p>
								<p className={'text-sm text-gray-400 mt-1'}>
									{'Click "Add Exercise" to add exercises to this template'}
								</p>
							</div>
              ) : (
	<div className={'space-y-2'}>
		{selectedExercises.map((exercise, index) => (
			<div
				className={'flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200'}
				key={exercise.id}
			>
				<span className={'flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-sm font-medium rounded'}>
					{index + 1}
				</span>
				<div className={'flex-1'}>
					<p className={'font-medium text-gray-900'}>{exercise.name}</p>
					{exercise.muscleGroup ? <p className={'text-sm text-gray-500'}>{exercise.muscleGroup}</p> : null}
				</div>
				<div className={'flex items-center gap-1'}>
					<button
						className={'p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed'}
						disabled={index === 0}
						onClick={() => void handleMoveExercise(index, 'up')}
						type={'button'}
					>
						{'↑'}
					</button>
					<button
						className={'p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed'}
						disabled={index === selectedExercises.length - 1}
						onClick={() => void handleMoveExercise(index, 'down')}
						type={'button'}
					>
						{'↓'}
					</button>
					<button
						className={'p-1 text-gray-400 hover:text-red-600'}
						onClick={() => void handleRemoveExercise(exercise.id)}
						type={'button'}
					>
						<X size={18} />
					</button>
				</div>
			</div>
                  ))}
	</div>
              )}
					</div>

					<div className={'flex justify-end gap-3 pt-4 border-t border-gray-200'}>
						<Link
							className={'px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors'}
					params={{ id }}
							to={'/templates/$id'}
						>
							{'Cancel'}
						</Link>
						<button
							className={'inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400 disabled:cursor-not-allowed'}
							disabled={submitting}
							type={'submit'}
						>
							{submitting ? (
								<>
									<Loader2 className={'animate-spin'} size={18} />
									{'Saving...'}
								</>
                ) : (
	<>
		<Save size={18} />
		{'Save Changes'}
	</>
                )}
						</button>
					</div>
				</form>
			</div>
		</div>

		{showExerciseSelector ? <div className={'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'}>
			<div className={'bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col'}>
				<div className={'flex items-center justify-between p-4 border-b'}>
					<h2 className={'text-lg font-semibold text-gray-900'}>{'Add Exercise'}</h2>
					<button
						className={'p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'}
						onClick={() => {
                  setShowExerciseSelector(false);
                  setExerciseSearch('');
                }}
					>
						<X size={20} />
					</button>
				</div>

				<div className={'p-4 border-b'}>
					<div className={'relative'}>
						<Search className={'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'} size={18} />
						<input
							autoFocus={true}
							className={'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}
							onChange={(e) => setExerciseSearch(e.target.value)}
							placeholder={'Search exercises...'}
							type={'text'}
							value={exerciseSearch}
						/>
					</div>
				</div>

				<div className={'flex-1 overflow-y-auto p-4'}>
					{filteredExercises.length === 0 ? (
						<div className={'text-center py-8 text-gray-500'}>{'No exercises found'}</div>
              ) : (
	<div className={'space-y-2'}>
		{filteredExercises.map((exercise) => {
                    const isSelected = selectedExercises.some(
                      (se) => se.exerciseId === exercise.id
                    );
                    return (
	<button
		className={'w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'}
		disabled={isSelected}
		key={exercise.id}
		onClick={() => handleAddExercise(exercise)}
	>
		<div className={'flex items-center justify-between'}>
			<div>
				<h3 className={'font-medium text-gray-900'}>{exercise.name}</h3>
				{exercise.muscleGroup ? <span className={'inline-block mt-1 px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded-full'}>
					{exercise.muscleGroup}
                            </span> : null}
			</div>
			{isSelected ? <span className={'text-green-600 text-sm font-medium'}>{'Added'}</span> : null}
		</div>
	</button>
                    );
                  })}
	</div>
              )}
				</div>
			</div>
                          </div> : null}
	</div>
   );
}

export const Route = createFileRoute('/templates/$id/edit')({
  component: EditTemplate,
});
