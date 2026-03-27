'use client';

import { useQuery } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { Check, Clock, Dumbbell, Home, Scale, Target } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { createFileRoute, redirect, useParams, useRouter } from '@tanstack/react-router';
import type { WorkoutExerciseWithDetails } from '~/lib/db/workout/types';
import { getSession } from '~/lib/auth/session';
import { PageLayout, PageLoading } from '~/components/ui/PageLayout';
import { StatCard } from '~/components/ui/StatCard';
import { ErrorState } from '@/components/ui/ErrorState';
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

const getSessionServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const request = await getRequest()
  const session = await getSession(request)
  return session?.sub ? { sub: session.sub, email: session.email } : null
})

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
  const params = useParams({ from: '/workouts/$id_/summary' });
  const router = useRouter();
  const { formatDateTimeLong } = useDateFormat();
  const { data: workout, isLoading: workoutLoading, error: workoutError } = useQuery<Workout>({
    queryKey: ['workout', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/workouts/${params.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Workout not found');
      return res.json();
    },
    enabled: !!params.id,
  });

  useEffect(() => {
    const redirectIfIncomplete = async () => {
      if (!workoutLoading && workout && !workout.completedAt) {
        try {
          await router.navigate({ to: '/workouts/$id', params: { id: params.id }, replace: true });
        } catch (err) {
          console.error('Navigation error:', err);
        }
      }
    };

    redirectIfIncomplete().catch(console.error);
  }, [workout, params.id, router, workoutLoading]);

  const { data: programCycle } = useQuery<ProgramCycle>({
    queryKey: ['programCycle', workout?.programCycleId],
    queryFn: async () => {
      const res = await fetch(`/api/program-cycles/${workout!.programCycleId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch program cycle');
      return res.json();
    },
    enabled: !!workout && workout.name === '1RM Test' && !!workout.programCycleId && (workout as unknown as { squat1rm?: number | null }).squat1rm === null,
  });

  const { data: allTimePRs = [] } = useQuery<AllTimePR[]>({
    queryKey: ['prs', 'allTime'],
    queryFn: async () => {
      const res = await fetch('/api/progress/prs?mode=allTime&limit=100', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch PRs');
      const data = await res.json() as { recentPRs: AllTimePR[] };
      return data.recentPRs;
    },
  });

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

  if (workoutLoading) {
    return (
      <PageLayout title="Loading" extraPadding={true}>
        <PageLoading variant="spinner" message="Loading workout..." />
      </PageLayout>
    );
  }

  if (workoutError || !workout) {
    return (
      <PageLayout title="Error" extraPadding={true}>
        <ErrorState
          title="Workout Not Found"
          description={workoutError instanceof Error ? workoutError.message : 'Workout not found'}
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
            programCycle={programCycle ?? null}
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
  loader: async () => {
    const session = await getSessionServerFn()
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    if (!session?.sub) throw redirect({ to: '/auth/signin' })
  },
  component: WorkoutSummary,
});
