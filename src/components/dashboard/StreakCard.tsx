'use client';

import { Check, Flame, Target, Trophy, TrendingUp } from 'lucide-react';
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
    <Card variant="tinted" className={`overflow-hidden ${weeklyComplete ? 'border-gradient' : ''}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                weeklyComplete 
                  ? 'bg-success/20 glow-success' 
                  : 'bg-primary/20'
              }`}
            >
              {weeklyComplete ? (
                <Flame className="h-6 w-6 text-success drop-shadow-[0_0_8px_var(--success)]" />
              ) : (
                <Target className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Times this week</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-2xl font-semibold tabular-nums transition-colors duration-300 ${
                  weeklyComplete ? 'text-gradient-primary' : 'text-foreground'
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

        <div className="border-t border-border/50 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${streakComplete ? 'glow-primary' : ''} rounded-full p-0.5`}>
                <TrendingUp className={`h-5 w-5 transition-all duration-300 ${
                  streakComplete 
                    ? 'text-primary drop-shadow-[0_0_6px_var(--primary)]' 
                    : 'text-primary'
                }`}
                />
              </div>
              <p className="text-lg font-semibold">30 Day Streak</p>
            </div>
            <p className={`text-sm tabular-nums ${
              streakComplete ? 'text-primary font-medium' : 'text-muted-foreground'
            }`}
            >
              {thirtyDayStreak.current} / {thirtyDayStreak.target} weeks
            </p>
          </div>

          <div className="relative h-4 overflow-hidden rounded-full bg-surface-2/80 border border-border/50 mb-4">
            <div
              className={`h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] transition-all duration-700 ease-out ${
                streakComplete ? 'glow-animated animate-[gradient-shift_3s_ease_infinite]' : ''
              }`}
              style={{ 
                width: `${thirtyDayStreak.progress}%`,
                boxShadow: thirtyDayStreak.progress > 0 
                  ? '0 0 12px -2px color-mix(in oklch, var(--primary), transparent 40%)' 
                  : 'none'
              }}
            />
            {thirtyDayStreak.progress > 0 && (
              <div 
                className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_ease-in-out_infinite]"
                style={{ left: `calc(${Math.min(thirtyDayStreak.progress, 100)}% - 16px)` }}
              />
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {thirtyDayStreak.weeklyDetails.slice(-4).reverse().map((week, index) => (
              <div
                key={week.weekStart}
                className={`group relative text-center p-2.5 rounded-xl text-xs border transition-all duration-200 cursor-default ${
                  week.meetsTarget
                    ? 'bg-success/15 text-success border-success/30 hover:bg-success/25 hover:border-success/50 hover:scale-[1.02]'
                    : week.count > 0
                    ? 'bg-surface-2 text-muted-foreground border-border/40 hover:bg-surface-3 hover:border-border/60 hover:scale-[1.02]'
                    : 'bg-surface-3/50 text-muted-foreground/40 border-border/20'
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

        <div className="border-t border-border/50 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-achievement drop-shadow-[0_0_4px_var(--achievement)]" />
              <p className="text-sm text-muted-foreground">Total Workouts</p>
            </div>
            <p className="text-xl font-bold tabular-nums text-gradient-warm">{totalWorkouts}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
