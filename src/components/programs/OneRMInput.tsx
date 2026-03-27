import { ChevronRight, HelpCircle, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Card } from '~/components/ui/Card';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { Button } from '~/components/ui/Button';

interface OneRMInputProps {
  formData: {
    squat1rm: string;
    bench1rm: string;
    deadlift1rm: string;
    ohp1rm: string;
  };
  prefilled: {
    squat1rm: boolean;
    bench1rm: boolean;
    deadlift1rm: boolean;
    ohp1rm: boolean;
  };
  weightUnit: string;
  isValid: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: (field: 'squat1rm' | 'bench1rm' | 'deadlift1rm' | 'ohp1rm') => void;
  onContinue: () => void;
}

export function OneRMInput({
  formData,
  prefilled,
  weightUnit,
  isValid,
  onChange,
  onClear,
  onContinue,
}: OneRMInputProps) {
  const lifts = [
    { id: 'squat1rm', label: 'Squat 1RM' },
    { id: 'bench1rm', label: 'Bench Press 1RM' },
    { id: 'deadlift1rm', label: 'Deadlift 1RM' },
    { id: 'ohp1rm', label: 'Overhead Press 1RM' },
  ] as const;

  return (
    <>
      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-sm">What is 1RM?</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Your One-Rep Max (1RM) is the maximum weight you can lift for a single rep with proper form.
            </p>
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium">Not sure what to enter?</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>
                  <Link to="/1rm-test" search={{ returnTo: location.pathname }} className="text-primary hover:underline">
                    Test it first
                  </Link>
                  {' '}— Complete our guided 1RM test
                </li>
                <li>
                  Estimate — If you can lift X for 5 reps, your 1RM is roughly X × 1.2
                </li>
                <li>
                  Starting out? Use a weight that feels challenging for 5 reps
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Use your best single rep (not training max). Update these after each cycle.
          </p>

          {lifts.map(({ id, label }) => (
            <div key={id} className="space-y-2">
              <Label htmlFor={id}>{label} ({weightUnit})</Label>
              <div className="relative">
                <Input
                  id={id}
                  name={id}
                  type="number"
                  step="0.5"
                  placeholder="Enter weight"
                  value={formData[id]}
                  onChange={onChange}
                  required={true}
                  className={prefilled[id] ? 'pr-20' : ''}
                />
                {!!prefilled[id] && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-success/20 text-success px-2 py-1 rounded">
                    Previous
                  </span>
                )}
                {!!formData[id] && !prefilled[id] && (
                  <button
                    type="button"
                    onClick={() => onClear(id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-col gap-3 px-4">
        <Button
          onClick={onContinue}
          disabled={!isValid}
          className="w-full"
        >
          Continue <ChevronRight className="w-4 h-4 ml-1" />
        </Button>

        <Link to="/programs">
          <Button type="button" variant="outline" className="w-full">
            Cancel
          </Button>
        </Link>
      </div>
    </>
  );
}
