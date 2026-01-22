import { createFileRoute, Link } from '@tanstack/react-router';
import { Calendar, ChevronRight, Clock, Dumbbell, Loader2, Scale, Search, Trophy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './__root';
import { EmptyWorkouts } from '@/components/EmptyState';
import { SkeletonCard } from '@/components/LoadingSpinner';
import { Card } from '~/components/ui/Card';
import { useUnit } from '@/lib/context/UnitContext';
import { useDateFormat } from '@/lib/context/DateFormatContext';

interface WorkoutHistoryItem {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string;
  exerciseCount: number;
  totalSets: number;
  totalVolume: number;
  duration: number;
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
  const { formatVolume } = useUnit();
  const { formatDate } = useDateFormat();
  const [redirecting, setRedirecting] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
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

      if (search) params.set('search', search);

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

        const sortedWorkouts = [...workoutList];
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

  const handleStartWorkout = useCallback(() => {
    window.location.href = '/workouts/new';
  }, []);

  if (auth.loading || redirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Workout History</h1>
      </div>
      <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <button
              className="bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-md transition-all text-left cursor-pointer"
              onClick={handleTotalWorkoutsClick}
              type="button"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Trophy className="text-blue-600" size={16} />
                <span className="text-xs text-muted-foreground">Total Workouts</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats?.totalWorkouts ?? 0}</p>
            </button>

            <button
              className="bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-md transition-all text-left cursor-pointer"
              onClick={handleThisWeekStatClick}
              type="button"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Calendar className="text-green-600" size={16} />
                <span className="text-xs text-muted-foreground">This Week</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats?.thisWeek ?? 0}</p>
            </button>

            <button
              className="bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-md transition-all text-left cursor-pointer"
              onClick={handleThisMonthStatClick}
              type="button"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Calendar className="text-purple-600" size={16} />
                <span className="text-xs text-muted-foreground">This Month</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats?.thisMonth ?? 0}</p>
            </button>

            <div className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Scale className="text-orange-600" size={16} />
                <span className="text-xs text-muted-foreground">Total Volume</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatVolume(stats?.totalVolume ?? 0)}</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Dumbbell className="text-red-600" size={16} />
                <span className="text-xs text-muted-foreground">Total Sets</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats?.totalSets ?? 0}</p>
            </div>
          </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              !fromDate && !toDate
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
            onClick={handleAllTimeClick}
            type="button"
          >
            All Time
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              fromDate && fromDate === getThisWeekRange().from
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
            onClick={handleThisWeekClick}
            type="button"
          >
            This Week
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              fromDate && fromDate === getThisMonthRange().from
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
            onClick={handleThisMonthClick}
            type="button"
          >
            This Month
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-input outline-none transition-shadow bg-background text-foreground"
              onChange={handleSearchChange}
              placeholder="Search workouts..."
              type="text"
              value={search}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              className="flex-1 min-w-[120px] max-w-[160px] px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-input outline-none transition-shadow bg-background text-foreground text-sm"
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
              className="flex-1 min-w-[100px] max-w-[130px] px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-input outline-none transition-shadow bg-background text-foreground text-sm"
              onChange={handleFromDateChange}
              type="date"
              value={fromDate ? fromDate.split('T')[0] : ''}
            />

            <input
              className="flex-1 min-w-[100px] max-w-[130px] px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-input outline-none transition-shadow bg-background text-foreground text-sm"
              onChange={handleToDateChange}
              type="date"
              value={toDate ? toDate.split('T')[0] : ''}
            />

            <select
              className="flex-1 min-w-[120px] max-w-[160px] px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-input outline-none transition-shadow bg-background text-foreground text-sm"
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
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : workouts.length === 0 ? (
          <EmptyWorkouts onStart={handleStartWorkout} />
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => (
              <Link
                key={workout.id}
                to="/workouts/$id"
                params={{ id: workout.id }}
                className="block"
              >
                <Card className="p-4 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">{workout.name}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/20 text-success">
                          Completed
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(workout.startedAt)}
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
                          {formatVolume(workout.totalVolume)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="text-muted-foreground ml-4" size={20} />
                  </div>
                </Card>
              </Link>
            ))}

            {hasMore ? (
              <div ref={observerTarget} className="flex items-center justify-center py-8">
                {loadingMore ? <Loader2 className="animate-spin text-primary" size={32} /> : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

export const Route = createFileRoute('/history/_index')({
  component: History,
});
