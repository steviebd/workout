'use client'

import { Check, Calendar, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/Card'

interface UserStats {
  weeklyCount: number
  thirtyDayStreak: {
    current: number
    target: number
    progress: number
  }
}

interface StreakDisplayProps {
  stats: UserStats
  workoutDatesInWeek?: string[]
}

export function StreakDisplay({ stats, workoutDatesInWeek = [] as string[] }: StreakDisplayProps) {
  const today = new Date()
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  const workoutDays = days.map((_, index) => {
    const date = new Date(today)
    date.setDate(today.getDay() === 0 ? today.getDate() - 6 : today.getDate() - today.getDay() + index)
    const dateStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0]
    return workoutDatesInWeek.includes(dateStr)
  })

  const weeklyComplete = stats.weeklyCount >= 3

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="relative">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full ${weeklyComplete ? 'bg-success/20 ring-4 ring-success/30' : 'bg-primary/20 ring-4 ring-primary/30'}`}>
              {weeklyComplete ? (
                <Check className="h-10 w-10 text-success" />
              ) : (
                <TrendingUp className="h-10 w-10 text-primary" />
              )}
            </div>
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 ${weeklyComplete ? 'bg-success' : 'bg-primary'}`}>
              <span className="text-sm font-bold text-primary-foreground">
                {stats.weeklyCount}
              </span>
            </div>
          </div>
          
          <div>
            <p className="text-3xl font-bold">{stats.weeklyCount} / 3</p>
            <p className="text-muted-foreground">This Week</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="text-2xl font-bold">{stats.thirtyDayStreak.current}</p>
            <p className="text-xs text-muted-foreground">30-Day Streak (weeks)</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="text-2xl font-bold">{stats.thirtyDayStreak.progress.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Progress to 4 weeks</p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">This Week</span>
          </div>
          <div className="flex justify-between">
            {days.map((day, index) => {
              const isToday = index === today.getDay()
              const isActive = workoutDays[index]
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{day}</span>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                      isActive
                        ? 'bg-success text-success-foreground'
                        : isToday
                          ? 'border-2 border-primary bg-transparent'
                          : 'bg-secondary'
                    }`}
                  >
                    {isActive ? <Check className="h-4 w-4" /> : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
