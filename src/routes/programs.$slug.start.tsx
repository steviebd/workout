import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getProgramBySlug } from '~/lib/programs';
import { PageHeader } from '~/components/PageHeader';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { useToast } from '@/components/ToastProvider';

function ProgramStart() {
  const params = useParams({ from: '/programs/$slug/start' });
  const navigate = useNavigate();
  const program = getProgramBySlug(params.slug);
  const toast = useToast();
  const [weightUnit, setWeightUnit] = useState('kg');
  const [formData, setFormData] = useState({
    squat1rm: '',
    bench1rm: '',
    deadlift1rm: '',
    ohp1rm: '',
  });
  const [prefilled, setPrefilled] = useState({
    squat1rm: false,
    bench1rm: false,
    deadlift1rm: false,
    ohp1rm: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedPrevious, setHasLoadedPrevious] = useState(false);

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

  useEffect(() => {
    async function loadData() {
      const [prefsRes, oneRmRes] = await Promise.all([
        fetch('/api/user/preferences'),
        fetch('/api/user/1rm'),
      ]);

      if (prefsRes.ok) {
        const prefs = await prefsRes.json() as { weightUnit?: string };
        setWeightUnit(prefs.weightUnit ?? 'kg');
      }

      if (hasLoadedPrevious) return;

      if (oneRmRes.ok) {
        const data = await oneRmRes.json() as { squat1rm?: number | null; bench1rm?: number | null; deadlift1rm?: number | null; ohp1rm?: number | null };
        
        let hasAnyValues = false;
        const newValues: typeof formData = { squat1rm: '', bench1rm: '', deadlift1rm: '', ohp1rm: '' };
        const prefilledValues: typeof prefilled = { squat1rm: false, bench1rm: false, deadlift1rm: false, ohp1rm: false };

        if (data.squat1rm) {
          newValues.squat1rm = data.squat1rm.toString();
          prefilledValues.squat1rm = true;
          hasAnyValues = true;
        }
        if (data.bench1rm) {
          newValues.bench1rm = data.bench1rm.toString();
          prefilledValues.bench1rm = true;
          hasAnyValues = true;
        }
        if (data.deadlift1rm) {
          newValues.deadlift1rm = data.deadlift1rm.toString();
          prefilledValues.deadlift1rm = true;
          hasAnyValues = true;
        }
        if (data.ohp1rm) {
          newValues.ohp1rm = data.ohp1rm.toString();
          prefilledValues.ohp1rm = true;
          hasAnyValues = true;
        }

        if (hasAnyValues) {
          setFormData(newValues);
          setPrefilled(prefilledValues);
          setHasLoadedPrevious(true);
          toast.info('Loaded 1RMs from your previous cycle');
        }
      }
    }

    void loadData();
  }, [hasLoadedPrevious, toast]);

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
    setPrefilled(prev => ({
      ...prev,
      [e.target.name]: false,
    }));
  };

  const handleClear = (field: keyof typeof formData) => {
    setFormData(prev => ({
      ...prev,
      [field]: '',
    }));
    setPrefilled(prev => ({
      ...prev,
      [field]: false,
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
        toast.success('Program started!');
        void navigate({ to: '/programs/cycle/$cycleId', params: { cycleId: cycle.id } });
      } else {
        toast.error('Failed to create program cycle');
      }
    } catch (error) {
      toast.error('Error creating program cycle');
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
              <div className="relative">
                <Input
                  id="squat1rm"
                  name="squat1rm"
                  type="number"
                  step="0.5"
                  placeholder="Enter weight"
                  value={formData.squat1rm}
                  onChange={handleChange}
                  required={true}
                  className={prefilled.squat1rm ? 'pr-20' : ''}
                />
                {!!prefilled.squat1rm && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Previous
                  </span>
                )}
                {!!formData.squat1rm && !prefilled.squat1rm && (
                  <button
                    type="button"
                    onClick={() => handleClear('squat1rm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bench1rm">Bench Press 1RM ({weightUnit})</Label>
              <div className="relative">
                <Input
                  id="bench1rm"
                  name="bench1rm"
                  type="number"
                  step="0.5"
                  placeholder="Enter weight"
                  value={formData.bench1rm}
                  onChange={handleChange}
                  required={true}
                  className={prefilled.bench1rm ? 'pr-20' : ''}
                />
                {!!prefilled.bench1rm && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Previous
                  </span>
                )}
                {!!formData.bench1rm && !prefilled.bench1rm && (
                  <button
                    type="button"
                    onClick={() => handleClear('bench1rm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadlift1rm">Deadlift 1RM ({weightUnit})</Label>
              <div className="relative">
                <Input
                  id="deadlift1rm"
                  name="deadlift1rm"
                  type="number"
                  step="0.5"
                  placeholder="Enter weight"
                  value={formData.deadlift1rm}
                  onChange={handleChange}
                  required={true}
                  className={prefilled.deadlift1rm ? 'pr-20' : ''}
                />
                {!!prefilled.deadlift1rm && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Previous
                  </span>
                )}
                {!!formData.deadlift1rm && !prefilled.deadlift1rm && (
                  <button
                    type="button"
                    onClick={() => handleClear('deadlift1rm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ohp1rm">Overhead Press 1RM ({weightUnit})</Label>
              <div className="relative">
                <Input
                  id="ohp1rm"
                  name="ohp1rm"
                  type="number"
                  step="0.5"
                  placeholder="Enter weight"
                  value={formData.ohp1rm}
                  onChange={handleChange}
                  required={true}
                  className={prefilled.ohp1rm ? 'pr-20' : ''}
                />
                {!!prefilled.ohp1rm && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Previous
                  </span>
                )}
                {!!formData.ohp1rm && !prefilled.ohp1rm && (
                  <button
                    type="button"
                    onClick={() => handleClear('ohp1rm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
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
