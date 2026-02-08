'use client';

import { Check, Target, Trophy, TrendingUp } from 'lucide-react';
import type { ThirtyDayStreakResult } from '~/lib/context/StreakContext';
import { Card, CardContent } from '~/components/ui/Card';

interface StreakCardProps {
  weeklyCount: number;
  weeklyTarget: number;
  thirtyDayStreak: ThirtyDayStreakResult;
  totalWorkouts: number;
}

export function StreakCard({ weeklyCount, weeklyTarget, thirtyDayStreak, totalWorkouts }: StreakCardProps) {
  const weeklyComplete = weeklyCount >= weeklyTarget;

  return (
    <Card variant="tinted" className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${weeklyComplete ? 'bg-success/20' : 'bg-primary/20'}`}>
              <Target className={`h-6 w-6 ${weeklyComplete ? 'text-success' : 'text-primary'}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Times this week</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-2xl font-semibold tabular-nums ${weeklyComplete ? 'text-success' : 'text-foreground'}`}>
                  {weeklyCount}
                </p>
                <p className="text-sm text-muted-foreground">/ {weeklyTarget}</p>
                {weeklyComplete ? <Check className="h-4 w-4 text-success" /> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <p className="text-lg font-semibold">30 Day Streak</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {thirtyDayStreak.current} / {thirtyDayStreak.target} weeks
            </p>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-surface-2 mb-3">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${thirtyDayStreak.progress}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {thirtyDayStreak.weeklyDetails.slice(-4).reverse().map((week, index) => (
              <div
                key={week.weekStart}
                className={`text-center p-2 rounded-lg text-xs ${
                  week.meetsTarget
                    ? 'bg-success/20 text-success'
                    : week.count > 0
                    ? 'bg-surface-2 text-muted-foreground'
                    : 'bg-surface-3 text-muted-foreground/50'
                }`}
              >
                <div className="font-medium tabular-nums">{week.count}</div>
                <div className="text-[10px] mt-0.5">
                  {index === 0 ? 'This week' : `Week ${4 - index}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/50 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-achievement" />
              <p className="text-sm text-muted-foreground">Total Workouts</p>
            </div>
            <p className="text-xl font-semibold tabular-nums text-foreground">{totalWorkouts}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
