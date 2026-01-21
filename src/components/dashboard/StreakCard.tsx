'use client'

import { Flame, Calendar, Target } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/Card'

interface StreakCardProps {
  currentStreak: number
  longestStreak: number
  weeklyWorkouts: number
  totalWorkouts: number
}

export function StreakCard({ currentStreak, longestStreak, weeklyWorkouts, totalWorkouts }: StreakCardProps) {
  const streakPercentage = Math.min((currentStreak / 30) * 100, 100)

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
                <Flame className="h-8 w-8 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {currentStreak}
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold">{currentStreak} Day Streak</p>
              <p className="text-sm text-muted-foreground">
                Best: {longestStreak} days
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress to 30-day badge</span>
            <span className="font-medium text-primary">{currentStreak}/30</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${streakPercentage}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5">
            <Calendar className="h-4 w-4 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">This Week</p>
              <p className="font-semibold">{weeklyWorkouts} workouts</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5">
            <Target className="h-4 w-4 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold">{totalWorkouts} workouts</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
