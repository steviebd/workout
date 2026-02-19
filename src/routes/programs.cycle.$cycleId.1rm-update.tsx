import { createFileRoute, Link, useParams, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Card } from '~/components/ui/Card';
import { PageLayout } from '~/components/ui/PageLayout';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { useToast } from '@/components/app/ToastProvider';
import { LoadingForm } from '~/components/ui/LoadingSkeleton';

interface CycleData {
  id: string;
  name: string;
  programSlug: string;
  squat1rm: number;
  bench1rm: number;
  deadlift1rm: number;
  ohp1rm: number;
}

function Update1RM() {
  const params = useParams({ from: '/programs/cycle/$cycleId/1rm-update' });
  const navigate = useNavigate();
  const toast = useToast();
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
      try {
        const response = await fetch(`/api/program-cycles/${params.cycleId}`);
        if (response.ok) {
          const data = await response.json() as CycleData;
          setCycle(data);
          setFormData({
            squat1rm: data.squat1rm?.toString() ?? '',
            bench1rm: data.bench1rm?.toString() ?? '',
            deadlift1rm: data.deadlift1rm?.toString() ?? '',
            ohp1rm: data.ohp1rm?.toString() ?? '',
          });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/program-cycles/${params.cycleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squat1rm: parseFloat(formData.squat1rm),
          bench1rm: parseFloat(formData.bench1rm),
          deadlift1rm: parseFloat(formData.deadlift1rm),
          ohp1rm: parseFloat(formData.ohp1rm),
        }),
      });

      if (response.ok) {
        void navigate({ to: '/programs/cycle/$cycleId', params: { cycleId: params.cycleId } });
      } else {
        toast.error('Failed to update 1RM values');
      }
    } catch (error) {
      toast.error('Error updating 1RM values');
      console.error('Error updating 1RM values:', error);
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

  const isFormValid = formData.squat1rm && formData.bench1rm && formData.deadlift1rm && formData.ohp1rm;

  return (
    <PageLayout
      title="Update 1RM Values"
      subtitle="Update your current 1 Rep Maxes"
    >
      <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col gap-4">
        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Enter your updated 1 Rep Maxes. This will adjust future workout weights.
            </p>

            <div className="space-y-2">
              <Label htmlFor="squat1rm">Squat 1RM ({weightUnit})</Label>
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
              <Label htmlFor="bench1rm">Bench Press 1RM ({weightUnit})</Label>
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
              <Label htmlFor="deadlift1rm">Deadlift 1RM ({weightUnit})</Label>
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
              <Label htmlFor="ohp1rm">Overhead Press 1RM ({weightUnit})</Label>
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
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>

        <Link to="/programs/cycle/$cycleId" params={{ cycleId: params.cycleId }}>
          <Button type="button" variant="outline" className="w-full">
            Cancel
          </Button>
        </Link>
      </form>
    </PageLayout>
  );
}

export const Route = createFileRoute('/programs/cycle/$cycleId/1rm-update')({
  component: Update1RM,
});

export default Update1RM;
