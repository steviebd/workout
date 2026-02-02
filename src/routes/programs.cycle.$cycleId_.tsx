import { createFileRoute, Link, useParams, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, memo } from 'react';
import { Dumbbell, Trash2 } from 'lucide-react';
import { PageHeader } from '~/components/PageHeader';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Progress } from '~/components/ui/Progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '~/components/ui/AlertDialog';
import { useToast } from '@/components/ToastProvider';
import { LoadingStats, LoadingExercise } from '~/components/ui/LoadingSkeleton';

interface CycleData {
  id: string;
  name: string;
  programSlug: string;
  squat1rm: number;
  bench1rm: number;
  deadlift1rm: number;
  ohp1rm: number;
  currentWeek: number | null;
  currentSession: number | null;
  totalSessionsCompleted: number;
  totalSessionsPlanned: number;
  status: string | null;
  isComplete: boolean;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
}

interface ExerciseDetail {
  id: string;
  orderIndex: number;
  targetWeight: number | null;
  sets: number | null;
  reps: number | null;
  exercise: {
    id: string;
    name: string;
    muscleGroup: string | null;
  };
}

interface CurrentWorkoutData {
  id: string;
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  isComplete: boolean;
  exercises: ExerciseDetail[];
}

const FETCH_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

const ExerciseItem = memo(function ExerciseItem({ exercise, weightUnit }: { readonly exercise: ExerciseDetail; readonly weightUnit: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-3">
        <Dumbbell className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium">{exercise.exercise.name}</p>
          <p className="text-sm text-muted-foreground">
            {exercise.sets && exercise.reps ? `${exercise.sets}×${exercise.reps}` : ''}
            {exercise.targetWeight ? ` @ ${exercise.targetWeight}${weightUnit}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
});

function ProgramDashboard() {
  const params = useParams({ from: '/programs/cycle/$cycleId_' });
  const navigate = useNavigate();
  const toast = useToast();
  const [cycle, setCycle] = useState<CycleData | null>(null);
  const [currentWorkout, setCurrentWorkout] = useState<CurrentWorkoutData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weightUnit, setWeightUnit] = useState('kg');

  useEffect(() => {
    let isMounted = true;

    async function loadCycle() {
      try {
        const response = await fetchWithTimeout(`/api/program-cycles/${params.cycleId}`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setCycle(data as CycleData);
          }
        }
      } catch (error) {
        console.error('Error loading cycle:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCycle();

    return () => {
      isMounted = false;
    };
  }, [params.cycleId]);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentWorkout() {
      try {
        const response = await fetchWithTimeout(`/api/program-cycles/${params.cycleId}/current-workout`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setCurrentWorkout(data as CurrentWorkoutData);
          }
        }
      } catch (error) {
        console.error('Error loading current workout:', error);
      }
    }

    void loadCurrentWorkout();

    return () => {
      isMounted = false;
    };
  }, [params.cycleId]);

  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetchWithTimeout('/api/user/preferences');
        if (response.ok) {
          const prefs = await response.json() as { weightUnit?: string };
          setWeightUnit(prefs.weightUnit ?? 'kg');
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }

    void loadPreferences();
  }, []);

  const handleStartWorkout = async () => {
    if (!cycle) return;
    
    try {
      const response = await fetchWithTimeout(`/api/program-cycles/${params.cycleId}/start-workout`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json() as { workoutId: string };
        void navigate({ to: '/workouts/$id', params: { id: data.workoutId } });
      } else {
        toast.error('Failed to start workout');
      }
    } catch (error) {
      toast.error('Error starting workout');
      console.error('Error starting workout:', error);
    }
  };

  const handleUpdate1RM = () => {
    void navigate({ to: '/programs/cycle/$cycleId/1rm-update', params: { cycleId: params.cycleId } });
  };

  const handleEndProgram = () => {
    void navigate({ to: '/programs/cycle/$cycleId/complete', params: { cycleId: params.cycleId } });
  };

  const handleDeleteProgram = async () => {
    try {
      const response = await fetchWithTimeout(`/api/program-cycles/${params.cycleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Program deleted');
        void navigate({ to: '/' });
      } else {
        toast.error('Failed to delete program');
      }
    } catch (error) {
      toast.error('Error deleting program');
      console.error('Error deleting program:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 pb-20">
        <div className="px-4">
          <LoadingStats />
        </div>
        <div className="px-4 space-y-4">
          <LoadingExercise />
          <LoadingExercise />
          <LoadingExercise />
        </div>
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="p-4">
        <p>Program cycle not found</p>
        <Link to="/programs">
          <Button variant="outline" className="mt-4">Back to Programs</Button>
        </Link>
      </div>
    );
  }

  const totalCompleted = cycle.totalSessionsCompleted ?? 0;
  const progressPercent = cycle.totalSessionsPlanned > 0 
    ? Math.round((totalCompleted / cycle.totalSessionsPlanned) * 100) 
    : 0;

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader title={cycle.name} />

      <div className="px-4 space-y-4">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Week {cycle.currentWeek ?? 1}</span>
              <span>Session {totalCompleted + 1} of {cycle.totalSessionsPlanned}</span>
            </div>
            <Progress value={progressPercent} />
            <p className="text-xs text-muted-foreground text-center">{progressPercent}% complete</p>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Starting 1RMs</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Squat</span>
              <span className="font-medium">{cycle.squat1rm} {weightUnit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bench</span>
              <span className="font-medium">{cycle.bench1rm} {weightUnit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deadlift</span>
              <span className="font-medium">{cycle.deadlift1rm} {weightUnit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">OHP</span>
              <span className="font-medium">{cycle.ohp1rm} {weightUnit}</span>
            </div>
          </div>
        </Card>

        {currentWorkout && currentWorkout.exercises.length > 0 ? (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Today's Workout - {currentWorkout.sessionName}</h3>
            <div className="space-y-3">
              {currentWorkout.exercises.map((exercise) => (
                <ExerciseItem key={exercise.id} exercise={exercise} weightUnit={weightUnit} />
              ))}
            </div>
          </Card>
        ) : (
          !cycle.isComplete && (
            <Card className="p-4 bg-muted">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">All workouts in this program have been completed!</p>
              </div>
            </Card>
          )
        )}

        {cycle.isComplete ? (
          <Card className="p-4 bg-muted">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Program Complete</h3>
              <p className="text-sm text-muted-foreground">You've completed all sessions in this program cycle.</p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            <Button onClick={() => { void handleStartWorkout(); }} className="w-full">Start Today's Workout</Button>
            <Button variant="outline" onClick={() => { void handleUpdate1RM(); }} className="w-full">Update 1RM Values</Button>
            <Button variant="outline" onClick={() => { void handleEndProgram(); }} className="w-full">End Program & Test 1RM</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild={true}>
                <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Program
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Program?</AlertDialogTitle>
                </AlertDialogHeader>
                <p className="text-muted-foreground">
                  This will permanently delete this program cycle and all its progress. This action cannot be undone.
                </p>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { void handleDeleteProgram(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/programs/cycle/$cycleId_')({
  component: ProgramDashboard,
});

export default ProgramDashboard;
