# Program Scheduling & Calendar Feature Plan

## Overview

This feature adds scheduling capabilities to the programs feature, allowing users to:
1. Specify their preferred gym days and times when starting a program
2. See a weekly calendar view of scheduled workouts
3. Navigate through past, current, and future weeks
4. Manually reschedule workouts to different dates

## Current State

### What Exists
- **Database Tables:**
  - `userProgramCycles` - Tracks program cycles with `currentWeek`, `currentSession`, progress
  - `programCycleWorkouts` - Stores individual sessions with `weekNumber`, `sessionNumber`
- **Programs:** StrongLifts 5×5, Wendler 531, Madcow, nSuns, Sheiko, Candito, Nuckols
- **Program Structure:** Each program defines workouts with week/session numbers
- **UI:** Basic dashboard showing "Week 1" (hardcoded fallback) and current workout

### Problems
1. "Week 1" is hardcoded as a fallback when `currentWeek` is null
2. No scheduling - workouts have no dates associated
3. No calendar view to see what workouts are scheduled
4. No way to configure preferred workout days
5. Week progression is purely completion-based, not date-based

## Proposed Solution

### Core Philosophy
- **Hybrid approach:** Weeks advance based on completion OR date progression
- **Weekly schedule UI:** Week-by-week view showing upcoming workouts
- **Schedule all at once:** Generate all workout dates upfront based on preferences
- **Manual rescheduling:** Users can move workouts to different days

---

## Phase 1: Database Schema Changes

### File: `src/lib/db/schema.ts`

#### 1.1 Add fields to `userProgramCycles` table

```typescript
export const userProgramCycles = sqliteTable('user_program_cycles', {
  // ... existing fields ...
  preferredGymDays: text('preferred_gym_days'),        // NEW: JSON array
  preferredTimeOfDay: text('preferred_time_of_day'),   // NEW: "morning" | "afternoon" | "evening"
  programStartDate: text('program_start_date'),        // NEW: ISO date string
  firstSessionDate: text('first_session_date'),        // NEW: ISO date string
});
```

**Example values:**
- `preferredGymDays`: `["monday", "wednesday", "friday"]`
- `preferredTimeOfDay`: `"morning"`
- `programStartDate`: `"2025-02-03"`
- `firstSessionDate`: `"2025-02-03"`

#### 1.2 Add fields to `programCycleWorkouts` table

```typescript
export const programCycleWorkouts = sqliteTable('program_cycle_workouts', {
  // ... existing fields ...
  scheduledDate: text('scheduled_date').notNull(),     // NEW: ISO date string (YYYY-MM-DD)
  scheduledTime: text('scheduled_time'),               // NEW: Optional time (e.g., "07:00")
});
```

**Example values:**
- `scheduledDate`: `"2025-02-03"`
- `scheduledTime`: `"07:00"`

#### 1.3 Add new indexes

```typescript
export const _programCycleWorkoutsScheduledDateIdx = index('idx_program_cycle_workouts_scheduled_date').on(programCycleWorkouts.scheduledDate);
export const _programCycleWorkoutsCycleIdScheduledDateIdx = index('idx_program_cycle_workouts_cycle_id_scheduled_date').on(programCycleWorkouts.cycleId, programCycleWorkouts.scheduledDate);
```

#### 1.4 Update TypeScript types

Add new fields to `UserProgramCycle` and `ProgramCycleWorkout` type definitions.

#### 1.5 Update database

Run migrations to add new columns. For existing users, defaults will apply:
- `preferredGymDays`: `null` (users can update later)
- `preferredTimeOfDay`: `null`
- `programStartDate`: `null` (backfill from `startedAt` if needed)
- `firstSessionDate`: `null`
- `scheduledDate`: Must be populated for new cycles

---

## Phase 2: Scheduling Logic

### File: `src/lib/programs/scheduler.ts` (NEW FILE)

#### 2.1 Day mapping

```typescript
const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
type DayOfWeek = typeof DAYS_OF_WEEK[number];

function getDayIndex(day: DayOfWeek): number {
  return DAYS_OF_WEEK.indexOf(day);
}

function isGymDay(date: Date, preferredDays: DayOfWeek[]): boolean {
  const dayName = DAYS_OF_WEEK[date.getDay()];
  return preferredDays.includes(dayName);
}
```

#### 2.2 Main scheduling function

```typescript
interface WorkoutScheduleEntry {
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  scheduledDate: Date;
  scheduledTime?: string;
}

interface ScheduleOptions {
  preferredDays: DayOfWeek[];
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
  skipBankHolidays?: boolean;
}

function generateWorkoutSchedule(
  workouts: ProgramWorkout[],        // All workouts from program generator
  startDate: Date,
  options: ScheduleOptions
): WorkoutScheduleEntry[] {
  const schedule: WorkoutScheduleEntry[] = [];
  let currentDate = new Date(startDate);

  // Convert time preference to hour
  const timeMap = {
    morning: 7,
    afternoon: 12,
    evening: 17,
  };
  const hour = options.preferredTimeOfDay ? timeMap[options.preferredTimeOfDay] : undefined;

  for (const workout of workouts) {
    // Find next gym day that doesn't already have a workout
    while (!isGymDay(currentDate, options.preferredDays) ||
           schedule.some(s => isSameDate(s.scheduledDate, currentDate))) {
      currentDate = addDays(currentDate, 1);
    }

    schedule.push({
      weekNumber: workout.weekNumber,
      sessionNumber: workout.sessionNumber,
      sessionName: workout.sessionName,
      scheduledDate: new Date(currentDate),
      scheduledTime: hour ? `${hour.toString().padStart(2, '0')}:00` : undefined,
    });

    // Move to next day for next workout
    currentDate = addDays(currentDate, 1);
  }

  return schedule;
}
```

