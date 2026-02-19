import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router';
import { X, HelpCircle, Calendar, Clock, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getProgramBySlug } from '~/lib/programs';
import { DayOfWeek, DAYS_OF_WEEK } from '~/lib/programs/scheduler';
import { Card } from '~/components/ui/Card';
import { PageLayout } from '~/components/ui/PageLayout';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { useToast } from '@/components/app/ToastProvider';
import { useDateFormat } from '@/lib/context/UserPreferencesContext';
import { DatePicker } from '@/components/ui/DatePicker';

const DAYS_DISPLAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_OPTIONS = [
  { value: 'morning' as const, label: 'Morning', icon: '🌅' },
  { value: 'afternoon' as const, label: 'Afternoon', icon: '☀️' },
  { value: 'evening' as const, label: 'Evening', icon: '🌙' },
];

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
  const [preferredGymDays, setPreferredGymDays] = useState<DayOfWeek[]>([]);
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
  const [programStartDate, setProgramStartDate] = useState<string | null>(null);
  const [startMode, setStartMode] = useState<'smart' | 'strict' | null>(null);
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

  const isStep1Valid = formData.squat1rm && formData.bench1rm && formData.deadlift1rm && formData.ohp1rm;
  const isStep2Valid = preferredGymDays.length === program.daysPerWeek && preferredTimeOfDay !== null && programStartDate !== null;

  const showStartMode = programStartDate ? shouldShowStartModeToggle(programStartDate, preferredGymDays) : false;
  const canStartProgram = !showStartMode || startMode !== null;

  const getTotalSessions = () => {
    if (!program) return 0;
    return program.estimatedWeeks * program.daysPerWeek;
  };

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
                  <Link to="/1rm-test" search={{ returnTo: `/programs/${params.slug}/start` }} className="text-primary hover:underline">
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

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <Button
            onClick={handleBack}
            variant="outline"
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!isStep2Valid}
            className="flex-1"
          >
            Review <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <Link to="/programs">
          <Button type="button" variant="outline" className="w-full">
            Cancel
          </Button>
        </Link>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      {showStartMode ? (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-sm">How would you like to start?</h4>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Your selected start date is different from your first training day.
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStartMode('smart')}
                  className={`w-full p-3 rounded-lg text-left text-sm transition-all ${
                    startMode === 'smart'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">Smart Start</div>
                  <div className="text-xs opacity-80 mt-1">
                    {programStartDate ? `Start on your selected date (${formatDate(programStartDate)}). The first week will be adjusted to start then.` : 'Start on your selected date.'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setStartMode('strict')}
                  className={`w-full p-3 rounded-lg text-left text-sm transition-all ${
                    startMode === 'strict'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">Strict Start</div>
                  <div className="text-xs opacity-80 mt-1">
                    Start from the beginning of the cycle. Your first scheduled day will show as skipped.
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-lg mb-3">Program Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Program</dt>
                <dd className="font-medium">{program.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="font-medium">{program.estimatedWeeks} weeks</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sessions</dt>
                <dd className="font-medium">{getTotalSessions()} total</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Frequency</dt>
                <dd className="font-medium">{program.daysPerWeek} days/week</dd>
              </div>
            </dl>
          </div>

          {showStartMode && startMode === 'strict' ? (
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3">First Week Preview</h4>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const firstDate = programStartDate
                      ? getFirstSessionDate(new Date(`${programStartDate}T00:00:00Z`), preferredGymDays, 'strict')
                      : null;
                    const isFirstDateSkipped = showStartMode && startMode === 'strict' && firstDate && programStartDate
                      ? new Date(`${programStartDate}T00:00:00Z`) > firstDate
                      : false;

                    return DAYS_DISPLAY.map((day, index) => {
                      const dayName = DAYS_OF_WEEK[index];
                      const isSelected = preferredGymDays.includes(dayName);

                      if (!isSelected) return null;

                       const baseDate = firstDate ?? new Date();
                         const dayDate = new Date(baseDate);
                         dayDate.setDate(baseDate.getDate() - baseDate.getDay() + index);
                         const dayDateStr = dayDate.toISOString().split('T')[0];
                         const isFirstGymDay = firstDate?.toDateString() === dayDate.toDateString();
                        const skipped = isFirstGymDay && isFirstDateSkipped;

                      return (
                        <div
                          key={day}
                          className={`flex-1 py-3 px-2 rounded-lg text-center text-sm font-medium flex flex-col items-center gap-1 ${
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted/50 text-muted-foreground'
                          } ${skipped ? 'border-2 border-red-300 dark:border-red-700' : ''}`}
                        >
                          <span>{day}</span>
                          <span className="text-xs opacity-80">{formatDate(dayDateStr)}</span>
                          {skipped ? (
                            <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                              (Skipped)
                            </span>
                          ) : null}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : null}

            {showStartMode && startMode === 'smart' && programStartDate ? (
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3">Your Schedule</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Based on your Smart Start, workouts will begin on your preferred days starting from {formatDate(programStartDate)}.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const startDate = new Date(`${programStartDate}T00:00:00Z`);
                    const scheduledDates: Array<{ date: Date; day: string }> = [];
                    
                    scheduledDates.push({
                      date: startDate,
                      day: DAYS_DISPLAY[startDate.getDay()],
                    });

                    const currentDate = new Date(startDate);
                    currentDate.setDate(startDate.getDate() + 1);

                    for (let i = 1; scheduledDates.length < 7; i++) {
                      const dateToCheck = new Date(currentDate);
                      dateToCheck.setDate(startDate.getDate() + i);
                      const dayName = DAYS_OF_WEEK[dateToCheck.getDay()];
                      if (preferredGymDays.includes(dayName)) {
                        scheduledDates.push({
                          date: dateToCheck,
                          day: DAYS_DISPLAY[dateToCheck.getDay()],
                        });
                      }
                    }

                    return scheduledDates.slice(0, 7).map((item, idx) => {
                      const dayDateStr = item.date.toISOString().split('T')[0];
                      const isFirstSession = idx === 0;

                      return (
                        <div
                          key={idx}
                          className={`flex-1 py-3 px-2 rounded-lg text-center text-sm font-medium flex flex-col items-center gap-1 ${
                            isFirstSession
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          <span>{item.day}</span>
                          <span className="text-xs opacity-80">{formatDate(dayDateStr)}</span>
                          {isFirstSession ? (
                            <span className="text-xs bg-primary-foreground/20 px-1.5 py-0.5 rounded">
                              First
                            </span>
                          ) : null}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : null}

            {!showStartMode && programStartDate ? (
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3">Your Schedule</h4>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const startDate = new Date(`${programStartDate}T00:00:00Z`);
                    const firstSessionDate = getFirstSessionDate(startDate, preferredGymDays, 'smart');
                    const scheduledDates: Array<{ date: Date; day: string }> = [];

                    for (let i = 0; i < 14 && scheduledDates.length < 7; i++) {
                      const dateToCheck = new Date(firstSessionDate);
                      dateToCheck.setDate(firstSessionDate.getDate() + i);
                      const dayName = DAYS_OF_WEEK[dateToCheck.getDay()];
                      if (preferredGymDays.includes(dayName)) {
                        scheduledDates.push({
                          date: dateToCheck,
                          day: DAYS_DISPLAY[dateToCheck.getDay()],
                        });
                      }
                    }

                    return scheduledDates.slice(0, 7).map((item, idx) => {
                      const dayDateStr = item.date.toISOString().split('T')[0];
                      const isFirstSession = idx === 0;

                      return (
                        <div
                          key={idx}
                          className={`flex-1 py-3 px-2 rounded-lg text-center text-sm font-medium flex flex-col items-center gap-1 ${
                            isFirstSession
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          <span>{item.day}</span>
                          <span className="text-xs opacity-80">{formatDate(dayDateStr)}</span>
                          {isFirstSession ? (
                            <span className="text-xs bg-primary-foreground/20 px-1.5 py-0.5 rounded">
                              First
                            </span>
                          ) : null}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : null}

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                A personalized workout schedule will be generated based on your preferences.
              </p>
            </div>
        </div>
      </Card>

      <div className="px-4 flex flex-col gap-3">
        <div className="flex gap-3">
          <Button
            onClick={handleBack}
            variant="outline"
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button
            onClick={(e) => { void handleSubmit(e); }}
            disabled={!isStep1Valid || !canStartProgram || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Creating...' : 'Start Program'}
          </Button>
        </div>

        <Link to="/programs">
          <Button type="button" variant="outline" className="w-full">
            Cancel
          </Button>
        </Link>
      </div>
    </>
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
