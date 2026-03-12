import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { getProgramBySlug } from '~/lib/programs';
import { DayOfWeek, DAYS_OF_WEEK } from '~/lib/programs/scheduler';
import { PageLayout } from '~/components/ui/PageLayout';
import { Button } from '~/components/ui/Button';
import { useToast } from '@/components/app/ToastProvider';
import { useDateFormat } from '@/lib/context/UserPreferencesContext';
import { OneRMInput } from '@/components/programs/OneRMInput';
import { ScheduleSelector } from '@/components/programs/ScheduleSelector';
import { ProgramReview } from '@/components/programs/ProgramReview';

function getFirstGymDayInWeek(startDate: Date, preferredGymDays: DayOfWeek[]): Date {
  if (preferredGymDays.length === 0) return startDate;

  const dayIndex = startDate.getDay();
  const startOfWeek = new Date(startDate);
  startOfWeek.setDate(startDate.getDate() - dayIndex);

  const day = preferredGymDays[0];
  const dayNum = DAYS_OF_WEEK.indexOf(day);
  const dayDate = new Date(startOfWeek);
  dayDate.setDate(startOfWeek.getDate() + dayNum);
  return dayDate;
}

function getFirstSessionDate(startDate: Date, preferredGymDays: DayOfWeek[], mode: 'smart' | 'strict'): Date {
  if (mode === 'smart') {
    return startDate;
  }
  return getFirstGymDayInWeek(startDate, preferredGymDays);
}

function shouldShowStartModeToggle(
  startDate: string | null,
  preferredGymDays: DayOfWeek[]
): boolean {
  return !!(startDate && preferredGymDays.length > 0);
}

function ProgramStart() {
  const params = useParams({ from: '/programs/$slug/start' });
  const navigate = useNavigate();
  const program = getProgramBySlug(params.slug);
  const toast = useToast();
  const { formatDate } = useDateFormat();

  const [step, setStep] = useState(1);
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
  const [preferredGymDays, setPreferredGymDays] = useState<DayOfWeek[]>([]);
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
  const [programStartDate, setProgramStartDate] = useState<string | null>(null);
  const [startMode, setStartMode] = useState<'smart' | 'strict' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedPrevious, setHasLoadedPrevious] = useState(false);
  const [weightUnit, setWeightUnit] = useState('kg');

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
        const data = await oneRmRes.json() as { squat1rm?: number; bench1rm?: number; deadlift1rm?: number; ohp1rm?: number };
        
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

  const toggleDay = (dayIndex: number) => {
    const day = DAYS_OF_WEEK[dayIndex];
    setPreferredGymDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const isStep1Valid = !!(formData.squat1rm && formData.bench1rm && formData.deadlift1rm && formData.ohp1rm);
  const isStep2Valid = preferredGymDays.length === program.daysPerWeek && preferredTimeOfDay !== null && programStartDate !== null;

  const showStartMode = programStartDate ? shouldShowStartModeToggle(programStartDate, preferredGymDays) : false;
  const canStartProgram = !showStartMode || startMode !== null;

  const handleContinue = () => {
    if (step === 1 && isStep1Valid) {
      setStep(2);
    } else if (step === 2 && isStep2Valid) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const startModeValue = showStartMode ? (startMode ?? 'smart') : 'smart';
    const startDateObj = new Date(`${programStartDate}T00:00:00Z`);
    const firstSessionDateResult = programStartDate
      ? getFirstSessionDate(startDateObj, preferredGymDays, startModeValue)
      : null;
    const firstSessionDateStr = firstSessionDateResult
      ? firstSessionDateResult.toISOString().split('T')[0]
      : null;

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
          preferredGymDays,
          preferredTimeOfDay,
          programStartDate,
          firstSessionDate: firstSessionDateStr,
        }),
      });

      if (response.ok) {
        const cycle = await response.json() as { id: string };
        toast.success('Program started!');
        await navigate({ to: '/programs/cycle/$cycleId', params: { cycleId: cycle.id } });
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

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 px-4 pt-4">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className={`flex items-center ${s < 3 ? 'flex-1' : ''}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step >= s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {s}
          </div>
          {s < 3 && (
            <div
              className={`flex-1 h-1 mx-2 rounded transition-colors ${
                step > s ? 'bg-primary' : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const stepTitle = step === 1 ? `Start ${program.name}` : step === 2 ? `Start ${program.name}` : `Start ${program.name}`;
  const stepSubtitle = step === 1 ? 'Enter your current 1 Rep Maxes' : step === 2 ? 'Configure your workout schedule' : 'Review your program details';

  const renderStep1 = () => (
    <OneRMInput
      formData={formData}
      prefilled={prefilled}
      weightUnit={weightUnit}
      isValid={isStep1Valid}
      onChange={handleChange}
      onClear={handleClear}
      onContinue={handleContinue}
    />
  );

  const renderStep2 = () => (
    <ScheduleSelector
      daysPerWeek={program.daysPerWeek}
      preferredGymDays={preferredGymDays}
      preferredTimeOfDay={preferredTimeOfDay}
      programStartDate={programStartDate}
      isValid={isStep2Valid}
      formatDate={formatDate}
      onToggleDay={toggleDay}
      onTimeChange={setPreferredTimeOfDay}
      onDateChange={setProgramStartDate}
      onBack={handleBack}
      onContinue={handleContinue}
    />
  );

  const renderStep3 = () => (
    <ProgramReview
      program={program}
      preferredGymDays={preferredGymDays}
      programStartDate={programStartDate}
      showStartMode={showStartMode}
      startMode={startMode}
      formatDate={formatDate}
      onStartModeChange={setStartMode}
      onBack={handleBack}
      onSubmit={() => { void handleSubmit(new Event('submit') as unknown as React.FormEvent); }}
      isSubmitting={isLoading}
      isValid={Boolean(isStep1Valid && canStartProgram)}
    />
  );

  return (
    <PageLayout title={stepTitle} subtitle={stepSubtitle}>
      {renderStepIndicator()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </PageLayout>
  );
}

export const Route = createFileRoute('/programs/$slug/start')({
  component: ProgramStart,
});

export default ProgramStart;
