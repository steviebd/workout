/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/no-use-before-define, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unnecessary-condition, no-alert */
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuth } from './__root';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

function ExerciseDetail() {
  const { id } = Route.useParams();
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const exerciseId = id;

  useEffect(() => {
    async function fetchExercise() {
      if (!auth.user) return;

      try {
        const response = await fetch(`/api/exercises/${exerciseId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) {
            setExercise(null);
            setError(null);
          } else {
            setError('Failed to load exercise');
          }
          return;
        }

        const data = await response.json() as Exercise;
        setExercise(data);
        setError(null);
      } catch {
        setError('Failed to load exercise');
      } finally {
        setLoading(false);
      }
    }

    if (!auth.loading && auth.user) {
      void fetchExercise();
    } else if (!auth.loading && !auth.user) {
      setLoading(false);
    }
  }, [auth.loading, auth.user, exerciseId]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this exercise?')) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        window.location.href = '/exercises';
      } else {
        void alert('Failed to delete exercise');
      }
    } catch {
      void alert('Failed to delete exercise');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  if (auth.loading || (!auth.user && !auth.loading)) {
    return (
	<div className={'min-h-screen flex items-center justify-center'}>
		<p className={'text-gray-600'}>{'Loading...'}</p>
	</div>
    );
  }

  if (loading) {
    return (
	<div className={'min-h-screen flex items-center justify-center'}>
		<p className={'text-gray-600'}>{'Loading exercise...'}</p>
	</div>
    );
  }

  if (error) {
    return (
	<div className={'min-h-screen bg-gray-50 p-8'}>
		<div className={'max-w-2xl mx-auto'}>
			<div className={'bg-red-50 border border-red-200 rounded-lg p-4'}>
				<p className={'text-red-600'}>{error}</p>
			</div>
		</div>
	</div>
    );
  }

  if (!exercise) {
    return (
	<div className={'min-h-screen bg-gray-50 p-8'}>
		<div className={'max-w-2xl mx-auto'}>
			<div className={'bg-white shadow rounded-lg p-6'}>
				<h1 className={'text-2xl font-bold text-gray-900 mb-4'}>{'Exercise Not Found'}</h1>
				<p className={'text-gray-600 mb-4'}>{'The exercise you\'re looking for doesn\'t exist or has been deleted.'}</p>
				<a className={'text-blue-600 hover:text-blue-500'} href={'/exercises'}>
					{'← Back to Exercises'}
				</a>
			</div>
		</div>
	</div>
    );
  }

  return (
	<div className={'min-h-screen bg-gray-50 p-8'}>
		<div className={'max-w-2xl mx-auto'}>
			<div className={'mb-6'}>
				<a className={'text-blue-600 hover:text-blue-500 text-sm'} href={'/exercises'}>
					{'← Back to Exercises'}
				</a>
			</div>

			<div className={'bg-white shadow rounded-lg overflow-hidden'}>
				<div className={'px-6 py-4 border-b border-gray-200 flex justify-between items-center'}>
					<h1 className={'text-2xl font-bold text-gray-900'}>{exercise.name}</h1>
					<div className={'flex space-x-3'}>
						<a
							className={'inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'}
							href={`/exercises/${exercise.id}/edit`}
						>
							{'Edit'}
						</a>
						<button
							className={'inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50'}
							disabled={deleting}
							onClick={handleDelete}
						>
							{deleting ? 'Deleting...' : 'Delete'}
						</button>
					</div>
				</div>

				<div className={'px-6 py-4 space-y-4'}>
					{exercise.muscleGroup ? <div>
						<label className={'block text-sm font-medium text-gray-500'}>{'Muscle Group'}</label>
						<p className={'mt-1 text-gray-900'}>{exercise.muscleGroup}</p>
                             </div> : null}

					{exercise.description ? <div>
						<label className={'block text-sm font-medium text-gray-500'}>{'Description'}</label>
						<p className={'mt-1 text-gray-900 whitespace-pre-wrap'}>{exercise.description}</p>
                             </div> : null}

					<div className={'grid grid-cols-2 gap-4 pt-4'}>
						<div>
							<label className={'block text-sm font-medium text-gray-500'}>{'Created'}</label>
							<p className={'mt-1 text-gray-900 text-sm'}>
								{new Date(exercise.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
							</p>
						</div>
						<div>
							<label className={'block text-sm font-medium text-gray-500'}>{'Last Updated'}</label>
							<p className={'mt-1 text-gray-900 text-sm'}>
								{new Date(exercise.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
  );
}

export const Route = createFileRoute('/exercises/$id')({
  component: ExerciseDetail,
});
