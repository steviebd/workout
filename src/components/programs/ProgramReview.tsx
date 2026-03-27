import { ChevronLeft, Info } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { ProgramListItem } from '~/lib/programs/types';
import type { DayOfWeek } from '~/lib/programs/scheduler';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';

const DAYS_DISPLAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ProgramReviewProps {
  program: ProgramListItem;
  preferredGymDays: DayOfWeek[];
  programStartDate: string | null;
  showStartMode: boolean;
  startMode: 'smart' | 'strict' | null;
  formatDate: (date: string) => string;
  onStartModeChange: (mode: 'smart' | 'strict') => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isValid: boolean;
}

export function ProgramReview({
  program,
  preferredGymDays,
  programStartDate,
  showStartMode,
  startMode,
  formatDate,
  onStartModeChange,
  onBack,
  onSubmit,
  isSubmitting,
  isValid,
}: ProgramReviewProps) {
  const totalSessions = program.estimatedWeeks * program.daysPerWeek;

  return (
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
                  onClick={() => onStartModeChange('smart')}
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
                  onClick={() => onStartModeChange('strict')}
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
                <dd className="font-medium">{totalSessions} total</dd>
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
              </div>
            ) : null}

            {!showStartMode && programStartDate ? (
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3">Your Schedule</h4>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const startDate = new Date(`${programStartDate}T00:00:00Z`);
                    const scheduledDates: Array<{ date: Date; day: string }> = [];

                    for (let i = 0; i < 14 && scheduledDates.length < 7; i++) {
                      const dateToCheck = new Date(startDate);
                      dateToCheck.setDate(startDate.getDate() + i);
                      const dayIndex = dateToCheck.getDay();
                      const dayName: DayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayIndex] as DayOfWeek;
                      if (preferredGymDays.includes(dayName)) {
                        scheduledDates.push({
                          date: dateToCheck,
                          day: DAYS_DISPLAY[dayIndex],
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
            onClick={onBack}
            variant="outline"
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button
            onClick={() => { onSubmit(); }}
            disabled={!isValid || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Creating...' : 'Start Program'}
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
}
