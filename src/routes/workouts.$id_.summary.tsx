'use client';

import { createFileRoute, useParams, useRouter } from '@tanstack/react-router';
import { Check, Clock, Dumbbell, Home, Scale, Target, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { useDateFormat, useUnit } from '@/lib/context/UserPreferencesContext';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card';
import { PageLayout, PageLoading } from '~/components/ui/PageLayout';
import { StatCard } from '~/components/ui/StatCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface WorkoutSet {
  id: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  isComplete: boolean;
  completedAt?: string;
}

interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  orderIndex: number;
  sets: WorkoutSet[];
  notes?: string;
}

interface Workout {
  id: string;
  name: string;
  templateId?: string;
  programCycleId?: string | null;
  startedAt: string;
  completedAt?: string;
  notes?: string;
  exercises: WorkoutExercise[];
  squat1rm?: number | null;
  bench1rm?: number | null;
  deadlift1rm?: number | null;
  ohp1rm?: number | null;
  startingSquat1rm?: number | null;
  startingBench1rm?: number | null;
  startingDeadlift1rm?: number | null;
  startingOhp1rm?: number | null;
}

interface ProgramCycle {
  id: string;
  name: string;
  squat1rm: number;
  bench1rm: number;
  deadlift1rm: number;
  ohp1rm: number;
  startingSquat1rm: number | null;
  startingBench1rm: number | null;
  startingDeadlift1rm: number | null;
  startingOhp1rm: number | null;
}

