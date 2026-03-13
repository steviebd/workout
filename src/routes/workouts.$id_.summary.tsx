'use client';

import { createFileRoute, useParams, useRouter } from '@tanstack/react-router';
import { Check, Clock, Dumbbell, Home, Scale, Target } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { WorkoutExerciseWithDetails } from '~/lib/db/workout/types';
import { PageLayout, PageLoading } from '~/components/ui/PageLayout';
import { StatCard } from '~/components/ui/StatCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useDateFormat } from '@/lib/context/UserPreferencesContext';
import {
  formatDuration,
  calculateTotalVolume,
  getTested1RMs,
  getWorkoutMaxes,
  getComparisonData,
  type Tested1RMs,
} from '~/lib/workout-summary';
import { OneRMProgressCard } from '~/components/workouts/OneRMProgressCard';
import { ExerciseSummary } from '~/components/workouts/ExerciseSummary';
import { PRComparisonCard } from '~/components/workouts/PRComparisonCard';

interface WorkoutSetLocal {
  id: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  isComplete: boolean;
  completedAt?: string;
}

interface WorkoutExerciseLocal {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  orderIndex: number;
  sets: WorkoutSetLocal[];
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
  exercises: WorkoutExerciseLocal[];
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

interface AllTimePR {
  id: string;
  exerciseName: string;
  date: string;
  weight: number;
  reps: number;
}

function WorkoutSummary() {
  const { user, loading: authLoading } = useRequireAuth();
  const params = useParams({ from: '/workouts/$id_/summary' });
  const router = useRouter();
  const { formatDateTimeLong } = useDateFormat();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [programCycle, setProgramCycle] = useState<ProgramCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allTimePRs, setAllTimePRs] = useState<AllTimePR[]>([]);

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
        setWorkout(data);

        // 1RM Test workouts have additional fields (squat1rm, bench1rm, etc.) that are not in the base Workout type
        // Cast needed to access these conditional fields for null check
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

    void loadWorkout();
  }, [authLoading, user, params.id]);

  useEffect(() => {
    const redirectIfIncomplete = async () => {
      if (!loading && workout && !workout.completedAt) {
        try {
          await router.navigate({ to: '/workouts/$id', params: { id: params.id }, replace: true });
        } catch (err) {
          console.error('Navigation error:', err);
        }
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
          const data = await res.json() as { recentPRs: AllTimePR[] };
          setAllTimePRs(data.recentPRs);
        }
      } catch (err) {
        console.error('Failed to fetch PRs:', err);
      }
    };
    void fetchPRs();
  }, []);

  const totalSetsCount = useMemo(() => {
    return workout?.exercises.reduce((acc, e) => acc + e.sets.length, 0) ?? 0;
  }, [workout?.exercises]);

  const totalVolume = useMemo(() => {
    if (!workout) return 0;
    // The API returns exercises with sets inline but functions expect full WorkoutExerciseWithDetails structure
    return calculateTotalVolume(workout.exercises as unknown as WorkoutExerciseWithDetails[]);
  }, [workout]);

  const tested1RMs = useMemo(() => {
    if (!workout) return { squat: 0, bench: 0, deadlift: 0, ohp: 0 } as Tested1RMs;
    // The API returns exercises with sets inline but functions expect full WorkoutExerciseWithDetails structure
    return getTested1RMs(workout.exercises as unknown as WorkoutExerciseWithDetails[]);
  }, [workout]);

  const workoutMaxes = useMemo(() => {
    if (!workout) return [];
    // The API returns exercises with sets inline but functions expect full WorkoutExerciseWithDetails structure
    return getWorkoutMaxes(workout.exercises as unknown as WorkoutExerciseWithDetails[]);
  }, [workout]);

  const comparisonData = useMemo(() => {
    return getComparisonData(workoutMaxes, allTimePRs);
  }, [workoutMaxes, allTimePRs]);

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

        {workout.name === '1RM Test' ? (
          <OneRMProgressCard
            tested={tested1RMs}
            workout={workout}
            programCycle={programCycle}
          />
        ) : null}

        {/* The API returns exercises with sets inline but ExerciseSummary expects full WorkoutExerciseWithDetails structure */}
        <ExerciseSummary exercises={workout.exercises as unknown as WorkoutExerciseWithDetails[]} />

        <PRComparisonCard comparisonData={comparisonData} />

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
