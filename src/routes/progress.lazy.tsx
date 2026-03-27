import { createLazyFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Clock, Dumbbell, Loader2, Pencil, Scale, Search, Trophy } from 'lucide-react';
import { useAuth } from './__root';
import type { Exercise as ExerciseType } from '~/lib/db/exercise/types';
import type { PersonalRecord } from '~/lib/domain/stats/types';
import { PRBoard } from '~/components/progress/PRBoard';
import { DateRangeSelector, type DateRange } from '~/components/progress/DateRangeSelector';
import { VolumeScopeToggle, type VolumeScope } from '~/components/progress/VolumeScopeToggle';
import { Card } from '~/components/ui/Card';
import { Skeleton } from '~/components/ui/Skeleton';
import { PageLayout } from '~/components/ui/PageLayout';
import { EmptyState } from '~/components/ui/EmptyState';
import { useUnit, useDateFormat } from '@/lib/context/UserPreferencesContext';
import { StatCard } from '~/components/ui/StatCard';
import { FilterPills } from '~/components/ui/FilterPills';
import { Input } from '~/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/Select';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyWorkouts } from '@/components/ui/EmptyState';
import { SectionHeader } from '~/components/ui/SectionHeader';
import { formatDuration } from '~/lib/workout-summary';
import { getWeekStart, getWeekEnd, getMonthStart, getMonthEnd } from '~/lib/utils/date';
const StrengthChart = lazy(() => import('~/components/progress/StrengthChart'));
const WeeklyVolumeChart = lazy(() => import('~/components/progress/WeeklyVolumeChart'));

type Exercise = Pick<ExerciseType, 'id' | 'name'>;

interface ProgressDataPoint {
  date: string;
  weight: number;
}

interface WeeklyVolume {
  week: string;
  volume: number;
}

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

const getThisWeekRange = () => ({
  from: getWeekStart().toISOString(),
  to: getWeekEnd().toISOString(),
});

const getThisMonthRange = () => ({
  from: getMonthStart().toISOString(),
  to: getMonthEnd().toISOString(),
});

