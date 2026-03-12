import { Trophy } from 'lucide-react';
import type { Tested1RMs } from '~/lib/workout-summary';
import { cn } from '~/lib/cn';

interface OneRMProgressCardProps {
  tested: Tested1RMs;
  workout: {
    startingSquat1rm?: number | null;
    startingBench1rm?: number | null;
    startingDeadlift1rm?: number | null;
    startingOhp1rm?: number | null;
    squat1rm?: number | null;
    bench1rm?: number | null;
    deadlift1rm?: number | null;
    ohp1rm?: number | null;
  };
  programCycle: {
    startingSquat1rm?: number | null;
    startingBench1rm?: number | null;
    startingDeadlift1rm?: number | null;
    startingOhp1rm?: number | null;
    squat1rm: number;
    bench1rm: number;
    deadlift1rm: number;
    ohp1rm: number;
  } | null;
}

export function OneRMProgressCard({ tested, workout, programCycle }: OneRMProgressCardProps) {
  const startSquat = workout.startingSquat1rm ?? programCycle?.startingSquat1rm ?? programCycle?.squat1rm ?? 0;
  const startBench = workout.startingBench1rm ?? programCycle?.startingBench1rm ?? programCycle?.bench1rm ?? 0;
  const startDeadlift = workout.startingDeadlift1rm ?? programCycle?.startingDeadlift1rm ?? programCycle?.deadlift1rm ?? 0;
  const startOhp = workout.startingOhp1rm ?? programCycle?.startingOhp1rm ?? programCycle?.ohp1rm ?? 0;
  const testedSquat = tested.squat ?? workout.squat1rm ?? startSquat;
  const testedBench = tested.bench ?? workout.bench1rm ?? startBench;
  const testedDeadlift = tested.deadlift ?? workout.deadlift1rm ?? startDeadlift;
  const testedOhp = tested.ohp ?? workout.ohp1rm ?? startOhp;

  const lifts = [
    { name: 'Squat', start: startSquat, current: testedSquat },
    { name: 'Bench', start: startBench, current: testedBench },
    { name: 'Deadlift', start: startDeadlift, current: testedDeadlift },
    { name: 'OHP', start: startOhp, current: testedOhp },
  ] as const;

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Trophy className="text-primary" size={20} />
        1RM Progress
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {lifts.map(({ name, start, current }) => (
          <div key={name} className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">{name}</span>
            <span className="font-medium">
              {start} → <span className={current > start ? 'text-success' : current < start ? 'text-destructive' : 'text-foreground'}>{current}</span>
              {current !== start ? (
                <span className={cn('ml-1', current > start ? 'text-success' : 'text-destructive')}>
                  ({current > start ? '+' : ''}{(current - start).toFixed(1)})
                </span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
