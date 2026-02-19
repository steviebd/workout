'use client';

import { Check, Flame, Trophy, TrendingUp } from 'lucide-react';
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
  const streakComplete = thirtyDayStreak.current >= thirtyDayStreak.target;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                weeklyComplete 
                   ? 'bg-success/20' 
                   : 'bg-streak/20'
              }`}
            >
              {weeklyComplete ? (
                <Flame className="h-6 w-6 text-success" />
              ) : (
                <Flame className="h-6 w-6 text-streak" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Times this week</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-2xl font-semibold tabular-nums transition-colors duration-300 ${
                  weeklyComplete ? 'text-success' : 'text-foreground'
                }`}
                >
                  {weeklyCount}
                </p>
                <p className="text-sm text-muted-foreground">/ {weeklyTarget}</p>
                {weeklyComplete ? <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20">
                    <Check className="h-3.5 w-3.5 text-success" />
                                  </div> : null}
              </div>
            </div>
          </div>
          {weeklyComplete ? <div className="text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
              Goal met!
                            </div> : null}
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full p-0.5">
                <TrendingUp className="h-5 w-5 text-streak" />
              </div>
              <p className="text-lg font-semibold">30 Day Streak</p>
            </div>
            <p className={`text-sm tabular-nums ${
              streakComplete ? 'text-streak font-medium' : 'text-muted-foreground'
            }`}
            >
              {thirtyDayStreak.current} / {thirtyDayStreak.target} weeks
            </p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-surface-2 mb-4">
            <div
              className="h-full rounded-full bg-streak transition-all duration-500 ease-out"
              style={{ width: `${thirtyDayStreak.progress}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {thirtyDayStreak.weeklyDetails.slice(-4).reverse().map((week, index) => (
              <div
                key={week.weekStart}
                className={`group relative text-center p-2.5 rounded-xl text-xs border transition-all duration-200 cursor-default ${
                  week.meetsTarget
                    ? 'bg-success/10 text-success border-success/20'
                    : week.count > 0
                    ? 'bg-secondary text-muted-foreground border-border'
                    : 'bg-muted text-muted-foreground/40 border-border/50'
                }`}
              >
                {week.meetsTarget ? <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-success flex items-center justify-center">
                    <Check className="h-2 w-2 text-success-foreground" />
                                    </div> : null}
                <div className={`font-semibold tabular-nums text-base ${
                  week.meetsTarget ? 'text-success' : ''
                }`}
                >
                  {week.count}
                </div>
                <div className="text-[10px] mt-0.5 opacity-80">
                  {index === 0 ? 'This week' : `Week ${4 - index}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-streak" />
              <p className="text-sm text-muted-foreground">Total Workouts</p>
            </div>
            <p className="text-xl font-bold tabular-nums text-streak">{totalWorkouts}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