function ProgressPage() {
  const auth = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const { formatVolume } = useUnit();
  const { formatDate } = useDateFormat();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>('3m');
  const [volumeScope, setVolumeScope] = useState<VolumeScope>('all');

  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [exerciseFilter, setExerciseFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState<'startedAt' | 'volume' | 'duration'>('startedAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);
  const observerTarget = useRef<HTMLDivElement>(null);

  const { data: exercisesData, isLoading: isLoadingExercises } = useQuery<Exercise[]>({
    queryKey: ['exercises'],
    queryFn: async () => {
      const res = await fetch('/api/exercises', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch exercises');
      return res.json();
    },
    enabled: !!auth.user,
  });

  const exercises = useMemo(() => exercisesData ?? [], [exercisesData]);

  const { data: strengthData = [], isLoading: isLoadingStrength } = useQuery<ProgressDataPoint[]>({
    queryKey: ['progress', 'strength', dateRange, selectedExerciseId],
    queryFn: async () => {
      if (!selectedExerciseId) return [];
      const res = await fetch(`/api/progress/strength?dateRange=${dateRange}&exerciseId=${selectedExerciseId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch strength data');
      const jsonData = await res.json() as { strengthData: ProgressDataPoint[] };
      return jsonData.strengthData;
    },
    enabled: !!auth.user && !!selectedExerciseId,
  });

  const { data: weeklyVolume = [], isLoading: isLoadingVolume } = useQuery<WeeklyVolume[]>({
    queryKey: ['progress', 'volume', dateRange, volumeScope, selectedExerciseId],
    queryFn: async () => {
      const url = `/api/progress/volume?dateRange=${dateRange}&volumeScope=${volumeScope}${selectedExerciseId ? `&exerciseId=${selectedExerciseId}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch volume data');
      const jsonData = await res.json() as { weeklyVolume: WeeklyVolume[] };
      return jsonData.weeklyVolume;
    },
    enabled: !!auth.user,
  });

  const { data: recentPRs = [], isLoading: isLoadingPRs } = useQuery<PersonalRecord[]>({
    queryKey: ['progress', 'prs'],
    queryFn: async () => {
      const res = await fetch('/api/progress/prs?mode=allTime&limit=20', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch PRs');
      const jsonData = await res.json() as { recentPRs: PersonalRecord[] };
      return jsonData.recentPRs;
    },
    enabled: !!auth.user,
  });

  const { data: stats = null, isLoading: isLoadingStats } = useQuery<WorkoutStats>({
    queryKey: ['workouts', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/workouts/stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json() as Promise<WorkoutStats>;
    },
    enabled: !!auth.user,
  });

  const fetchWorkouts = async ({ pageNum }: { pageNum: number }): Promise<WorkoutHistoryItem[]> => {
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

    if (!response.ok) throw new Error('Failed to fetch workouts');

    const data = (await response.json()) as WorkoutHistoryItem[];

    let sortedData = data;
    if (sortBy === 'volume') {
      sortedData = [...data].sort((a, b) =>
        sortOrder === 'DESC' ? b.totalVolume - a.totalVolume : a.totalVolume - b.totalVolume
      );
    } else if (sortBy === 'duration') {
      sortedData = [...data].sort((a, b) =>
        sortOrder === 'DESC' ? b.duration - a.duration : a.duration - b.duration
      );
    }

    return sortedData;
  };

  const { data: currentPageData, isLoading: isLoadingWorkouts } = useQuery<WorkoutHistoryItem[]>({
    queryKey: ['workouts', 'history', page, search, exerciseFilter, fromDate, toDate, sortBy, sortOrder],
    queryFn: () => fetchWorkouts({ pageNum: page }),
    enabled: !!auth.user,
  });

  const { isLoading: loadingMore } = useQuery<WorkoutHistoryItem[]>({
    queryKey: ['workouts', 'history', page + 1, search, exerciseFilter, fromDate, toDate, sortBy, sortOrder],
    queryFn: () => fetchWorkouts({ pageNum: page + 1 }),
    enabled: hasMore && page > 0,
  });

  useEffect(() => {
    if (!currentPageData) return;
    if (page === 1) {
      setWorkouts(currentPageData);
    } else {
      setWorkouts((prev) => {
        const existingIds = new Set(prev.map((w) => w.id));
        const newWorkouts = currentPageData.filter((w) => !existingIds.has(w.id));
        return [...prev, ...newWorkouts];
      });
    }
    setHasMore(currentPageData.length === 10);
  }, [currentPageData, page]);

  useEffect(() => {
    if (auth.user && exercises.length > 0 && !selectedExerciseId) {
      setSelectedExerciseId(exercises[0].id);
    }
  }, [exercises, selectedExerciseId, auth.user]);

  useEffect(() => {
    setPage(1);
    setWorkouts([]);
  }, [search, exerciseFilter, fromDate, toDate, sortBy, sortOrder]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
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
  }, [hasMore]);

  const handleExerciseSelect = useCallback((id: string) => {
    setSelectedExerciseId(id);
  }, []);

  const handleDateRangeChange = useCallback((value: DateRange) => {
    setDateRange(value);
  }, []);

  const handleVolumeScopeChange = useCallback((value: VolumeScope) => {
    setVolumeScope(value);
  }, []);

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
    void navigate({ to: '/workouts' });
  }, [navigate]);

  const selectedExercise = exercises.find(e => e.id === selectedExerciseId);

  if (auth.loading) {
    return (
      <PageLayout title="Progress">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </PageLayout>
    );
  }

  if (!auth.user) {
    return null;
  }

  return (
    <PageLayout
      title="Progress"
      action={<DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />}
    >
      {isLoadingExercises ? (
        <div className="space-y-6">
          <div className="h-10 bg-secondary rounded-full animate-pulse" />
          <Skeleton className="h-[200px] rounded-lg" />
          <Skeleton className="h-[200px] rounded-lg" />
          <Skeleton className="h-[200px] rounded-lg" />
        </div>
      ) : exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No exercises yet"
          description="Create your first exercise to track progress."
          actionLabel="Add Exercise"
          onAction={() => { void navigate({ to: '/exercises/new' }); }}
        />
      ) : (
        <>
          <Select value={selectedExerciseId} onValueChange={handleExerciseSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an exercise" />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="mt-6 space-y-6">
            {isLoadingStrength ? (
              <Skeleton className="h-[200px] rounded-lg" />
            ) : strengthData.length > 0 ? (
              <Suspense fallback={<Skeleton className="h-[220px] rounded-lg" />}>
                <StrengthChart
                  data={strengthData}
                  exerciseName={selectedExercise?.name ?? ''}
                />
              </Suspense>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">
                  No workout data yet for {selectedExercise?.name ?? 'selected exercise'}
                </p>
              </Card>
            )}

            <div className="space-y-2 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Weekly Volume</h2>
                <VolumeScopeToggle
                  value={volumeScope}
                  onChange={handleVolumeScopeChange}
                  disabled={exercises.length === 0}
                />
              </div>
              {isLoadingVolume ? (
                <Skeleton className="h-[200px] rounded-lg" />
              ) : weeklyVolume.length > 0 ? (
                <Suspense fallback={<Skeleton className="h-[220px] rounded-lg" />}>
                  <WeeklyVolumeChart data={weeklyVolume} />
                </Suspense>
              ) : (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">No volume data for the selected period</p>
                </Card>
              )}
            </div>

            {isLoadingPRs ? (
              <Skeleton className="h-[200px] rounded-lg" />
            ) : recentPRs.length > 0 ? (
              <PRBoard records={recentPRs} />
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">No personal records yet. Complete some workouts to set PRs!</p>
              </Card>
            )}
          </div>

          <div className="mt-8">
            <SectionHeader title="Workout History" />
          </div>

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
                    onClick={handleTotalWorkoutsClick}
                  />

                  <StatCard
                    icon={Calendar}
                    label="This Week"
                    value={stats?.thisWeek ?? 0}
                    onClick={handleThisWeekStatClick}
                  />

                  <StatCard
                    icon={Calendar}
                    label="This Month"
                    value={stats?.thisMonth ?? 0}
                    onClick={handleThisMonthStatClick}
                  />

                  <StatCard
                    icon={Scale}
                    label="Total Volume"
                    value={formatVolume(stats?.totalVolume ?? 0)}
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
                      to="/workouts/$id/summary"
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
        </>
      )}
    </PageLayout>
  );
}

export const Route = createLazyFileRoute('/progress')({
  component: ProgressPage,
});