function WorkoutSummary() {
  const { user, loading: authLoading } = useRequireAuth();
  const params = useParams({ from: '/workouts/$id_/summary' });
  const router = useRouter();
  const { formatDateTimeLong } = useDateFormat();
  const { formatWeight } = useUnit();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [programCycle, setProgramCycle] = useState<ProgramCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allTimePRs, setAllTimePRs] = useState<Array<{
    id: string;
    exerciseName: string;
    date: string;
    weight: number;
    reps: number;
  }>>([]);

  useEffect(() => {
    const loadWorkout = async () => {
      if (authLoading || !user || !params.id) return;

      try {
        const res = await fetch(`/api/workouts/${params.id}`, {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Workout not found');
        }

        const data: Workout = await res.json();
        console.log('[Summary] Loaded workout:', { id: data.id, name: data.name, completedAt: data.completedAt });
        setWorkout(data);

        if (data.name === '1RM Test' && data.programCycleId && (data as unknown as { squat1rm?: number | null }).squat1rm === null) {
          try {
            const cycleRes = await fetch(`/api/program-cycles/${data.programCycleId}`, {
              credentials: 'include',
            });
            if (cycleRes.ok) {
              const cycleData: ProgramCycle = await cycleRes.json();
              setProgramCycle(cycleData);
            }
          } catch (cycleErr) {
            console.error('Failed to load program cycle:', cycleErr);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load workout');
      } finally {
        setLoading(false);
      }
    };

    loadWorkout().catch(() => {});
  }, [authLoading, user, params.id]);

  useEffect(() => {
    const redirectIfIncomplete = async () => {
      console.log('[Summary] redirectIfIncomplete check:', { loading, hasWorkout: !!workout, completedAt: workout?.completedAt });
      if (!loading && workout && !workout.completedAt) {
        console.log('[Summary] Redirecting to edit page - workout not completed');
        try {
          await router.navigate({ to: '/workouts/$id', params: { id: params.id }, replace: true });
        } catch (err) {
          console.error('Navigation error:', err);
        }
      } else if (workout?.completedAt) {
        console.log('[Summary] Staying on summary page - workout is completed');
      }
    };

    redirectIfIncomplete().catch(console.error);
  }, [workout, params.id, router, loading]);

  useEffect(() => {
    const fetchPRs = async () => {
      try {
        const res = await fetch('/api/progress/prs?mode=allTime&limit=100', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json() as { recentPRs: Array<{
            id: string;
            exerciseName: string;
            date: string;
            weight: number;
            reps: number;
          }> };
          setAllTimePRs(data.recentPRs);
        }
      } catch (err) {
        console.error('Failed to fetch PRs:', err);
      }
    };
    void fetchPRs();
  }, []);

  if (authLoading || loading) {
    return (
      <PageLayout title="Loading" extraPadding={true}>
        <PageLoading variant="spinner" message="Loading workout..." />
      </PageLayout>
    );
  }

  if (error || !workout) {
    return (
      <PageLayout title="Error" extraPadding={true}>
        <ErrorState
          title="Workout Not Found"
          description={error ?? 'Workout not found'}
          onGoHome={() => { window.location.href = '/'; }}
        />
      </PageLayout>
    );
  }

  if (error || !workout) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive">{error ?? 'Workout not found'}</p>
            <a className="text-primary hover:text-primary/80 mt-2 inline-block" href="/">
              Go to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const formatDuration = (startTime: string, endTime: string) => {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;

      if (hours > 0) {
        return `${hours}h ${mins}m`;
      }
      return `${mins}m`;
    } catch {
      return '0m';
    }
  };

  const calculateTotalVolume = () => {
    try {
      let total = 0;
      for (const exercise of workout.exercises) {
        for (const set of exercise.sets) {
          if (set.isComplete && set.weight && set.reps) {
            total += set.weight * set.reps;
          }
        }
      }
      return total;
    } catch {
      return 0;
    }
  };

  const getTested1RMs = () => {
    const tested: { squat: number; bench: number; deadlift: number; ohp: number } = {
      squat: 0,
      bench: 0,
      deadlift: 0,
      ohp: 0,
    };
    
    for (const exercise of workout.exercises) {
      const name = exercise.name.toLowerCase();
      for (const set of exercise.sets) {
        if (set.isComplete && set.weight) {
          if (name.includes('squat') && set.weight > tested.squat) {
            tested.squat = set.weight;
          } else if ((name.includes('bench') || name === 'bench press') && set.weight > tested.bench) {
            tested.bench = set.weight;
          } else if (name.includes('deadlift') && set.weight > tested.deadlift) {
            tested.deadlift = set.weight;
          } else if ((name.includes('overhead') || name.includes('ohp') || name === 'overhead press') && set.weight > tested.ohp) {
            tested.ohp = set.weight;
          }
        }
      }
    }
    
    return tested;
  };

  const totalSetsCount = workout.exercises.reduce((acc, e) => {
    return acc + e.sets.length;
  }, 0);

  const totalVolume = calculateTotalVolume();

  const calculateE1RM = (weight: number, reps: number): number => {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
  };

  const getWorkoutMaxes = () => {
    const maxes = new Map<string, { weight: number; reps: number }>();

    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        if (set.isComplete && set.weight) {
          const current = maxes.get(exercise.name);
          if (!current || set.weight > current.weight) {
            maxes.set(exercise.name, {
              weight: set.weight,
              reps: set.reps ?? 0
            });
          }
        }
      }
    }

    return Array.from(maxes.entries()).map(([name, data]) => ({
      exerciseName: name,
      weight: data.weight,
      reps: data.reps,
      estimatedE1RM: calculateE1RM(data.weight, data.reps),
    }));
  };

  const getComparisonData = () => {
    const workoutMaxes = getWorkoutMaxes();

    return workoutMaxes.map(exercise => {
      const historicalPR = allTimePRs.find(pr =>
        pr.exerciseName.toLowerCase() === exercise.exerciseName.toLowerCase()
      );
      const historicalE1RM = historicalPR ? calculateE1RM(historicalPR.weight, historicalPR.reps) : 0;
      return {
        ...exercise,
        historicalPR: historicalPR ? {
          weight: historicalPR.weight,
          reps: historicalPR.reps,
          e1rm: historicalE1RM,
          date: historicalPR.date,
        } : null,
        isNewRecord: historicalPR && exercise.estimatedE1RM > historicalE1RM,
      };
    }).sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  };

  const comparisonData = getComparisonData();

  return (
    <PageLayout title="Workout Summary" extraPadding={true}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-success/20 rounded-full">
              <Check className="text-success" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Workout Complete!</h1>
          </div>
          <p className="text-muted-foreground">{workout.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {workout.completedAt ? formatDateTimeLong(workout.completedAt) : null}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            icon={Clock}
            label="Duration"
            value={formatDuration(workout.startedAt, workout.completedAt ?? workout.startedAt)}
          />

          <StatCard
            icon={Dumbbell}
            label="Total Sets"
            value={totalSetsCount}
          />

          <StatCard
            icon={Scale}
            label="Volume"
            value={`${totalVolume.toLocaleString()} kg`}
          />

          <StatCard
            icon={Target}
            label="Exercises"
            value={workout.exercises.length}
          />
        </div>

{workout.name === '1RM Test' ? (() => {
          const tested = getTested1RMs();
          const startSquat = workout.startingSquat1rm ?? programCycle?.startingSquat1rm ?? programCycle?.squat1rm ?? 0;
          const startBench = workout.startingBench1rm ?? programCycle?.startingBench1rm ?? programCycle?.bench1rm ?? 0;
          const startDeadlift = workout.startingDeadlift1rm ?? programCycle?.startingDeadlift1rm ?? programCycle?.deadlift1rm ?? 0;
          const startOhp = workout.startingOhp1rm ?? programCycle?.startingOhp1rm ?? programCycle?.ohp1rm ?? 0;
          const testedSquat = tested.squat ?? workout.squat1rm ?? startSquat;
          const testedBench = tested.bench ?? workout.bench1rm ?? startBench;
          const testedDeadlift = tested.deadlift ?? workout.deadlift1rm ?? startDeadlift;
          const testedOhp = tested.ohp ?? workout.ohp1rm ?? startOhp;
          
          return (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Trophy className="text-primary" size={20} />
              1RM Progress
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Squat</span>
                <span className="font-medium">
                  {startSquat} → <span className={testedSquat > startSquat ? 'text-success' : testedSquat < startSquat ? 'text-destructive' : 'text-foreground'}>{testedSquat}</span>
                  {testedSquat !== startSquat ? (
                    <span className={cn('ml-1', testedSquat > startSquat ? 'text-success' : 'text-destructive')}>
                      ({testedSquat > startSquat ? '+' : ''}{(testedSquat - startSquat).toFixed(1)})
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Bench</span>
                <span className="font-medium">
                  {startBench} → <span className={testedBench > startBench ? 'text-success' : testedBench < startBench ? 'text-destructive' : 'text-foreground'}>{testedBench}</span>
                  {testedBench !== startBench ? (
                    <span className={cn('ml-1', testedBench > startBench ? 'text-success' : 'text-destructive')}>
                      ({testedBench > startBench ? '+' : ''}{(testedBench - startBench).toFixed(1)})
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Deadlift</span>
                <span className="font-medium">
                  {startDeadlift} → <span className={testedDeadlift > startDeadlift ? 'text-success' : testedDeadlift < startDeadlift ? 'text-destructive' : 'text-foreground'}>{testedDeadlift}</span>
                  {testedDeadlift !== startDeadlift ? (
                    <span className={cn('ml-1', testedDeadlift > startDeadlift ? 'text-success' : 'text-destructive')}>
                      ({testedDeadlift > startDeadlift ? '+' : ''}{(testedDeadlift - startDeadlift).toFixed(1)})
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">OHP</span>
                <span className="font-medium">
                  {startOhp} → <span className={testedOhp > startOhp ? 'text-success' : testedOhp < startOhp ? 'text-destructive' : 'text-foreground'}>{testedOhp}</span>
                  {testedOhp !== startOhp ? (
                    <span className={cn('ml-1', testedOhp > startOhp ? 'text-success' : 'text-destructive')}>
                      ({testedOhp > startOhp ? '+' : ''}{(testedOhp - startOhp).toFixed(1)})
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          </div>
          );
        })() : null}

        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Exercise Summary</h2>
          <div className="space-y-4">
            {workout.exercises.map((exercise) => {
              const completedSets = exercise.sets.filter((s) => s.isComplete).length;
              const totalSets = exercise.sets.length;

              return (
                <div className="border-b border-border last:border-0 pb-4 last:pb-0" key={exercise.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground">{exercise.name}</p>
                      {exercise.muscleGroup ? <p className="text-sm text-muted-foreground">{exercise.muscleGroup}</p> : null}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {completedSets}
                      /
                      {totalSets}
                      {' '}
                      sets
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exercise.sets.map((set) => (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded text-sm',
                          set.isComplete
                            ? 'bg-success/20 text-success'
                            : 'bg-secondary text-muted-foreground'
                        )}
                        key={set.id}
                      >
                        {set.weight ? <span>
                          {formatWeight(set.weight)}
                                      </span> : null}
                        {set.weight && set.reps ? <span>×</span> : null}
                        {set.reps ? <span>{set.reps}</span> : null}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-achievement" />
              Personal Records
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              We are working on providing more accurate estimated 1RM calculations.
            </p>
            {comparisonData.map((item) => (
              <div key={item.exerciseName}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{item.exerciseName}</span>
                  {item.isNewRecord ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-transparent bg-success/20 px-2.5 py-0.5 text-xs font-semibold text-success">
                      <Trophy className="h-3 w-3" />
                      New Record!
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-4 p-3 bg-secondary/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Historical 1RM</p>
                    <p className="font-semibold text-lg">
                      {item.historicalPR ? `${item.historicalPR.e1rm} kg` : '—'}
                    </p>
                    {item.historicalPR ? (
                      <p className="text-xs text-muted-foreground">
                        {formatWeight(item.historicalPR.weight)} × {item.historicalPR.reps}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Today's 1RM</p>
                    <p className={cn("font-semibold text-lg", item.isNewRecord ? "text-achievement" : "")}>
                      {item.estimatedE1RM} kg
                    </p>
                    <p className={cn("text-xs", item.isNewRecord ? "text-achievement" : "text-muted-foreground")}>
                      {formatWeight(item.weight)} × {item.reps}
                    </p>
                    {item.isNewRecord && item.historicalPR ? (
                      <p className="text-xs text-success font-medium">
                        +{item.estimatedE1RM - item.historicalPR.e1rm} kg
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {workout.notes ? <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Notes</h2>
          <p className="text-muted-foreground">{workout.notes}</p>
                         </div> : null}

        <div className="flex justify-center">
          <a
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            href="/"
          >
            <Home size={18} />
            Back to Dashboard
          </a>
        </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/workouts/$id_/summary')({
  component: WorkoutSummary,
});
