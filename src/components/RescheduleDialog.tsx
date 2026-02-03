'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { formatTime, addDays, isSameDate } from '~/lib/programs/scheduler';
import { useDateFormat } from '@/lib/context/DateFormatContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '~/components/ui/Dialog';
import { Button } from '~/components/ui/Button';
import { Card } from '~/components/ui/Card';

interface CycleWorkout {
  id: string;
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  scheduledDate: string;
  scheduledTime?: string;
  isComplete: boolean;
}

interface RescheduleDialogProps {
  workout: CycleWorkout | null;
  open: boolean;
  onClose: () => void;
  onReschedule: (workoutId: string, newDate: string) => void;
}

export function RescheduleDialog({
  workout,
  open,
  onClose,
  onReschedule,
}: RescheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [customDateInput, setCustomDateInput] = useState('');
  const { formatDateLong } = useDateFormat();

  useEffect(() => {
    if (workout && open) {
      setSelectedDate(new Date(`${workout.scheduledDate}T00:00:00Z`));
      setCustomDateInput(workout.scheduledDate);
    }
  }, [workout, open]);

  if (!workout) return null;

  const originalDate = new Date(`${workout.scheduledDate}T00:00:00Z`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const availableDates: Date[] = [];
  for (let i = 0; i < 60; i++) {
    const date = addDays(today, i);
    if (!isSameDate(date, originalDate)) {
      availableDates.push(date);
    }
  }

  const handleReschedule = () => {
    if (!workout) return;

    let dateToUse: string;
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      dateToUse = `${year}-${month}-${day}`;
    } else if (customDateInput) {
      dateToUse = customDateInput;
    } else {
      return;
    }

    onReschedule(workout.id, dateToUse);
    onClose();
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDateInput(e.target.value);
    setSelectedDate(null);
  };

  const isSameAsOriginal =
    selectedDate
      ? isSameDate(selectedDate, originalDate)
      : customDateInput === workout.scheduledDate;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Workout</DialogTitle>
          <DialogDescription>
            Choose a new date for this workout. You can select from the next 60 days or enter a specific date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4 bg-muted/50">
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{workout.sessionName}</p>
                <p className="text-sm text-muted-foreground">
                  Currently scheduled for {formatDateLong(workout.scheduledDate)}
                  {workout.scheduledTime ? ` at ${formatTime(workout.scheduledTime)}` : null}
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <label htmlFor="date-select" className="text-sm font-medium">Select Date</label>
            <div className="grid grid-cols-7 gap-1.5 max-h-48 overflow-y-auto p-1">
              {availableDates.map((date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                const isSelected = selectedDate && isSameDate(date, selectedDate);

                return (
                  <button
                    key={dateStr}
                    onClick={() => {
                      setSelectedDate(date);
                      setCustomDateInput('');
                    }}
                    className={`p-2 rounded text-xs transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="custom-date" className="text-sm font-medium">Or enter specific date</label>
            <input
              type="date"
              value={customDateInput}
              onChange={handleCustomDateChange}
               min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleReschedule} disabled={isSameAsOriginal || (!selectedDate && !customDateInput)}>
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
