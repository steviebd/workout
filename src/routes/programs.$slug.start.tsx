import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { getProgramBySlug } from '~/lib/programs';
import { PageHeader } from '~/components/PageHeader';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';

function ProgramStart() {
  const params = useParams({ from: '/programs/$slug/start' });
  const navigate = useNavigate();
  const program = getProgramBySlug(params.slug);
  const [weightUnit, setWeightUnit] = useState('kg');
  const [formData, setFormData] = useState({
    squat1rm: '',
    bench1rm: '',
    deadlift1rm: '',
    ohp1rm: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch('/api/user/preferences');
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

  if (!program) {
    return (
      <div className="p-4">
        <p>Program not found</p>
        <Link to="/programs">
          <Button variant="outline" className="mt-4">Back to Programs</Button>
        </Link>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/program-cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programSlug: params.slug,
          squat1rm: parseFloat(formData.squat1rm),
          bench1rm: parseFloat(formData.bench1rm),
          deadlift1rm: parseFloat(formData.deadlift1rm),
          ohp1rm: parseFloat(formData.ohp1rm),
        }),
      });

      if (response.ok) {
        const cycle = await response.json() as { id: string };
        void navigate({ to: '/programs/cycle/$cycleId', params: { cycleId: cycle.id } });
      } else {
        console.error('Failed to create program cycle');
      }
    } catch (error) {
      console.error('Error creating program cycle:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.squat1rm && formData.bench1rm && formData.deadlift1rm && formData.ohp1rm;

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader 
        title={`Start ${program.name}`}
        subtitle="Enter your current 1 Rep Maxes"
      />

      <form onSubmit={(e) => { void handleSubmit(e); }} className="px-4 flex flex-col gap-4">
        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Use your best single rep (not training max). Update these after each cycle.
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

        <Button type="submit" disabled={!isFormValid || isLoading} className="w-full">
          {isLoading ? 'Creating...' : 'Import Program'}
        </Button>

        <Link to="/programs/$slug" params={{ slug: params.slug }}>
          <Button type="button" variant="outline" className="w-full">
            Cancel
          </Button>
        </Link>
      </form>
    </div>
  );
}

export const Route = createFileRoute('/programs/$slug/start')({
  component: ProgramStart,
});

export default ProgramStart;