#### 2.3 Helper functions

```typescript
// Get the week number for today's date based on schedule
function getCurrentWeekNumber(schedule: WorkoutScheduleEntry[], today: Date = new Date()): number {
  const todayEntry = schedule.find(s => isSameDate(s.scheduledDate, today));
  if (todayEntry) return todayEntry.weekNumber;

  // If today has no workout, find the most recent completed or upcoming week
  const sortedSchedule = [...schedule].sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  const upcoming = sortedSchedule.find(s => s.scheduledDate > today);
  const previous = sortedSchedule.reverse().find(s => s.scheduledDate <= today);

  return upcoming?.weekNumber || previous?.weekNumber || 1;
}

// Get all workouts for a specific week
function getWorkoutsForWeek(schedule: WorkoutScheduleEntry[], weekNumber: number): WorkoutScheduleEntry[] {
  return schedule.filter(s => s.weekNumber === weekNumber);
}

// Get week date range (Monday to Sunday)
function getWeekDateRange(weekNumber: number, schedule: WorkoutScheduleEntry[]): { start: Date; end: Date; days: Date[] } {
  const weekWorkouts = getWorkoutsForWeek(schedule, weekNumber);
  if (weekWorkouts.length === 0) {
    // Return empty week range
    return { start: new Date(), end: new Date(), days: [] };
  }

  const dates = weekWorkouts.map(w => w.scheduledDate);
  const start = getMonday(dates[0]);
  const end = addDays(start, 6);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(start, i));
  }

  return { start, end, days };
}
```

#### 2.4 Date utilities

```typescript
function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}
```

---

## Phase 3: Program Start Questionnaire

### File: `src/routes/programs.$slug.start.tsx`

#### 3.1 Current state
The file has a single form for entering 1RMs. We need to convert this to a multi-step wizard.

#### 3.2 New state structure

```typescript
interface StartFormState {
  step: number;
  squat1rm: string;
  bench1rm: string;
  deadlift1rm: string;
  ohp1rm: string;
  preferredGymDays: DayOfWeek[];
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | null;
  programStartDate: Date | null;
}
```

#### 3.3 Step components

**Step 1: 1RM Entry** (existing form, unchanged logic)

**Step 2: Schedule Configuration** (NEW)

```tsx
function ScheduleStep({ formData, updateFormData }: ScheduleStepProps) {
  const DAYS: { value: DayOfWeek; label: string; icon: React.ReactNode }[] = [
    { value: 'monday', label: 'Mon', icon: <Moon /> },
    { value: 'tuesday', label: 'Tue', icon: <Sun /> },
    { value: 'wednesday', label: 'Wed', icon: <Sun /> },
    { value: 'thursday', label: 'Thu', icon: <Sun /> },
    { value: 'friday', label: 'Fri', icon: <Sun /> },
    { value: 'saturday', label: 'Sat', icon: <Sun /> },
    { value: 'sunday', label: 'Sun', icon: <Moon /> },
  ];

  const TIME_OPTIONS = [
    { value: 'morning', label: 'Morning', description: '6AM - 11AM' },
    { value: 'afternoon', label: 'Afternoon', description: '12PM - 5PM' },
    { value: 'evening', label: 'Evening', description: '6PM - 10PM' },
  ];

  return (
    <div className="space-y-6">
      {/* Day Selection */}
      <div className="space-y-3">
        <Label>What days do you plan to workout?</Label>
        <p className="text-sm text-muted-foreground">
          This program has {program.info.daysPerWeek} sessions per week.
        </p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={cn(
                "px-4 py-2 rounded-lg border transition-colors",
                formData.preferredGymDays.includes(day.value)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Selection */}
      <div className="space-y-3">
        <Label>What time of day do you usually go?</Label>
        <div className="grid grid-cols-3 gap-3">
          {TIME_OPTIONS.map((time) => (
            <button
              key={time.value}
              type="button"
              onClick={() => updateFormData({ preferredTimeOfDay: time.value as TimeOfDay })}
              className={cn(
                "p-4 rounded-lg border text-center transition-colors",
                formData.preferredTimeOfDay === time.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              )}
            >
              <p className="font-medium">{time.label}</p>
              <p className="text-xs text-muted-foreground">{time.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Start Date */}
      <div className="space-y-3">
        <Label>When do you want to start?</Label>
        <DatePicker
          value={formData.programStartDate}
          onChange={(date) => updateFormData({ programStartDate: date })}
          minDate={new Date()}
          maxDate={addMonths(new Date(), 3)}
        />
      </div>

      {/* Summary */}
      <Card className="p-4 bg-muted/50">
        <h4 className="font-medium mb-2">Your Schedule</h4>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Workout days: </span>
            {formData.preferredGymDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
          </p>
          <p>
            <span className="text-muted-foreground">Preferred time: </span>
            {formData.preferredTimeOfDay ? formData.preferredTimeOfDay.charAt(0).toUpperCase() + formData.preferredTimeOfDay.slice(1) : 'Not set'}
          </p>
          <p>
            <span className="text-muted-foreground">Starting: </span>
            {formData.programStartDate ? formatDate(formData.programStartDate) : 'Not set'}
          </p>
          <p>
            <span className="text-muted-foreground">Total sessions: </span>
            {program.info.totalSessions} over {program.info.estimatedWeeks} weeks
          </p>
        </div>
      </Card>
    </div>
  );
}
```

