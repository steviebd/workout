import { createFileRoute, Link, useParams, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { PageHeader } from '~/components/PageHeader';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';

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
  const navigate = useNavigate();
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

  const handleStart1RMTest = () => {
    void navigate({ to: '/programs/cycle/$cycleId/1rm-test', params: { cycleId: params.cycleId } });
  };

  const handleSaveAndTestLater = async () => {
    try {
      await fetch(`/api/program-cycles/${params.cycleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isComplete: true }),
      });
      void navigate({ to: '/programs' });
    } catch (error) {
      console.error('Error completing program:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <p>Loading...</p>
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
                <p className="text-sm text-muted-foreground">Starting 1RMs</p>
                <p className="font-semibold text-lg">{weightUnit}</p>
              </div>
            </div>

            <div className="space-y-2 mt-2">
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
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-3">Test Your New 1RMs</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Now it's time to test your new 1 Rep Maxes to see how much you've improved!
          </p>
          <Button onClick={handleStart1RMTest} className="w-full">
            Test 1RM Now
          </Button>
        </Card>

        <Button variant="outline" onClick={() => { void handleSaveAndTestLater(); }} className="w-full">
          Save Progress & Test Later
        </Button>

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
