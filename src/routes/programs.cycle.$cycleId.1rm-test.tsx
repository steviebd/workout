import { createFileRoute, Link, useParams, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { PageHeader } from '~/components/ui/PageHeader';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { LoadingForm } from '~/components/ui/LoadingSkeleton';

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
}

interface WorkoutData {
  id: string;
  programCycleId: string | null;
  squat1rm: number | null;
  bench1rm: number | null;
  deadlift1rm: number | null;
  ohp1rm: number | null;
  startingSquat1rm: number | null;
  startingBench1rm: number | null;
  startingDeadlift1rm: number | null;
  startingOhp1rm: number | null;
}

function OneRMTest() {
  const params = useParams({ from: '/programs/cycle/$cycleId/1rm-test' });
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<CycleData | null>(null);
  const [weightUnit, setWeightUnit] = useState('kg');
  const [formData, setFormData] = useState({
    squat1rm: '',
    bench1rm: '',
    deadlift1rm: '',
    ohp1rm: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      
      try {
        const [cycleRes, workoutRes, prefsRes] = await Promise.all([
          fetch(`/api/program-cycles/${params.cycleId}`),
          fetch(`/api/program-cycles/${params.cycleId}/1rm-test-workout`),
          fetch('/api/user/preferences'),
        ]);

        let cycleData: CycleData | null = null;

        if (cycleRes.ok) {
          cycleData = await cycleRes.json() as CycleData;
          setCycle({
            ...cycleData,
            startingSquat1rm: cycleData.startingSquat1rm ?? cycleData.squat1rm,
            startingBench1rm: cycleData.startingBench1rm ?? cycleData.bench1rm,
            startingDeadlift1rm: cycleData.startingDeadlift1rm ?? cycleData.deadlift1rm,
            startingOhp1rm: cycleData.startingOhp1rm ?? cycleData.ohp1rm,
          });
        }

        if (workoutRes.ok) {
          const workoutData = await workoutRes.json() as WorkoutData;
          if (workoutData.squat1rm) {
            setFormData({
              squat1rm: workoutData.squat1rm.toString(),
              bench1rm: workoutData.bench1rm?.toString() ?? '',
              deadlift1rm: workoutData.deadlift1rm?.toString() ?? '',
              ohp1rm: workoutData.ohp1rm?.toString() ?? '',
            });
          } else if (cycleData) {
            setFormData({
              squat1rm: cycleData.squat1rm.toString(),
              bench1rm: cycleData.bench1rm.toString(),
              deadlift1rm: cycleData.deadlift1rm.toString(),
              ohp1rm: cycleData.ohp1rm.toString(),
            });
          }
        }

        if (prefsRes.ok) {
          const prefs = await prefsRes.json() as { weightUnit?: string };
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const isFormValid = formData.squat1rm && formData.bench1rm && formData.deadlift1rm && formData.ohp1rm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const cycleRes = await fetch(`/api/program-cycles/${params.cycleId}`);
      if (!cycleRes.ok) {
        throw new Error('Failed to fetch cycle data');
      }
      const cycleData: CycleData = await cycleRes.json();

      await fetch(`/api/program-cycles/${params.cycleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squat1rm: parseFloat(formData.squat1rm),
          bench1rm: parseFloat(formData.bench1rm),
          deadlift1rm: parseFloat(formData.deadlift1rm),
          ohp1rm: parseFloat(formData.ohp1rm),
        }),
      });

      await fetch(`/api/program-cycles/${params.cycleId}/1rm-test-workout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squat1rm: parseFloat(formData.squat1rm),
          bench1rm: parseFloat(formData.bench1rm),
          deadlift1rm: parseFloat(formData.deadlift1rm),
          ohp1rm: parseFloat(formData.ohp1rm),
          startingSquat1rm: cycleData.startingSquat1rm ?? cycleData.squat1rm,
          startingBench1rm: cycleData.startingBench1rm ?? cycleData.bench1rm,
          startingDeadlift1rm: cycleData.startingDeadlift1rm ?? cycleData.deadlift1rm,
          startingOhp1rm: cycleData.startingOhp1rm ?? cycleData.ohp1rm,
        }),
      });

      void navigate({ to: '/programs/cycle/$cycleId/complete', params: { cycleId: params.cycleId } });
    } catch (error) {
      console.error('Error saving 1RM test results:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 pb-20">
        <div className="px-4">
          <LoadingForm />
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

  return (
      <div className="flex flex-col gap-6 pb-20">
        <PageHeader 
          title="Record Your New 1RMs"
          subtitle="Enter the weights you tested"
        />

      <form onSubmit={(e) => { void handleSubmit(e); }} className="px-4 flex flex-col gap-4">
        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Record the 1 Rep Maxes you tested. These will be used as your starting values for the next program cycle.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="squat1rm">Squat 1RM ({weightUnit})</Label>
                {cycle.startingSquat1rm ? (
                  <span className="text-sm text-muted-foreground">
                    Starting: <span className="font-medium text-foreground">{cycle.startingSquat1rm}</span>
                    {formData.squat1rm && parseFloat(formData.squat1rm) > cycle.startingSquat1rm ? (
                      <span className="text-success ml-2">→ +{(parseFloat(formData.squat1rm) - cycle.startingSquat1rm).toFixed(1)}</span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <Input
                id="squat1rm"
                name="squat1rm"
                type="number"
                step="0.5"
                placeholder="Enter weight"
                value={formData.squat1rm}
                onChange={handleChange}
                required={true}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bench1rm">Bench Press 1RM ({weightUnit})</Label>
                {cycle.startingBench1rm ? (
                  <span className="text-sm text-muted-foreground">
                    Starting: <span className="font-medium text-foreground">{cycle.startingBench1rm}</span>
                    {formData.bench1rm && parseFloat(formData.bench1rm) > cycle.startingBench1rm ? (
                      <span className="text-success ml-2">→ +{(parseFloat(formData.bench1rm) - cycle.startingBench1rm).toFixed(1)}</span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <Input
                id="bench1rm"
                name="bench1rm"
                type="number"
                step="0.5"
                placeholder="Enter weight"
                value={formData.bench1rm}
                onChange={handleChange}
                required={true}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="deadlift1rm">Deadlift 1RM ({weightUnit})</Label>
                {cycle.startingDeadlift1rm ? (
                  <span className="text-sm text-muted-foreground">
                    Starting: <span className="font-medium text-foreground">{cycle.startingDeadlift1rm}</span>
                    {formData.deadlift1rm && parseFloat(formData.deadlift1rm) > cycle.startingDeadlift1rm ? (
                      <span className="text-success ml-2">→ +{(parseFloat(formData.deadlift1rm) - cycle.startingDeadlift1rm).toFixed(1)}</span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <Input
                id="deadlift1rm"
                name="deadlift1rm"
                type="number"
                step="0.5"
                placeholder="Enter weight"
                value={formData.deadlift1rm}
                onChange={handleChange}
                required={true}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ohp1rm">Overhead Press 1RM ({weightUnit})</Label>
                {cycle.startingOhp1rm ? (
                  <span className="text-sm text-muted-foreground">
                    Starting: <span className="font-medium text-foreground">{cycle.startingOhp1rm}</span>
                    {formData.ohp1rm && parseFloat(formData.ohp1rm) > cycle.startingOhp1rm ? (
                      <span className="text-success ml-2">→ +{(parseFloat(formData.ohp1rm) - cycle.startingOhp1rm).toFixed(1)}</span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <Input
                id="ohp1rm"
                name="ohp1rm"
                type="number"
                step="0.5"
                placeholder="Enter weight"
                value={formData.ohp1rm}
                onChange={handleChange}
                required={true}
              />
            </div>
          </div>
        </Card>

        <Button type="submit" disabled={!isFormValid || isSaving} className="w-full">
          {isSaving ? 'Saving...' : 'Save 1RMs'}
        </Button>

        <Link to="/programs">
          <Button type="button" variant="outline" className="w-full">
            Back to Programs
          </Button>
        </Link>
      </form>
      </div>
  );
}

export const Route = createFileRoute('/programs/cycle/$cycleId/1rm-test')({
  component: OneRMTest,
});

export default OneRMTest;
