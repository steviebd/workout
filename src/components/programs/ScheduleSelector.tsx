import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { DayOfWeek } from '~/lib/programs/scheduler';
import { Card } from '~/components/ui/Card';
import { Label } from '~/components/ui/Label';
import { Button } from '~/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';

const DAYS_DISPLAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ScheduleSelectorProps {
  daysPerWeek: number;
  preferredGymDays: DayOfWeek[];
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | null;
  programStartDate: string | null;
  isValid: boolean;
  formatDate: (date: string) => string;
  onToggleDay: (dayIndex: number) => void;
  onTimeChange: (time: 'morning' | 'afternoon' | 'evening') => void;
  onDateChange: (date: string | null) => void;
  onBack: () => void;
  onContinue: () => void;
}

const TIME_OPTIONS = [
  { value: 'morning' as const, label: 'Morning', icon: '🌅' },
  { value: 'afternoon' as const, label: 'Afternoon', icon: '☀️' },
  { value: 'evening' as const, label: 'Evening', icon: '🌙' },
];

export function ScheduleSelector({
  daysPerWeek,
  preferredGymDays,
  preferredTimeOfDay,
  programStartDate,
  isValid,
  formatDate,
  onToggleDay,
  onTimeChange,
  onDateChange,
  onBack,
  onContinue,
}: ScheduleSelectorProps) {
  return (
    <>
      <Card className="p-6" overflow="visible">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <Label className="text-base">Select Training Days</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose exactly <span className="font-medium">{daysPerWeek}</span> days per week for your workouts
            </p>
            <div className="flex gap-2">
              {DAYS_DISPLAY.map((day, index) => {
                const dayName: DayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][index] as DayOfWeek;
                const isSelected = preferredGymDays.includes(dayName);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => onToggleDay(index)}
                    className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <p className={`text-sm ${preferredGymDays.length === daysPerWeek ? 'text-success' : 'text-muted-foreground'}`}>
              {preferredGymDays.length}/{daysPerWeek} days selected
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <Label className="text-base">Preferred Time of Day</Label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TIME_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onTimeChange(option.value)}
                  className={`py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                    preferredTimeOfDay === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <span className="text-lg">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <Label className="text-base">Program Start Date</Label>
            </div>
            <DatePicker
              value={programStartDate}
              onChange={onDateChange}
              min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
            />
            {programStartDate !== null && (
              <p className="text-sm text-muted-foreground">
                Starting on {formatDate(programStartDate)}
              </p>
            )}
          </div>
        </div>
      </Card>
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button
            onClick={onContinue}
            disabled={!isValid}
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
}