**Step 3: Review & Create** (NEW)

```tsx
function ReviewStep({ formData }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Program Details</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Program</dt>
            <dd className="font-medium">{program.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Starting 1RMs</dt>
            <dd>
              S: {formData.squat1rm} | B: {formData.bench1rm} | D: {formData.deadlift1rm} | O: {formData.ohp1rm}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Schedule</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Workout Days</dt>
            <dd>{formData.preferredGymDays.map(d => d.slice(0, 3)).join(', ')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Preferred Time</dt>
            <dd className="capitalize">{formData.preferredTimeOfDay}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Start Date</dt>
            <dd>{formatDate(formData.programStartDate)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total Sessions</dt>
            <dd>{program.info.totalSessions}</dd>
          </div>
        </dl>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        Click "Start Program" to generate your workout schedule and begin.
      </p>
    </div>
  );
}
```

#### 3.4 Updated submit handler

```typescript
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
        // NEW FIELDS:
        preferredGymDays: formData.preferredGymDays,
        preferredTimeOfDay: formData.preferredTimeOfDay,
        programStartDate: formData.programStartDate?.toISOString().split('T')[0],
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
    console.error('Error:', error);
  } finally {
    setIsLoading(false);
  }
};
```

#### 3.5 Navigation buttons

```tsx
<div className="flex gap-3">
  {step > 1 && (
    <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
      Back
    </Button>
  )}
  {step < 3 ? (
    <Button
      type="button"
      onClick={() => setStep(step + 1)}
      disabled={!isStepValid(step)}
      className="flex-1"
    >
      Continue
    </Button>
  ) : (
    <Button
      type="submit"
      disabled={!isFormValid || isLoading}
      className="flex-1"
    >
      {isLoading ? 'Creating...' : 'Start Program'}
    </Button>
  )}
</div>
```

---

## Phase 4: API Updates

### File: `src/routes/api/program-cycles.ts`

#### 4.1 Updated POST handler

