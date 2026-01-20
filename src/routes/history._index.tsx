import { createFileRoute, Link } from '@tanstack/react-router';
import { Calendar, ChevronDown, ChevronUp, Clock, Dumbbell, Loader2, Scale, Search, Trophy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './__root';

interface WorkoutHistoryItem {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string;
  exerciseCount: number;
  totalSets: number;
  totalVolume: number;
  duration: number;
  exercises?: Array<{
    id: string;
    name: string;
    sets: Array<{ setNumber: number; weight: number; reps: number }>;
  }>;
}

interface WorkoutStats {
  totalWorkouts: number;
  thisWeek: number;
  thisMonth: number;
  totalVolume: number;
  totalSets: number;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const formatVolume = (kg: number) => {
  return kg.toLocaleString();
};

const getThisWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    from: monday.toISOString(),
    to: sunday.toISOString(),
  };
};

const getThisMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  firstDay.setHours(0, 0, 0, 0);

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  lastDay.setHours(23, 59, 59, 999);

  return {
    from: firstDay.toISOString(),
    to: lastDay.toISOString(),
  };
};



function History() {
  const auth = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [exerciseFilter, setExerciseFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState<'startedAt' | 'volume' | 'duration'>('startedAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [page, setPage] = useState(1);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/workouts/stats', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data as WorkoutStats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchWorkouts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams();
      params.set('page', pageNum.toString());
      params.set('limit', '10');
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      if (exerciseFilter) params.set('exerciseId', exerciseFilter);

      if (sortBy === 'startedAt') {
        params.set('sortBy', sortBy);
        params.set('sortOrder', sortOrder);
      }

      const response = await fetch(`/api/workouts?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const workoutList = data as WorkoutHistoryItem[];

        const workoutsWithDetails = await Promise.all(
          workoutList.map(async (workout) => {
            const exercisesRes = await fetch(`/api/workouts/${workout.id}/exercises`, {
              credentials: 'include',
            });

            if (exercisesRes.ok) {
              const exercisesData: Array<{
                id: string;
                exercise?: { name: string };
                sets: Array<{
                  setNumber: number;
                  weight: number | null;
                  reps: number | null;
                  isComplete: boolean;
                }>;
              }> = await exercisesRes.json();
              const exerciseCount = exercisesData.length;
              let totalSets = 0;
              let totalVolume = 0;
              const exerciseDetails: Array<{ id: string; name: string; sets: Array<{ setNumber: number; weight: number; reps: number }> }> = [];

              for (const we of exercisesData) {
                const sets = we.sets;
                totalSets += sets.length;
                const setDetails: Array<{ setNumber: number; weight: number; reps: number }> = [];

                for (const set of sets) {
                  if (set.weight && set.reps) {
                    totalVolume += set.weight * set.reps;
                  }
                  if (set.isComplete) {
                    setDetails.push({
                      setNumber: set.setNumber,
                      weight: set.weight ?? 0,
                      reps: set.reps ?? 0,
                    });
                  }
                }

                exerciseDetails.push({
                  id: we.id,
                  name: we.exercise?.name ?? '',
                  sets: setDetails,
                });
              }

              const started = new Date(workout.startedAt);
              const completed = new Date(workout.completedAt);
              const duration = Math.floor((completed.getTime() - started.getTime()) / 60000);

              return {
                ...workout,
                exerciseCount,
                totalSets,
                totalVolume,
                duration,
                exercises: exerciseDetails,
              };
            }

            return workout;
          })
        );

        let filteredWorkouts = workoutsWithDetails;

        if (search) {
          filteredWorkouts = workoutsWithDetails.filter((w) =>
            w.name.toLowerCase().includes(search.toLowerCase())
          );
        }

        const sortedWorkouts = [...filteredWorkouts];
        if (sortBy === 'volume') {
          sortedWorkouts.sort((a, b) => {
            return sortOrder === 'DESC' ? b.totalVolume - a.totalVolume : a.totalVolume - b.totalVolume;
          });
        } else if (sortBy === 'duration') {
          sortedWorkouts.sort((a, b) => {
            return sortOrder === 'DESC' ? b.duration - a.duration : a.duration - b.duration;
          });
        }

        if (append) {
          setWorkouts((prev) => [...prev, ...sortedWorkouts]);
        } else {
          setWorkouts(sortedWorkouts);
        }

        setHasMore(workoutList.length === 10);
      }
    } catch (err) {
      console.error('Failed to fetch workouts:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fromDate, toDate, exerciseFilter, sortBy, sortOrder, search]);

  const fetchExercises = useCallback(async () => {
    try {
      const response = await fetch('/api/exercises', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setExercises(data as Exercise[]);
      }
    } catch (err) {
      console.error('Failed to fetch exercises:', err);
    }
  }, []);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      void fetchStats();
      void fetchExercises();
      void fetchWorkouts(1, false);
    }
  }, [auth.loading, auth.user, fetchStats, fetchExercises, fetchWorkouts]);

  useEffect(() => {
    setPage(1);
    setWorkouts([]);
    setExpandedIds(new Set());
    void fetchWorkouts(1, false);
  }, [search, exerciseFilter, fromDate, toDate, sortBy, sortOrder, fetchWorkouts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage((prev) => prev + 1);
          void fetchWorkouts(page + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '500px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadingMore, page, fetchWorkouts]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleExerciseFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setExerciseFilter(e.target.value);
  }, []);

  const handleFromDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFromDate(e.target.value);
  }, []);

  const handleToDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setToDate(e.target.value);
  }, []);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const [by, order] = e.target.value.split('-');
    setSortBy(by as 'startedAt' | 'volume' | 'duration');
    setSortOrder(order as 'ASC' | 'DESC');
  }, []);

  const handleQuickFilter = useCallback((filter: string) => {
    if (filter === 'thisWeek') {
      const { from, to } = getThisWeekRange();
      setFromDate(from);
      setToDate(to);
    } else if (filter === 'thisMonth') {
      const { from, to } = getThisMonthRange();
      setFromDate(from);
      setToDate(to);
    } else if (filter === 'allTime') {
      setFromDate('');
      setToDate('');
    }
  }, []);

  const handleStatCardClick = useCallback((statType: string) => {
    if (statType === 'totalWorkouts') {
      handleQuickFilter('allTime');
    } else if (statType === 'thisWeek') {
      handleQuickFilter('thisWeek');
    } else if (statType === 'thisMonth') {
      handleQuickFilter('thisMonth');
    }
  }, [handleQuickFilter]);

  const handleTotalWorkoutsClick = useCallback(() => {
    handleStatCardClick('totalWorkouts');
  }, [handleStatCardClick]);

  const handleThisWeekStatClick = useCallback(() => {
    handleStatCardClick('thisWeek');
  }, [handleStatCardClick]);

  const handleThisMonthStatClick = useCallback(() => {
    handleStatCardClick('thisMonth');
  }, [handleStatCardClick]);

  const handleAllTimeClick = useCallback(() => {
    handleQuickFilter('allTime');
  }, [handleQuickFilter]);

  const handleThisWeekClick = useCallback(() => {
    handleQuickFilter('thisWeek');
  }, [handleQuickFilter]);

  const handleThisMonthClick = useCallback(() => {
    handleQuickFilter('thisMonth');
  }, [handleQuickFilter]);

  const handleToggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleWorkoutCardClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const workoutId = e.currentTarget.getAttribute('data-workout-id');
    if (workoutId) {
      handleToggleExpanded(workoutId);
    }
  }, [handleToggleExpanded]);

  if (auth.loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Workout History</h1>

        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <button
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all text-left"
              onClick={handleTotalWorkoutsClick}
              type="button"
            >
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="text-blue-600" size={18} />
                <span className="text-sm text-gray-500">Total Workouts</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalWorkouts}</p>
            </button>

            <button
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all text-left"
              onClick={handleThisWeekStatClick}
              type="button"
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="text-green-600" size={18} />
                <span className="text-sm text-gray-500">This Week</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
            </button>

            <button
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all text-left"
              onClick={handleThisMonthStatClick}
              type="button"
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="text-purple-600" size={18} />
                <span className="text-sm text-gray-500">This Month</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
            </button>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="text-orange-600" size={18} />
                <span className="text-sm text-gray-500">Total Volume</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatVolume(stats.totalVolume)} kg</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className="text-red-600" size={18} />
                <span className="text-sm text-gray-500">Total Sets</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSets}</p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              !fromDate && !toDate
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            onClick={handleAllTimeClick}
            type="button"
          >
            All Time
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              fromDate && fromDate === getThisWeekRange().from
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            onClick={handleThisWeekClick}
            type="button"
          >
            This Week
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              fromDate && fromDate === getThisMonthRange().from
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            onClick={handleThisMonthClick}
            type="button"
          >
            This Month
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              onChange={handleSearchChange}
              placeholder="Search workouts..."
              type="text"
              value={search}
            />
          </div>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow bg-white"
            onChange={handleExerciseFilterChange}
            value={exerciseFilter}
          >
            <option value="">All Exercises</option>
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>

          <input
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            onChange={handleFromDateChange}
            type="date"
            value={fromDate ? fromDate.split('T')[0] : ''}
          />

          <input
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            onChange={handleToDateChange}
            type="date"
            value={toDate ? toDate.split('T')[0] : ''}
          />

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow bg-white"
            onChange={handleSortChange}
            value={`${sortBy}-${sortOrder}`}
          >
            <option value="startedAt-DESC">Newest First</option>
            <option value="startedAt-ASC">Oldest First</option>
            <option value="volume-DESC">Most Volume</option>
            <option value="volume-ASC">Least Volume</option>
            <option value="duration-DESC">Longest Duration</option>
            <option value="duration-ASC">Shortest Duration</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-12">
            <Dumbbell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workouts found</h3>
            <p className="text-gray-600 mb-4">
              {search || fromDate || toDate || exerciseFilter
                ? 'Try adjusting your filters'
                : 'Complete your first workout to see history here'}
            </p>
            {!search && !fromDate && !toDate && !exerciseFilter ? (
              <a
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                href="/workouts/new"
              >
                Start Workout
              </a>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => (
              <div className="bg-white rounded-lg border border-gray-200 p-4" key={workout.id}>
                <button
                  className="w-full flex items-start justify-between cursor-pointer"
                  data-workout-id={workout.id}
                  onClick={handleWorkoutCardClick}
                  type="button"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{workout.name}</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(workout.startedAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {formatDuration(workout.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Dumbbell size={14} />
                        {workout.exerciseCount} exercises
                      </span>
                      <span className="flex items-center gap-1">
                        <Scale size={14} />
                        {workout.totalSets} sets
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy size={14} />
                        {formatVolume(workout.totalVolume)} kg
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {expandedIds.has(workout.id) ? (
                      <ChevronUp className="text-gray-400" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={20} />
                    )}
                  </div>
                </button>

                {expandedIds.has(workout.id) ? (
                  workout.exercises ? (
                    <div className="border-t border-gray-200 pt-4 mt-3">
                      {workout.exercises.map((exercise) => (
                        <div className="mb-4 last:mb-0" key={`${workout.id}-exercise-${exercise.id}`}>
                          <p className="font-medium text-gray-900 mb-2">
                            <Link to="/history/$exerciseId" params={{ exerciseId: exercise.id }} className="hover:underline hover:text-blue-600">
                              {exercise.name}
                            </Link>
                          </p>
                          {exercise.sets.length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left py-1 font-medium">Set</th>
                                  <th className="text-left py-1 font-medium">kg</th>
                                  <th className="text-left py-1 font-medium">Reps</th>
                                </tr>
                              </thead>
                              <tbody>
                                {exercise.sets.map((set) => (
                                  <tr className="border-b border-gray-100 last:border-0" key={set.setNumber}>
                                    <td className="py-1">
                                      <span className="inline-flex items-center justify-center w-6 h-6 text-sm font-medium rounded bg-blue-100 text-blue-700">
                                        {set.setNumber}
                                      </span>
                                    </td>
                                    <td className="py-1">{set.weight}</td>
                                    <td className="py-1">{set.reps}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : null}
                          {exercise.sets.length === 0 ? <p className="text-sm text-gray-500">No sets recorded</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : null
                ) : null}
              </div>
            ))}

            {hasMore ? (
              <div ref={observerTarget} className="flex items-center justify-center py-8">
                {loadingMore ? <Loader2 className="animate-spin text-blue-600" size={32} /> : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/history/_index')({
  component: History,
});
