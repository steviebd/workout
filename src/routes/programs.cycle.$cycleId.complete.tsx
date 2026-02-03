import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { PageHeader } from '~/components/PageHeader';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { LoadingCard } from '~/components/ui/LoadingSkeleton';

interface CycleData {
  id: string;
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
  currentWeek: number | null;
  currentSession: number | null;
  totalSessionsCompleted: number;
  totalSessionsPlanned: number;
  startedAt: string | null;
}

interface CycleWorkout {
  id: string;
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  isComplete: boolean;
}

function CompleteProgram() {
  const params = useParams({ from: '/programs/cycle/$cycleId/complete' });
  const [cycle, setCycle] = useState<CycleData | null>(null);
  const [workouts, setWorkouts] = useState<CycleWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weightUnit, setWeightUnit] = useState('kg');

  useEffect(() => {
    async function loadData() {
      try {
        const cycleResponse = await fetch(`/api/program-cycles/${params.cycleId}`);
        if (cycleResponse.ok) {
          const data = await cycleResponse.json() as CycleData;
          setCycle(data);
        }

        const workoutsResponse = await fetch(`/api/program-cycles/${params.cycleId}/workouts`);
        if (workoutsResponse.ok) {
          const wData = await workoutsResponse.json() as CycleWorkout[];
          setWorkouts(wData);
        }

        const prefsResponse = await fetch('/api/user/preferences');
        if (prefsResponse.ok) {
          const prefs = await prefsResponse.json() as { weightUnit?: string };
          setWeightUnit(prefs.weightUnit ?? 'kg');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [params.cycleId]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 pb-20">
        <div className="px-4">
          <LoadingCard />
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

  const completedWorkouts = workouts.filter(w => w.isComplete).length;

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader 
        title={`Complete ${cycle.name}`}
        subtitle="Congratulations on finishing your program!"
      />

      <div className="px-4 space-y-4">
        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              Congratulations on completing your program cycle! Here's a summary of your progress.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Sessions Completed</p>
                <p className="font-semibold text-lg">{completedWorkouts} / {cycle.totalSessionsPlanned}</p>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Weight Unit</p>
                <p className="font-semibold text-lg">{weightUnit}</p>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Squat</span>
                <span className="font-medium">
                  {cycle.startingSquat1rm ?? cycle.squat1rm} → {cycle.squat1rm}
                  {(cycle.startingSquat1rm ?? cycle.squat1rm) ? (
                    <span className="text-success ml-2">(+{(cycle.squat1rm - (cycle.startingSquat1rm ?? cycle.squat1rm)).toFixed(1)})</span>
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bench</span>
                <span className="font-medium">
                  {cycle.startingBench1rm ?? cycle.bench1rm} → {cycle.bench1rm}
                  {(cycle.startingBench1rm ?? cycle.bench1rm) ? (
                    <span className="text-success ml-2">(+{(cycle.bench1rm - (cycle.startingBench1rm ?? cycle.bench1rm)).toFixed(1)})</span>
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deadlift</span>
                <span className="font-medium">
                  {cycle.startingDeadlift1rm ?? cycle.deadlift1rm} → {cycle.deadlift1rm}
                  {(cycle.startingDeadlift1rm ?? cycle.deadlift1rm) ? (
                    <span className="text-success ml-2">(+{(cycle.deadlift1rm - (cycle.startingDeadlift1rm ?? cycle.deadlift1rm)).toFixed(1)})</span>
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">OHP</span>
                <span className="font-medium">
                  {cycle.startingOhp1rm ?? cycle.ohp1rm} → {cycle.ohp1rm}
                  {(cycle.startingOhp1rm ?? cycle.ohp1rm) ? (
                    <span className="text-success ml-2">(+{(cycle.ohp1rm - (cycle.startingOhp1rm ?? cycle.ohp1rm)).toFixed(1)})</span>
                  ) : null}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Link to="/programs/cycle/$cycleId" params={{ cycleId: params.cycleId }}>
          <Button variant="ghost" className="w-full">
            Back to Program
          </Button>
        </Link>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/programs/cycle/$cycleId/complete')({
  component: CompleteProgram,
});

export default CompleteProgram;
