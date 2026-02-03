'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle } from 'lucide-react';
import { formatTime, isSameDate, addDays, getMonday } from '~/lib/programs/scheduler';
import { useDateFormat } from '@/lib/context/DateFormatContext';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';

interface CycleWorkout {
  id: string;
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  scheduledDate: string;
  scheduledTime?: string;
  isComplete: boolean;
}

interface WeeklyScheduleProps {
  cycleId: string;
  currentWeek?: number;
  firstSessionDate?: string;
  onNavigateWeek?: (week: number) => void;
  onStartWorkout?: (workoutId: string, actualDate: string) => void;
  onRescheduleWorkout?: (workout: CycleWorkout) => void;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklySchedule({
  cycleId,
  currentWeek: propCurrentWeek,
  firstSessionDate,
  onNavigateWeek,
  onStartWorkout,
  onRescheduleWorkout,
}: WeeklyScheduleProps) {
  const [workouts, setWorkouts] = useState<CycleWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(propCurrentWeek ?? 1);
  const [weekStartDate, setWeekStartDate] = useState(() => {
    if (firstSessionDate) {
      return getMonday(new Date(`${firstSessionDate}T00:00:00Z`));
    }
    return getMonday(new Date());
  });
  const { formatDateShort } = useDateFormat();

  useEffect(() => {
    async function fetchWorkouts() {
      try {
        const response = await fetch(`/api/program-cycles/${cycleId}/workouts`);
        if (response.ok) {
          const data = await response.json() as CycleWorkout[];
          setWorkouts(data);

          if (propCurrentWeek === undefined && data.length > 0) {
            if (firstSessionDate) {
              const firstSession = data[0];
              if (firstSession) {
                setCurrentWeek(firstSession.weekNumber);
              }
            } else {
              const today = new Date();
              const todayWorkout = data.find(w => isSameDate(new Date(w.scheduledDate), today));
              if (todayWorkout) {
                setCurrentWeek(todayWorkout.weekNumber);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching workouts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchWorkouts();
  }, [cycleId, propCurrentWeek, firstSessionDate]);

  useEffect(() => {
    let startDate: Date;
    if (firstSessionDate) {
      startDate = getMonday(new Date(`${firstSessionDate}T00:00:00Z`));
    } else {
      startDate = getMonday(new Date());
    }
    startDate.setDate(startDate.getDate() + (currentWeek - 1) * 7);
    setWeekStartDate(startDate);
  }, [currentWeek, firstSessionDate]);

  const handlePreviousWeek = () => {
    const newWeek = currentWeek - 1;
    setCurrentWeek(newWeek);
    onNavigateWeek?.(newWeek);
  };

  const handleNextWeek = () => {
    const newWeek = currentWeek + 1;
    setCurrentWeek(newWeek);
    onNavigateWeek?.(newWeek);
  };

  const handleToday = () => {
    const today = new Date();
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const todayWorkout = workouts.find(w => {
      const workoutDate = new Date(`${w.scheduledDate}T00:00:00Z`);
      const workoutUTC = Date.UTC(workoutDate.getFullYear(), workoutDate.getMonth(), workoutDate.getDate());
      return workoutUTC === todayUTC;
    });
    const targetWeek = todayWorkout?.weekNumber ?? 1;
    setCurrentWeek(targetWeek);
    onNavigateWeek?.(targetWeek);
  };

  const getWorkoutForDate = (date: Date): CycleWorkout | undefined => {
    const dateUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return workouts.find(w => {
      const workoutDate = new Date(`${w.scheduledDate}T00:00:00Z`);
      const workoutUTC = Date.UTC(workoutDate.getFullYear(), workoutDate.getMonth(), workoutDate.getDate());
      return workoutUTC === dateUTC;
    });
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48 mx-auto" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const today = new Date();
  const weekStartUTC = Date.UTC(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate());
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const isCurrentWeek = weekStartUTC === todayUTC;

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-semibold text-lg min-w-[100px] text-center">
              Week {currentWeek}
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant={isCurrentWeek ? 'default' : 'outline'}
            size="sm"
            onClick={handleToday}
          >
            Today
          </Button>
        </div>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {formatDateShort(new Date(weekDates[0].getTime() - weekDates[0].getTimezoneOffset() * 60000).toISOString().split('T')[0])} - {formatDateShort(new Date(weekDates[6].getTime() - weekDates[6].getTimezoneOffset() * 60000).toISOString().split('T')[0])}
        </p>
      </div>
      
      {/* Mobile: List view */}
      <div className="divide-y">
        {weekDates.map((date, index) => {
          const workout = getWorkoutForDate(date);
          const isToday = isSameDate(date, today);
          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <div
              key={date.toISOString()}
              className={`p-3 ${isToday ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Date column */}
                <div className="flex-shrink-0 w-12 text-center">
                  <p className="text-xs text-muted-foreground font-medium uppercase">
                    {DAYS_OF_WEEK[index]}
                  </p>
                  <div
                    className={`w-10 h-10 mx-auto flex items-center justify-center rounded-full text-base font-semibold mt-1 ${
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : ''
                    }`}
                  >
                    {date.getDate()}
                  </div>
                </div>

                {/* Workout content */}
                <div className="flex-1 min-w-0">
                  {workout ? (
                    <div
                      className={`p-3 rounded-lg ${
                        workout.isComplete
                          ? 'bg-success/10'
                          : isPast
                          ? 'bg-muted'
                          : 'bg-primary/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium text-sm ${
                            workout.isComplete
                              ? 'text-success'
                              : isPast
                              ? 'text-muted-foreground'
                              : 'text-primary'
                            }`}
                          >
                            {workout.sessionName}
                          </p>
                          {workout.scheduledTime ? (
                            <p className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTime(workout.scheduledTime)}
                            </p>
                          ) : null}
                        </div>
                        
                        {workout.isComplete ? (
                          <div className="flex items-center gap-1 text-success text-xs flex-shrink-0">
                            <CheckCircle className="h-4 w-4" />
                            <span>Done</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 px-3"
                              onClick={() => onStartWorkout?.(workout.id, workout.scheduledDate)}
                            >
                              {isPast ? 'View' : 'Start'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-8 w-8"
                              onClick={() => onRescheduleWorkout?.(workout)}
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Rest Day</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
