/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-use-before-define, @typescript-eslint/no-floating-promises, react/jsx-closing-tag-location */
import { createFileRoute } from '@tanstack/react-router';
import { Calendar, Dumbbell, Filter, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';

const MUSCLE_GROUPS = [
  'All',
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
] as const;

type MuscleGroup = typeof MUSCLE_GROUPS[number];

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  createdAt: string;
}

function Exercises() {
  const auth = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup>('All');

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleMuscleGroupChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMuscleGroup(e.target.value as MuscleGroup);
  }, []);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      fetchExercises();
    }
  }, [auth.loading, auth.user]);

  async function fetchExercises() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedMuscleGroup !== 'All') params.set('muscleGroup', selectedMuscleGroup);

      const response = await fetch(`/api/exercises?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setExercises(data as Exercise[]);
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    } finally {
      setLoading(false);
    }
  }

  if (auth.loading || redirecting) {
    return (
	<div className={'min-h-screen flex items-center justify-center'}>
		<p className={'text-gray-600'}>{'Redirecting to sign in...'}</p>
	</div>
    );
  }

  return (
	<div className={'min-h-screen bg-gray-50 p-4 sm:p-8'}>
		<div className={'max-w-6xl mx-auto'}>
			<div className={'flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4'}>
				<h1 className={'text-3xl font-bold text-gray-900'}>{'Exercises'}</h1>
				<a
					className={'inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'}
					href={'/exercises/new'}
				>
					<Plus size={20} />
					{'New Exercise'}
				</a>
			</div>

			<div className={'flex flex-col sm:flex-row gap-4 mb-6'}>
				<div className={'relative flex-1'}>
					<Search className={'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'} size={20} />
					<input
						className={'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow'}
						onChange={handleSearchChange}
						placeholder={'Search exercises...'}
						type={'text'}
						value={search}
					/>
				</div>
				<div className={'relative'}>
					<Filter className={'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'} size={20} />
					<select
						className={'pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow appearance-none bg-white'}
						onChange={handleMuscleGroupChange}
						value={selectedMuscleGroup}
					>
						{MUSCLE_GROUPS.map((group) => (
							<option key={group} value={group}>
								{group}
							</option>
              ))}
					</select>
				</div>
			</div>

			{loading ? (
				<div className={'flex items-center justify-center py-12'}>
					<div className={'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'} />
				</div>
        ) : exercises.length === 0 ? (
	<div className={'text-center py-12'}>
		<Dumbbell className={'mx-auto h-12 w-12 text-gray-400 mb-4'} />
		<h3 className={'text-lg font-medium text-gray-900 mb-2'}>{'No exercises found'}</h3>
		<p className={'text-gray-600 mb-4'}>
			{search || selectedMuscleGroup !== 'All'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first exercise'}
		</p>
		{!search && selectedMuscleGroup === 'All' ? <a
			className={'inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'}
			href={'/exercises/new'}
		>
			<Plus size={20} />
			{'New Exercise'}
		</a> : null}
	</div>
        ) : (
	<div className={'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
		{exercises.map((exercise) => (
			<a
				className={'block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all'}
				href={`/exercises/${exercise.id}`}
				key={exercise.id}
			>
				<div className={'flex items-start justify-between mb-2'}>
					<h3 className={'font-semibold text-gray-900 line-clamp-1'}>{exercise.name}</h3>
					{exercise.muscleGroup ? <span className={'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800'}>
						{exercise.muscleGroup}
                             </span> : null}
				</div>
				{exercise.description ? <p className={'text-sm text-gray-600 line-clamp-2 mb-3'}>{exercise.description}</p> : null}
				<div className={'flex items-center text-xs text-gray-500'}>
					<Calendar className={'mr-1'} size={14} />
					{new Date(exercise.createdAt).toLocaleDateString()}
				</div>
			</a>
            ))}
	</div>
        )}
		</div>
	</div>
  );
}

export const Route = createFileRoute('/exercises/_index')({
  component: Exercises,
});
