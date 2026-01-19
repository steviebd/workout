/* eslint-disable @typescript-eslint/consistent-type-definitions, react/jsx-closing-tag-location */
import { createFileRoute } from '@tanstack/react-router';
import { ArrowLeft, Loader2, Plus, Save, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { type Template } from '@/lib/db/schema';

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
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }, [formData.name, formData.description, formData.notes, selectedExercises, validateForm]);

  const onFormSubmit = useCallback((e: React.FormEvent) => {
    void handleSubmit(e);
  }, [handleSubmit]);

  if (auth.loading || redirecting) {
    return (
	<div className={'min-h-screen flex items-center justify-center'}>
		<p className={'text-gray-600'}>{'Redirecting to sign in...'}</p>
	</div>
    );
  }

  return (
	<div className={'min-h-screen bg-gray-50 p-4 sm:p-8'}>
		<div className={'max-w-4xl mx-auto'}>
			<div className={'mb-6'}>
				<a
					className={'inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors'}
					href={'/templates'}
				>
					<ArrowLeft size={20} />
					{'Back to templates'}
				</a>
			</div>

			<div className={'bg-white rounded-lg shadow-sm border border-gray-200 p-6'}>
				<h1 className={'text-2xl font-bold text-gray-900 mb-6'}>{'Create Template'}</h1>

				{error ? <div className={'mb-4 p-4 bg-red-50 border border-red-200 rounded-lg'}>
					<p className={'text-sm text-red-600'}>{error}</p>
				</div> : null}

				<form className={'space-y-6'} onSubmit={onFormSubmit}>
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
							onChange={handleNameChange}
							placeholder={'e.g., Upper Body Workout'}
							type={'text'}
							value={formData.name}
						/>
						{errors.name ? <p className={'mt-1 text-sm text-red-500'}>{errors.name}</p> : null}
					</div>

					<div>
						<label className={'block text-sm font-medium text-gray-700 mb-1'} htmlFor={'description'}>
							{'Description '}
							<span className={'text-gray-400 font-normal'}>{'(optional)'}</span>
						</label>
						<textarea
							className={'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none'}
							id={'description'}
							onChange={handleDescriptionChange}
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
							onChange={handleNotesChange}
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
								onClick={handleAddExerciseButtonClick}
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
				key={exercise.exerciseId}
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
						data-index={index}
						data-direction={'up'}
						disabled={index === 0}
						onClick={handleMoveClick}
						type={'button'}
					>
						{'↑'}
					</button>
					<button
						className={'p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed'}
						data-direction={'down'}
						data-index={index}
						disabled={index === selectedExercises.length - 1}
						onClick={handleMoveClick}
						type={'button'}
					>
						{'↓'}
					</button>
					<button
						className={'p-1 text-gray-400 hover:text-red-600'}
						data-id={exercise.exerciseId}
						onClick={handleRemoveClick}
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
						<a
							className={'px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors'}
							href={'/templates'}
						>
							{'Cancel'}
						</a>
						<button
							className={'inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400 disabled:cursor-not-allowed'}
							disabled={saving}
							type={'submit'}
						>
							{saving ? (
								<>
									<Loader2 className={'animate-spin'} size={18} />
									{'Creating...'}
								</>
                ) : (
	<>
		<Save size={18} />
		{'Create Template'}
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
						onClick={handleCloseExerciseSelector}
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
 							onChange={_handleExerciseSearchChange}
							placeholder={'Search exercises...'}
							type={'text'}
							value={exerciseSearch}
						/>
					</div>
				</div>

				<div className={'flex-1 overflow-y-auto p-4'}>
					{loading ? (
						<div className={'flex items-center justify-center py-8'}>
							<div className={'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'} />
						</div>
              ) : filteredExercises.length === 0 ? (
	<div className={'text-center py-8 text-gray-500'}>
		{'No exercises found'}
	</div>
              ) : (
	<div className={'space-y-2'}>
		{filteredExercises.map((exerciseItem) => (
			<button
				className={'w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'}
				data-id={exerciseItem.id}
				disabled={selectedExercises.some((se) => se.exerciseId === exerciseItem.id)}
				key={exerciseItem.id}
             onClick={handleExerciseSelectorClick}
			>
				<div className={'flex items-center justify-between'}>
					<div>
						<h3 className={'font-medium text-gray-900'}>{exerciseItem.name}</h3>
						{exerciseItem.muscleGroup ? <span className={'inline-block mt-1 px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded-full'}>
							{exerciseItem.muscleGroup}
                          </span> : null}
					</div>
					{selectedExercises.some((se) => se.exerciseId === exerciseItem.id) ? <span className={'text-green-600 text-sm font-medium'}>{'Added'}</span> : null}
				</div>
			</button>
                ))}
	</div>
              )}
				</div>
			</div>
		</div> : null}
	</div>
  );
}

export const Route = createFileRoute('/templates/new')({
  component: NewTemplate,
});