```typescript
async function postHandler({ request }: { request: Request }) {
  const data = await request.json() as CreateProgramCycleRequest;

  // Validate required fields
  if (!data.programSlug || !data.squat1rm || !data.bench1rm ||
      !data.deadlift1rm || !data.ohp1rm) {
    return new Response('Missing required fields', { status: 400 });
  }

  // Validate schedule fields
  if (!data.preferredGymDays || data.preferredGymDays.length === 0) {
    return new Response('Please select at least one workout day', { status: 400 });
  }

  if (!data.programStartDate) {
    return new Response('Please select a start date', { status: 400 });
  }

  // Get program definition
  const program = getProgramBySlug(data.programSlug);
  if (!program) {
    return new Response('Program not found', { status: 404 });
  }

  // Generate all workouts for the program
  const workouts = program.generateWorkouts({
    squat: data.squat1rm,
    bench: data.bench1rm,
    deadlift: data.deadlift1rm,
    ohp: data.ohp1rm,
  });

  // Generate schedule with dates
  const startDate = new Date(data.programStartDate);
  const schedule = generateWorkoutSchedule(workouts, startDate, {
    preferredDays: data.preferredGymDays,
    preferredTimeOfDay: data.preferredTimeOfDay,
  });

  // Create cycle with all workouts and dates
  const cycleId = await createProgramCycle({
    workosId: user.id,
    programSlug: data.programSlug,
    name: data.name || `${program.name} - ${new Date().toLocaleDateString()}`,
    squat1rm: data.squat1rm,
    bench1rm: data.bench1rm,
    deadlift1rm: data.deadlift1rm,
    ohp1rm: data.ohp1rm,
    totalSessionsPlanned: workouts.length,
    preferredGymDays: JSON.stringify(data.preferredGymDays),
    preferredTimeOfDay: data.preferredTimeOfDay || null,
    programStartDate: data.programStartDate,
    firstSessionDate: schedule[0]?.scheduledDate.toISOString().split('T')[0] || null,
    workouts: schedule.map(s => ({
      weekNumber: s.weekNumber,
      sessionNumber: s.sessionNumber,
      sessionName: workouts.find(w => w.weekNumber === s.weekNumber && w.sessionNumber === s.sessionNumber)?.sessionName || '',
      scheduledDate: s.scheduledDate.toISOString().split('T')[0],
      scheduledTime: s.scheduledTime,
    })),
  });

  return new Response(JSON.stringify({ id: cycleId }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

#### 4.2 New type definitions

```typescript
interface CreateProgramCycleRequest {
  programSlug: string;
  name?: string;
  squat1rm: number;
  bench1rm: number;
  deadlift1rm: number;
  ohp1rm: number;
  preferredGymDays: string[];
  preferredTimeOfDay?: string;
  programStartDate: string;
}
```

### File: `src/routes/api/program-cycles.$id.ts`

#### 4.3 Updated GET response

```typescript
async function getHandler({ params }: { params: { id: string } }) {
  const cycle = await getProgramCycleById(params.id);
  if (!cycle) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(JSON.stringify({
    id: cycle.id,
    name: cycle.name,
    programSlug: cycle.programSlug,
    squat1rm: cycle.squat1rm,
    bench1rm: cycle.bench1rm,
    deadlift1rm: cycle.deadlift1rm,
    ohp1rm: cycle.ohp1rm,
    currentWeek: cycle.currentWeek,
    currentSession: cycle.currentSession,
    totalSessionsCompleted: cycle.totalSessionsCompleted,
    totalSessionsPlanned: cycle.totalSessionsPlanned,
    status: cycle.status,
    isComplete: cycle.isComplete,
    startedAt: cycle.startedAt,
    completedAt: cycle.completedAt,
    // NEW FIELDS:
    preferredGymDays: cycle.preferredGymDays ? JSON.parse(cycle.preferredGymDays) : null,
    preferredTimeOfDay: cycle.preferredTimeOfDay,
    programStartDate: cycle.programStartDate,
    firstSessionDate: cycle.firstSessionDate,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

#### 4.4 New PUT endpoint for rescheduling

```typescript
async function putHandler({ params, request }: { params: { id: string }; request: Request }) {
  const data = await request.json() as { scheduledDate?: string; scheduledTime?: string };

  if (!data.scheduledDate) {
    return new Response('scheduledDate is required', { status: 400 });
  }

  const cycle = await getProgramCycleById(params.id);
  if (!cycle) {
    return new Response('Cycle not found', { status: 404 });
  }

  // Update the cycle's schedule fields
  await updateProgramCycle(params.id, {
    preferredGymDays: JSON.stringify(data.preferredGymDays ?? cycle.preferredGymDays),
    preferredTimeOfDay: data.preferredTimeOfDay ?? cycle.preferredTimeOfDay,
    programStartDate: data.programStartDate ?? cycle.programStartDate,
    firstSessionDate: data.firstSessionDate ?? cycle.firstSessionDate,
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

#### 4.5 New route: Reschedule individual workout

**File: `src/routes/api/program-cycles.$id.workouts.$workoutId.reschedule.ts`**

```typescript
import { updateProgramCycleWorkout } from '~/lib/db/program';

async function putHandler({ params, request }: { params: { id: string; workoutId: string }; request: Request }) {
  const data = await request.json() as { scheduledDate: string; scheduledTime?: string };

  if (!data.scheduledDate) {
    return new Response('scheduledDate is required', { status: 400 });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.scheduledDate)) {
    return new Response('Invalid date format. Use YYYY-MM-DD', { status: 400 });
  }

  // Check workout exists
  const workout = await getProgramCycleWorkoutById(params.workoutId);
  if (!workout || workout.cycleId !== params.id) {
    return new Response('Workout not found', { status: 404 });
  }

  // Update the workout's scheduled date
  await updateProgramCycleWorkout(params.workoutId, {
    scheduledDate: data.scheduledDate,
    scheduledTime: data.scheduledTime || null,
  });

  // Get updated workout
  const updated = await getProgramCycleWorkoutById(params.workoutId);

  return new Response(JSON.stringify(updated), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const Route = {
  PUT: putHandler,
};
```

#### 4.6 Updated workouts endpoint

**File: `src/routes/api/program-cycles.$id.workouts.ts`**

```typescript
async function getHandler({ params }: { params: { id: string } }) {
  const workouts = await getCycleWorkouts(params.id);

  return new Response(JSON.stringify(workouts.map(w => ({
    id: w.id,
    weekNumber: w.weekNumber,
    sessionNumber: w.sessionNumber,
    sessionName: w.sessionName,
    targetLifts: w.targetLifts,
    isComplete: w.isComplete,
    workoutId: w.workoutId,
    scheduledDate: w.scheduledDate,           // NEW
    scheduledTime: w.scheduledTime,           // NEW
    createdAt: w.createdAt,
  }))), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## Phase 5: Weekly Schedule UI Components

### File: `src/components/WeeklySchedule.tsx` (NEW)

```typescript
import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { cn } from '~/lib/utils';

interface Workout {
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
  onNavigateWeek?: (weekNumber: number) => void;
  onStartWorkout?: (workoutId: string) => void;
  onRescheduleWorkout?: (workout: Workout) => void;
}

interface DayInfo {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isRestDay: boolean;
  workout: Workout | null;
}

export function WeeklySchedule({
  cycleId,
  currentWeek: initialWeek,
  onNavigateWeek,
  onStartWorkout,
  onRescheduleWorkout,
}: WeeklyScheduleProps) {
  const [displayWeek, setDisplayWeek] = useState(initialWeek || 1);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [schedule, setSchedule] = useState<{ start: Date; end: Date; days: Date[] } | null>(null);

  useEffect(() => {
    async function loadWorkouts() {
      try {
        const response = await fetch(`/api/program-cycles/${cycleId}/workouts`);
        if (response.ok) {
          const data = await response.json() as Workout[];
          setWorkouts(data);

          // Calculate week range
          const weekWorkouts = data.filter(w => w.weekNumber === displayWeek);
          if (weekWorkouts.length > 0) {
            const dates = weekWorkouts.map(w => new Date(w.scheduledDate));
            const start = getMonday(dates[0]);
            const end = addDays(start, 6);
            const days: Date[] = [];
            for (let i = 0; i < 7; i++) {
              days.push(addDays(start, i));
            }
            setSchedule({ start, end, days });
          }
        }
      } catch (error) {
        console.error('Error loading workouts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    void loadWorkouts();
  }, [cycleId, displayWeek]);

  const dayInfo: DayInfo[] = useMemo(() => {
    if (!schedule) return [];

    const today = new Date();
    return schedule.days.map(date => {
      const workout = workouts.find(w => {
        const wDate = new Date(w.scheduledDate);
        return wDate.getFullYear() === date.getFullYear() &&
               wDate.getMonth() === date.getMonth() &&
               wDate.getDate() === date.getDate();
      });

      return {
        date,
        dayName: DAYS[date.getDay()],
        dayNumber: date.getDate(),
        isToday: isSameDate(date, today),
        isRestDay: !workout,
        workout: workout || null,
      };
    });
  }, [schedule, workouts]);

  const goToWeek = (week: number) => {
    setDisplayWeek(week);
    onNavigateWeek?.(week);
  };

  const goToToday = () => {
    const today = new Date();
    const todayWorkout = workouts.find(w => isSameDate(new Date(w.scheduledDate), today));
    if (todayWorkout) {
      goToWeek(todayWorkout.weekNumber);
    }
  };

  const completedCount = workouts.filter(w => w.isComplete).length;
  const weekCompletedCount = dayInfo.filter(d => d.workout?.isComplete).length;
  const weekTotalCount = dayInfo.filter(d => d.workout).length;

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToWeek(displayWeek - 1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="text-center">
            <h3 className="font-semibold text-lg">Week {displayWeek}</h3>
            {schedule && (
              <p className="text-xs text-muted-foreground">
                {formatDateShort(schedule.start)} - {formatDateShort(schedule.end)}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToWeek(displayWeek + 1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Today Button */}
        {!dayInfo.some(d => d.isToday) && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={goToToday}
          >
            Go to Today
          </Button>
        )}

        {/* Week Progress */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{weekCompletedCount}/{weekTotalCount} sessions</span>
            <span>{completedCount} total</span>
          </div>
        </div>
      </Card>

      {/* Day Cards */}
      <div className="space-y-2">
        {dayInfo.map((day) => (
          <DayCard
            key={day.date.toISOString()}
            day={day}
            onStartWorkout={() => day.workout && onStartWorkout?.(day.workout.id)}
            onReschedule={() => day.workout && onRescheduleWorkout?.(day.workout)}
          />
        ))}
      </div>
    </div>
  );
}

function DayCard({
  day,
  onStartWorkout,
  onReschedule,
}: {
  day: DayInfo;
  onStartWorkout: () => void;
  onReschedule: () => void;
}) {
  return (
    <Card
      className={cn(
        "p-3 transition-all",
        day.isToday && "ring-2 ring-primary",
        !day.workout && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Day Header */}
        <div className="w-14 text-center">
          <span className={cn(
            "text-sm font-medium",
            day.isToday && "text-primary"
          )}>
            {day.dayName.slice(0, 3)}
          </span>
          <span className={cn(
            "block text-xl font-bold",
            day.isToday && "text-primary"
          )}>
            {day.dayNumber}
          </span>
        </div>

        {/* Workout or Rest */}
        <div className="flex-1 min-w-0">
          {day.workout ? (
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{day.workout.sessionName}</h4>
                {day.workout.isComplete && (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                )}
              </div>

              {day.workout.scheduledTime && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(day.workout.scheduledTime)}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant={day.workout.isComplete ? "outline" : "default"}
                  onClick={onStartWorkout}
                >
                  {day.workout.isComplete ? "View" : "Start"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onReschedule}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm py-2">
              Rest Day
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
```

### File: `src/components/RescheduleDialog.tsx` (NEW)

```typescript
import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Card } from '~/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/Dialog';

interface Workout {
  id: string;
  sessionName: string;
  scheduledDate: string;
  scheduledTime?: string;
}

interface RescheduleDialogProps {
  workout: Workout;
  open: boolean;
  onClose: () => void;
  onReschedule: (workoutId: string, newDate: string) => Promise<void>;
}

export function RescheduleDialog({
  workout,
  open,
  onClose,
  onReschedule,
}: RescheduleDialogProps) {
  const [newDate, setNewDate] = useState(workout.scheduledDate);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReschedule = async () => {
    setIsSubmitting(true);
    await onReschedule(workout.id, newDate);
    setIsSubmitting(false);
    onClose();
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewDate(e.target.value);
  };

  // Generate next 60 days for the date picker
  const availableDates = Array.from({ length: 60 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Workout</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Schedule */}
          <Card className="p-3 bg-muted/50">
            <p className="text-sm font-medium">Current Schedule</p>
            <p className="text-sm text-muted-foreground">
              {formatDateLong(workout.scheduledDate)}
              {workout.scheduledTime && ` at ${formatTime(workout.scheduledTime)}`}
            </p>
          </Card>

          {/* New Date Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">New Date</label>
            <div className="grid grid-cols-4 gap-2">
              {availableDates.map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => setNewDate(date)}
                  className={cn(
                    "p-2 text-sm rounded border transition-colors",
                    newDate === date
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {new Date(date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={newDate}
              onChange={handleDateChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={isSubmitting || newDate === workout.scheduledDate}
          >
            {isSubmitting ? 'Saving...' : 'Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Phase 6: Update Program Dashboard

### File: `src/routes/programs.cycle.$cycleId_.tsx`

#### 6.1 Updated imports

```typescript
import { createFileRoute, Link, useParams, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from 'react';
import { Dumbbell, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '~/components/PageHeader';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Progress } from '~/components/ui/Progress';
import { WeeklySchedule } from '~/components/WeeklySchedule';
import { RescheduleDialog } from '~/components/RescheduleDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '~/components/ui/AlertDialog';
import { useToast } from '@/components/ToastProvider';
import { LoadingStats, LoadingExercise } from '~/components/ui/LoadingSkeleton';
import { cn } from '~/lib/utils';
```

#### 6.2 Updated types

```typescript
interface CycleData {
  id: string;
  name: string;
  programSlug: string;
  squat1rm: number;
  bench1rm: number;
  deadlift1rm: number;
  ohp1rm: number;
  currentWeek: number | null;
  currentSession: number | null;
  totalSessionsCompleted: number;
  totalSessionsPlanned: number;
  status: string | null;
  isComplete: boolean;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
  // NEW:
  preferredGymDays: string[] | null;
  preferredTimeOfDay: string | null;
  programStartDate: string | null;
  firstSessionDate: string | null;
}

interface WorkoutData {
  id: string;
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  scheduledDate: string;
  scheduledTime?: string;
  isComplete: boolean;
  exercises?: ExerciseDetail[];
}
```

#### 6.3 Updated state

```typescript
function ProgramDashboard() {
  const params = useParams({ from: '/programs/cycle/$cycleId_' });
  const navigate = useNavigate();
  const toast = useToast();

  const [cycle, setCycle] = useState<CycleData | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weightUnit, setWeightUnit] = useState('kg');
  const [displayWeek, setDisplayWeek] = useState(1);
  const [rescheduleWorkout, setRescheduleWorkout] = useState<WorkoutData | null>(null);

  // Calculate current week based on today's date
  const calculatedCurrentWeek = useMemo(() => {
    if (!workouts.length) return cycle?.currentWeek || 1;

    const today = new Date();
    const todayWorkout = workouts.find(w => {
      const d = new Date(w.scheduledDate);
      return d.getFullYear() === today.getFullYear() &&
             d.getMonth() === today.getMonth() &&
             d.getDate() === today.getDate();
    });

    if (todayWorkout) return todayWorkout.weekNumber;

    // Find most recent completed or upcoming week
    const sorted = [...workouts].sort((a, b) =>
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

    const upcoming = sorted.find(w => new Date(w.scheduledDate) > today);
    const previous = [...sorted].reverse().find(w => new Date(w.scheduledDate) <= today);

    return upcoming?.weekNumber || previous?.weekNumber || 1;
  }, [workouts, cycle?.currentWeek]);
```

#### 6.4 Updated data fetching

```typescript
useEffect(() => {
  let isMounted = true;

  async function loadCycle() {
    try {
      const response = await fetch(`/api/program-cycles/${params.cycleId}`);
      if (response.ok) {
        const data = await response.json();
        if (isMounted) {
          setCycle(data as CycleData);
        }
      }
    } catch (error) {
      console.error('Error loading cycle:', error);
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  }

  void loadCycle();

  return () => {
    isMounted = false;
  };
}, [params.cycleId]);

useEffect(() => {
  let isMounted = true;

  async function loadWorkouts() {
    try {
      const response = await fetch(`/api/program-cycles/${params.cycleId}/workouts`);
      if (response.ok) {
        const data = await response.json() as WorkoutData[];
        if (isMounted) {
          setWorkouts(data);

          // Find today's workout
          const today = new Date();
          const todays = data.find(w => {
            const d = new Date(w.scheduledDate);
            return d.getFullYear() === today.getFullYear() &&
                   d.getMonth() === today.getMonth() &&
                   d.getDate() === today.getDate();
          });
          setCurrentWorkout(todays || null);
        }
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
    }
  }

  void loadWorkouts();

  return () => {
    isMounted = false;
  };
}, [params.cycleId]);
```

#### 6.5 Updated handlers

```typescript
const handleStartWorkout = async (workoutId?: string) => {
  const id = workoutId || currentWorkout?.id;
  if (!id) return;

  try {
    const response = await fetch(`/api/program-cycles/${params.cycleId}/start-workout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workoutId: id }),
    });

    if (response.ok) {
      const data = await response.json() as { workoutId: string };
      void navigate({ to: '/workouts/$id', params: { id: data.workoutId } });
    } else {
      toast.error('Failed to start workout');
    }
  } catch (error) {
    toast.error('Error starting workout');
    console.error('Error:', error);
  }
};

const handleRescheduleWorkout = async (workoutId: string, newDate: string) => {
  try {
    const response = await fetch(`/api/program-cycles/${params.cycleId}/workouts/${workoutId}/reschedule`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledDate: newDate }),
    });

    if (response.ok) {
      toast.success('Workout rescheduled');

      // Reload workouts
      const workoutsRes = await fetch(`/api/program-cycles/${params.cycleId}/workouts`);
      if (workoutsRes.ok) {
        const data = await workoutsRes.json() as WorkoutData[];
        setWorkouts(data);
      }
    } else {
      toast.error('Failed to reschedule workout');
    }
  } catch (error) {
    toast.error('Error rescheduling workout');
    console.error('Error:', error);
  }
};
```

#### 6.6 Updated render

```tsx
// Calculate week progress
const weekWorkouts = workouts.filter(w => w.weekNumber === calculatedCurrentWeek);
const weekCompleted = weekWorkouts.filter(w => w.isComplete).length;
const weekProgress = weekWorkouts.length > 0
  ? Math.round((weekCompleted / weekWorkouts.length) * 100)
  : 0;

return (
  <div className="flex flex-col gap-6 pb-20">
    <PageHeader title={cycle.name} />

    {/* Progress Card */}
    <Card className="p-4 mx-4">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-semibold text-lg">Week {calculatedCurrentWeek}</span>
            {cycle.programStartDate && (
              <span className="text-sm text-muted-foreground ml-2">
                starting {formatDate(cycle.programStartDate)}
              </span>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            Session {totalCompleted + 1} of {totalPlanned}
          </span>
        </div>

        {/* Week Progress Bar */}
        <div>
          <Progress value={weekProgress} />
          <p className="text-xs text-muted-foreground text-center mt-1">
            {weekCompleted}/{weekWorkouts.length} this week ({weekProgress}%)
          </p>
        </div>

        {/* Overall Progress */}
        <div className="pt-3 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
        </div>
      </div>
    </Card>

    {/* Today's Workout Card */}
    {currentWorkout && !currentWorkout.isComplete && (
      <Card className="p-4 mx-4">
        <h3 className="font-semibold mb-3">Today's Workout - {currentWorkout.sessionName}</h3>
        <p className="text-sm text-muted-foreground mb-3">
          {formatDate(currentWorkout.scheduledDate)}
          {currentWorkout.scheduledTime && ` at ${formatTime(currentWorkout.scheduledTime)}`}
        </p>
        {/* Exercise list... */}
        <Button onClick={() => handleStartWorkout()} className="w-full mt-4">
          Start Workout
        </Button>
      </Card>
    )}

    {/* Weekly Schedule */}
    <div className="px-4">
      <h3 className="font-semibold mb-3">Weekly Schedule</h3>
      <WeeklySchedule
        cycleId={cycle.id}
        currentWeek={calculatedCurrentWeek}
        onNavigateWeek={setDisplayWeek}
        onStartWorkout={(id) => handleStartWorkout(id)}
        onRescheduleWorkout={setRescheduleWorkout}
      />
    </div>

    {/* Reschedule Dialog */}
    {rescheduleWorkout && (
      <RescheduleDialog
        workout={rescheduleWorkout}
        open={!!rescheduleWorkout}
        onClose={() => setRescheduleWorkout(null)}
        onReschedule={handleRescheduleWorkout}
      />
    )}

    {/* Rest of the dashboard... */}
  </div>
);
```

---

## Phase 7: Database Operations

### File: `src/lib/db/program.ts`

#### 7.1 Updated `createProgramCycle` function

```typescript
interface CreateProgramCycleInput {
  workosId: string;
  programSlug: string;
  name: string;
  squat1rm: number;
  bench1rm: number;
  deadlift1rm: number;
  ohp1rm: number;
  totalSessionsPlanned: number;
  preferredGymDays: string;
  preferredTimeOfDay?: string;
  programStartDate: string;
  firstSessionDate: string;
  workouts: Array<{
    weekNumber: number;
    sessionNumber: number;
    sessionName: string;
    scheduledDate: string;
    scheduledTime?: string;
  }>;
}

export async function createProgramCycle(input: CreateProgramCycleInput): Promise<string> {
  const cycleId = generateId();

  // Insert cycle
  await db.insert(userProgramCycles).values({
    id: cycleId,
    workosId: input.workosId,
    programSlug: input.programSlug,
    name: input.name,
    squat1rm: input.squat1rm,
    bench1rm: input.bench1rm,
    deadlift1rm: input.deadlift1rm,
    ohp1rm: input.ohp1rm,
    totalSessionsPlanned: input.totalSessionsPlanned,
    preferredGymDays: input.preferredGymDays,
    preferredTimeOfDay: input.preferredTimeOfDay || null,
    programStartDate: input.programStartDate,
    firstSessionDate: input.firstSessionDate,
  });

  // Insert workouts with scheduled dates
  const workoutInserts = input.workouts.map((w, index) => ({
    id: generateId(),
    cycleId,
    weekNumber: w.weekNumber,
    sessionNumber: w.sessionNumber,
    sessionName: w.sessionName,
    scheduledDate: w.scheduledDate,
    scheduledTime: w.scheduledTime || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  await db.insert(programCycleWorkouts).values(workoutInserts);

  return cycleId;
}
```

#### 7.2 New `updateProgramCycleWorkout` function

```typescript
export async function updateProgramCycleWorkout(
  workoutId: string,
  updates: {
    scheduledDate?: string;
    scheduledTime?: string | null;
  }
): Promise<void> {
  await db.update(programCycleWorkouts)
    .set({
      scheduledDate: updates.scheduledDate,
      scheduledTime: updates.scheduledTime ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(programCycleWorkouts.id, workoutId));
}
```

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/db/schema.ts` | Modify | Add `preferredGymDays`, `preferredTimeOfDay`, `programStartDate`, `firstSessionDate` to `userProgramCycles`. Add `scheduledDate`, `scheduledTime` to `programCycleWorkouts`. Add indexes. |
| `src/lib/db/program.ts` | Modify | Update `createProgramCycle` to accept scheduling data. Add `updateProgramCycleWorkout`. |
| `src/lib/programs/scheduler.ts` | **NEW** | Scheduling algorithms and date utilities |
| `src/components/WeeklySchedule.tsx` | **NEW** | Weekly calendar UI component |
| `src/components/RescheduleDialog.tsx` | **NEW** | Modal for rescheduling workouts |
| `src/routes/programs.$slug.start.tsx` | Modify | Convert to multi-step wizard with scheduling questionnaire |
| `src/routes/api/program-cycles.ts` | Modify | Accept scheduling fields, generate schedule on create |
| `src/routes/api/program-cycles.$id.ts` | Modify | Return scheduling fields, add reschedule endpoints |
| `src/routes/api/program-cycles.$id.workouts.ts` | Modify | Include `scheduledDate` and `scheduledTime` in response |
| `src/routes/api/program-cycles.$id.workouts.$workoutId.reschedule.ts` | **NEW** | Endpoint to reschedule individual workout |
| `src/routes/programs.cycle.$cycleId_.tsx` | Modify | Integrate WeeklySchedule, calculate real week from dates |

---

## Migration Strategy

### For existing users with active cycles:
1. Add new columns with NULL defaults
2. On first load of program dashboard, calculate and populate:
   - `programStartDate` = `startedAt`
   - `firstSessionDate` = first workout's actual completion date or `startedAt`
   - `preferredGymDays` = NULL (prompt user to set)
   - `preferredTimeOfDay` = NULL
3. For existing `programCycleWorkouts`, set `scheduledDate` = NULL initially

### For new cycles:
- All fields populated during creation
- Schedule generated upfront

---

## Edge Cases to Handle

1. **User changes gym days mid-program**
   - Option A: Reschedule remaining workouts to new days
   - Option B: Keep existing schedule, apply new days to future
   - Decision: Apply to future only (simpler)

2. **User misses a scheduled workout**
   - Default: Workout stays on original date, marked incomplete
   - User can manually reschedule if needed

3. **Start date is on a non-preferred day**
   - Find first preferred day on/after start date
   - Schedule first workout then

4. **Program with varying sessions per week**
   - Generate schedule based on actual workout count per week
   - Some weeks may have 2 sessions, others 4

5. **Crossing year boundaries**
   - Date handling must account for year changes
   - ISO date strings work correctly

---

## Testing Checklist

- [ ] Day selector allows selecting correct number of days for program
- [ ] Schedule generation produces valid dates
- [ ] Weekly schedule shows correct workouts for each week
- [ ] Today button navigates to correct week
- [ ] Rescheduling updates database
- [ ] Week calculation based on today's date works correctly
- [ ] Completed workouts show checkmark
- [ ] Past weeks are accessible
- [ ] Future weeks are accessible
- [ ] Progress bars update correctly
- [ ] Starting workout from calendar works
- [ ] Form validation prevents incomplete submissions
- [ ] Back navigation between wizard steps works

---

## User Flow Summary

1. **Start Program:**
   - User selects program → Enters 1RMs → Selects gym days/time → Picks start date → Reviews → Creates

2. **Dashboard:**
   - Shows "Week X" based on today's date
   - Shows progress for current week
   - Shows today's scheduled workout (if any)
   - WeeklySchedule shows all days with workouts/rest days

3. **Navigate Schedule:**
   - Use < > buttons to move between weeks
   - Click "Go to Today" to jump to current week
   - Click any day to view/reschedule that workout

4. **Reschedule Workout:**
   - Click calendar icon on any workout
   - Select new date from picker
   - Workout moves to new date in schedule

5. **Past Review:**
   - Navigate to previous weeks
   - View completed workouts
   - See what was done and when

---

## Dependencies

- `date-fns` (optional, for date formatting - currently using native Date)
- Existing UI components (Card, Button, Dialog, etc.)
- Existing database infrastructure

---

## Estimated Effort

- **Database/Backend:** 2-3 hours
- **Scheduling Logic:** 2 hours
- **UI Components:** 4-5 hours
- **Route Updates:** 2 hours
- **Testing/Polish:** 2 hours

**Total: ~12-14 hours**
