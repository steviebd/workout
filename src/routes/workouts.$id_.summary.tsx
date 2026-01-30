import { createFileRoute, useParams, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Check, Clock, Dumbbell, Home, Scale, Target, Trophy, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from './__root';
import { cn } from '@/lib/cn';
import { useDateFormat } from '@/lib/context/DateFormatContext';
import { useUnit } from '@/lib/context/UnitContext';

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
  startedAt: string;
  completedAt?: string;
  notes?: string;
  exercises: WorkoutExercise[];
}

function WorkoutSummary() {
  const auth = useAuth();
  const params = useParams({ from: '/workouts/$id_/summary' });
  const router = useRouter();
  const { formatDateTimeLong } = useDateFormat();
  const { formatWeight } = useUnit();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    const loadWorkout = async () => {
      if (auth.loading || !auth.user || !params.id) return;

      const stateWorkout = (router.state.location.state as { workout?: Workout }).workout;

      if (stateWorkout) {
        setWorkout(stateWorkout);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/workouts/${params.id}`, {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Workout not found');
        }

        const data: Workout = await res.json();
        setWorkout(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load workout');
      } finally {
        setLoading(false);
      }
    };

    loadWorkout().catch(() => {});
  }, [auth.loading, auth.user, params.id, router.state.location.state]);

  useEffect(() => {
    const redirectIfIncomplete = async () => {
      if (!loading && workout && !workout.completedAt) {
        try {
          await router.navigate({ to: `/workouts/${params.id}`, replace: true });
        } catch (err) {
          console.error('Navigation error:', err);
        }
      }
    };

    redirectIfIncomplete().catch(console.error);
  }, [workout, params.id, router, loading]);

  if (auth.loading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
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

  const getPersonalRecords = () => {
    try {
      const prs: Array<{ exerciseName: string; weight: number; reps: number }> = [];
      const exerciseMaxes = new Map<string, { weight: number; reps: number }>();

      for (const exercise of workout.exercises) {
        for (const set of exercise.sets) {
          if (set.isComplete && set.weight) {
            const current = exerciseMaxes.get(exercise.name);
            if (!current || set.weight > current.weight) {
              exerciseMaxes.set(exercise.name, { weight: set.weight, reps: set.reps ?? 0 });
            }
          }
        }
      }

      exerciseMaxes.forEach((value, key) => {
        if (value.weight > 0) {
          prs.push({ exerciseName: key, weight: value.weight, reps: value.reps });
        }
      });

      return prs;
    } catch {
      return [];
    }
  };

  const totalSetsCount = workout.exercises.reduce((acc, e) => {
    return acc + e.sets.length;
  }, 0);

  const totalVolume = calculateTotalVolume();
  const personalRecords = getPersonalRecords();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6">
          <a
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            href="/"
          >
            <ArrowLeft size={20} />
            Back to dashboard
          </a>
        </div>

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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock size={18} />
              <span className="text-sm font-medium">Duration</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatDuration(workout.startedAt, workout.completedAt ?? workout.startedAt)}
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Dumbbell size={18} />
              <span className="text-sm font-medium">Total Sets</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {totalSetsCount}
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Scale size={18} />
              <span className="text-sm font-medium">Volume</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {totalVolume.toLocaleString()}
              {' '}
              <span className="text-sm font-normal text-muted-foreground">kg</span>
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target size={18} />
              <span className="text-sm font-medium">Exercises</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {workout.exercises.length}
            </p>
          </div>
        </div>

        {personalRecords.length > 0 ? <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="text-yellow-500" size={20} />
            Personal Records
          </h2>
          <div className="grid gap-3">
            {personalRecords.map((pr) => (
              <div
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                key={pr.exerciseName}
              >
                <span className="font-medium text-foreground">{pr.exerciseName}</span>
                <span className="text-amber-400 font-medium">
                  {formatWeight(pr.weight)} ×
                  {pr.reps}
                </span>
              </div>
            ))}
          </div>
                                      </div> : null}

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
    </main>
  );
}

export const Route = createFileRoute('/workouts/$id_/summary')({
  component: WorkoutSummary,
});
