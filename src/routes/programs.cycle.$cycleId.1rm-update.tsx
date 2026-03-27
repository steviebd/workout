import { createFileRoute, Link, redirect, useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getRequest } from '@tanstack/react-start/server';
import { createServerFn } from '@tanstack/react-start';
import { useAuth } from './__root';
import { getSession } from '~/lib/auth';
import { Card } from '~/components/ui/Card';
import { PageLayout } from '~/components/ui/PageLayout';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { useToast } from '@/components/app/ToastProvider';
import { LoadingForm } from '~/components/ui/LoadingSkeleton';

const getSessionServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const request = await getRequest()
  const session = await getSession(request)
  return session?.sub ? { sub: session.sub, email: session.email } : null
})

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
  const auth = useAuth();
  const [formData, setFormData] = useState({
    squat1rm: '',
    bench1rm: '',
    deadlift1rm: '',
    ohp1rm: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const { data: cycle, isLoading: isLoadingCycle } = useQuery<CycleData | null>({
    queryKey: ['cycle', params.cycleId],
    queryFn: async () => {
      const res = await fetch(`/api/program-cycles/${params.cycleId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch cycle');
      return res.json();
    },
    enabled: !!auth.user && !!params.cycleId,
  });

  const { data: weightUnit = 'kg' } = useQuery<string>({
    queryKey: ['preferences'],
    queryFn: async () => {
      const res = await fetch('/api/user/preferences', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch preferences');
      const data = await res.json() as { weightUnit?: string };
      return data.weightUnit ?? 'kg';
    },
    enabled: !!auth.user,
  });

  const isLoading = isLoadingCycle;

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
  loader: async () => {
    const session = await getSessionServerFn()
    if (!session?.sub) throw redirect({ to: '/auth/signin' }) // eslint-disable-line @typescript-eslint/only-throw-error
  },
  component: Update1RM,
});

export default Update1RM;
