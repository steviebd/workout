import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { Calendar, Clock, Dumbbell, Loader2, Pencil, Scale, Search, Trophy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './__root';
import { EmptyWorkouts } from '@/components/ui/EmptyState';
import { Skeleton } from '~/components/ui/Skeleton';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Card } from '~/components/ui/Card';
import { Input } from '~/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/Select';
import { useUnit } from '@/lib/context/UnitContext';
import { useDateFormat } from '@/lib/context/DateFormatContext';
import { PageLayout } from '~/components/ui/PageLayout';
import { StatCard } from '~/components/ui/StatCard';
import { FilterPills } from '~/components/ui/FilterPills';

interface WorkoutHistoryItem {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string;
  exerciseCount: number;
  totalSets: number;
  totalVolume: number;
  duration: number;
  programCycleId: string | null;
  squat1rm: number | null;
  bench1rm: number | null;
  deadlift1rm: number | null;
  ohp1rm: number | null;
  startingSquat1rm: number | null;
  startingBench1rm: number | null;
  startingDeadlift1rm: number | null;
  startingOhp1rm: number | null;
  programCycle: {
    name: string;
    programSlug: string;
    squat1rm: number;
    bench1rm: number;
    deadlift1rm: number;
    ohp1rm: number;
    startingSquat1rm: number | null;
    startingBench1rm: number | null;
    startingDeadlift1rm: number | null;
    startingOhp1rm: number | null;
  } | null;
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
  const router = useRouter();
  const { formatVolume } = useUnit();
  const { formatDate } = useDateFormat();
  const [redirecting, setRedirecting] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [exerciseFilter, setExerciseFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState<'startedAt' | 'volume' | 'duration'>('startedAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [page, setPage] = useState(1);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const response = await fetch('/api/workouts/stats', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data as WorkoutStats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchWorkouts = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (!append) {
        setIsLoadingWorkouts(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams();
      params.set('page', pageNum.toString());
      params.set('limit', '10');
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      if (exerciseFilter && exerciseFilter !== 'all') params.set('exerciseId', exerciseFilter);

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
      setIsLoadingWorkouts(false);
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
        if (entries[0].isIntersecting && hasMore && !isLoadingWorkouts && !loadingMore) {
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
  }, [hasMore, isLoadingWorkouts, loadingMore, page, fetchWorkouts]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleExerciseFilterChange = useCallback((value: string) => {
    setExerciseFilter(value);
  }, []);

  const handleFromDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFromDate(e.target.value);
  }, []);

  const handleToDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setToDate(e.target.value);
  }, []);

  const handleSortChange = useCallback((value: string) => {
    const [by, order] = value.split('-');
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
    window.location.href = '/workouts';
  }, []);

  if (auth.loading || redirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <PageLayout title="Workout History">
      <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {isLoadingStats ? (
              <>
                <Skeleton className="h-[68px] rounded-lg" />
                <Skeleton className="h-[68px] rounded-lg" />
                <Skeleton className="h-[68px] rounded-lg" />
                <Skeleton className="h-[68px] rounded-lg" />
              </>
            ) : (
              <>
                <StatCard
                  icon={Trophy}
                  label="Total Workouts"
                  value={stats?.totalWorkouts ?? 0}
                  variant="primary"
                  onClick={handleTotalWorkoutsClick}
                />

                <StatCard
                  icon={Calendar}
                  label="This Week"
                  value={stats?.thisWeek ?? 0}
                  variant="primary"
                  onClick={handleThisWeekStatClick}
                />

                <StatCard
                  icon={Calendar}
                  label="This Month"
                  value={stats?.thisMonth ?? 0}
                  variant="primary"
                  onClick={handleThisMonthStatClick}
                />

                <StatCard
                  icon={Scale}
                  label="Total Volume"
                  value={formatVolume(stats?.totalVolume ?? 0)}
                  variant="primary"
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {isLoadingStats ? (
              <Skeleton className="h-[68px] rounded-lg" />
            ) : (
              <StatCard
                icon={Dumbbell}
                label="Total Sets"
                value={stats?.totalSets ?? 0}
                variant="primary"
              />
            )}
          </div>

          <FilterPills
            options={[
              { value: 'allTime', label: 'All Time' },
              { value: 'thisWeek', label: 'This Week' },
              { value: 'thisMonth', label: 'This Month' },
            ]}
            value={!fromDate && !toDate ? 'allTime' : fromDate === getThisWeekRange().from ? 'thisWeek' : 'thisMonth'}
            onChange={(value) => {
              if (value === 'allTime') handleAllTimeClick();
              else if (value === 'thisWeek') handleThisWeekClick();
              else if (value === 'thisMonth') handleThisMonthClick();
            }}
          />

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              className="w-full pl-10 pr-4"
              onChange={handleSearchChange}
              placeholder="Search workouts..."
              value={search}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select onValueChange={handleExerciseFilterChange} value={exerciseFilter}>
              <SelectTrigger className="flex-1 min-w-[120px] max-w-[160px]">
                <SelectValue placeholder="All Exercises" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exercises</SelectItem>
                {exercises.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              className="flex-1 min-w-[100px] max-w-[130px]"
              onChange={handleFromDateChange}
              type="date"
              value={fromDate ? fromDate.split('T')[0] : ''}
            />

            <Input
              className="flex-1 min-w-[100px] max-w-[130px]"
              onChange={handleToDateChange}
              type="date"
              value={toDate ? toDate.split('T')[0] : ''}
            />

            <Select onValueChange={handleSortChange} value={`${sortBy}-${sortOrder}`}>
              <SelectTrigger className="flex-1 min-w-[120px] max-w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="startedAt-DESC">Newest First</SelectItem>
                <SelectItem value="startedAt-ASC">Oldest First</SelectItem>
                <SelectItem value="volume-DESC">Most Volume</SelectItem>
                <SelectItem value="volume-ASC">Least Volume</SelectItem>
                <SelectItem value="duration-DESC">Longest Duration</SelectItem>
                <SelectItem value="duration-ASC">Shortest Duration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoadingWorkouts ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : workouts.length === 0 ? (
          <EmptyWorkouts onStart={handleStartWorkout} />
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => {
              const hasProgramCycle = Boolean(workout.programCycle);
              const is1RMTest = workout.name === '1RM Test' && hasProgramCycle;
              const programCycle = workout.programCycle ?? undefined;
              return (
                <Link
                  key={workout.id}
                  to="/workouts/$id"
                  params={{ id: workout.id }}
                  className="block"
                >
                  <Card className="p-4 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{workout.name}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/20 text-success">
                          Completed
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void router.navigate({ to: '/workouts/$id/edit', params: { id: workout.id } });
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                        title="Edit workout"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                    {Boolean(is1RMTest && programCycle) && (
                      <div className="mb-2 text-sm">
                        <span className="text-muted-foreground">{programCycle?.name ?? ''}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
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
                    {Boolean(is1RMTest) && (() => {
                      const startSquat = workout.startingSquat1rm ?? workout.programCycle?.startingSquat1rm ?? workout.programCycle?.squat1rm ?? 0;
                      const startBench = workout.startingBench1rm ?? workout.programCycle?.startingBench1rm ?? workout.programCycle?.bench1rm ?? 0;
                      const startDeadlift = workout.startingDeadlift1rm ?? workout.programCycle?.startingDeadlift1rm ?? workout.programCycle?.deadlift1rm ?? 0;
                      const startOhp = workout.startingOhp1rm ?? workout.programCycle?.startingOhp1rm ?? workout.programCycle?.ohp1rm ?? 0;
                      const testedSquat = workout.squat1rm ?? startSquat;
                      const testedBench = workout.bench1rm ?? startBench;
                      const testedDeadlift = workout.deadlift1rm ?? startDeadlift;
                      const testedOhp = workout.ohp1rm ?? startOhp;
                      
                      return (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium">1RM Progress: </span>
                          <span className={testedSquat > startSquat ? 'text-success' : 'text-muted-foreground'}>{startSquat} → {testedSquat}</span>
                          <span className="mx-2">•</span>
                          <span className={testedBench > startBench ? 'text-success' : 'text-primary'}>{startBench} → {testedBench}</span>
                          <span className="mx-2">•</span>
                          <span className={testedDeadlift > startDeadlift ? 'text-success' : 'text-chart-3'}>{startDeadlift} → {testedDeadlift}</span>
                          <span className="mx-2">•</span>
                          <span className={testedOhp > startOhp ? 'text-success' : 'text-chart-5'}>{startOhp} → {testedOhp}</span>
                        </div>
                      );
                    })()}
                  </Card>
                </Link>
              );
            })}

            {hasMore ? (
              <div ref={observerTarget} className="flex items-center justify-center py-8">
                {loadingMore ? <Loader2 className="animate-spin text-primary" size={32} /> : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/history/_index')({
  component: History,
});
