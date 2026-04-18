import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { MealCard } from './MealCard'
import { MacroProgressBar } from './MacroProgressBar'
import { WhoopNutritionCard } from './WhoopNutritionCard'
import { TrainingContextCard } from './TrainingContextCard'
import { useUserPreferences } from '@/lib/context/UserPreferencesContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '~/lib/cn'

interface NutritionDashboardProps {
  date: string
}

interface DailySummary {
  entries: Array<{
    id: string
    name: string | null
    mealType: string | null
    calories: number | null
    proteinG: number | null
    carbsG: number | null
    fatG: number | null
    loggedAt: string | null
  }>
  totals: {
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
  }
  targets: {
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
  }
  whoopRecovery: {
    score: number | null
    status: 'red' | 'yellow' | 'green' | null
    hrv: number | null
  } | null
  whoopCycle: {
    caloriesBurned: number | null
    totalStrain: number | null
  } | null
  trainingContext: {
    trainingType: string
    customLabel: string | null
  } | null
  programSession: {
    sessionName: string
    targetLifts: string | null
  } | null
}

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const { formatEnergy } = useUserPreferences()
  const percentage = target > 0 ? Math.min((consumed / target) * 100, 100) : 0
  const remaining = Math.max(target - consumed, 0)
  const isOver = consumed > target

  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="160" height="160" className="-rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="var(--secondary)"
            strokeWidth="12"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={isOver ? 'var(--destructive)' : 'var(--primary)'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            'text-3xl font-bold',
            isOver ? 'text-destructive' : 'text-foreground'
          )}
          >
            {formatEnergy(consumed).split(' ')[0]}
          </span>
          <span className="text-xs text-muted-foreground">
            {isOver ? 'over' : 'remaining'}
          </span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm text-muted-foreground">
          {remaining > 0 ? `${formatEnergy(remaining)} left` : `${formatEnergy(Math.abs(remaining))} over`}
        </p>
        <p className="text-xs text-muted-foreground">
          of {formatEnergy(target)}
        </p>
      </div>
    </div>
  )
}

export function NutritionDashboard({ date }: NutritionDashboardProps) {
  const navigate = useNavigate()
  const { data: summary, isLoading, error } = useQuery<DailySummary>({
    queryKey: ['nutrition-daily-summary', date],
    queryFn: async () => {
      const res = await fetch(`/api/nutrition/daily-summary?date=${date}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch daily summary')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load nutrition data</p>
      </div>
    )
  }

  const { entries, totals, targets, whoopRecovery, whoopCycle, trainingContext, programSession } = summary

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <CalorieRing consumed={totals.calories} target={targets.calories} />
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <MacroProgressBar
            label="Protein"
            consumed={totals.proteinG}
            target={targets.proteinG}
            unit="g"
            color="bg-blue-500"
          />
          <MacroProgressBar
            label="Carbs"
            consumed={totals.carbsG}
            target={targets.carbsG}
            unit="g"
            color="bg-orange-500"
          />
          <MacroProgressBar
            label="Fat"
            consumed={totals.fatG}
            target={targets.fatG}
            unit="g"
            color="bg-red-500"
          />
        </CardContent>
      </Card>

      {(whoopRecovery !== null || whoopCycle !== null) && (
        <WhoopNutritionCard recovery={whoopRecovery} cycle={whoopCycle} />
      )}

      <TrainingContextCard
        trainingContext={trainingContext}
        programSession={programSession}
        date={date}
      />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Today&apos;s Meals</h2>
        {entries.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No meals logged yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Use the chat to log your first meal
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <MealCard
                key={entry.id}
                entry={{
                  id: entry.id,
                  name: entry.name,
                  mealType: entry.mealType,
                  calories: entry.calories,
                  proteinG: entry.proteinG,
                  carbsG: entry.carbsG,
                  fatG: entry.fatG,
                  loggedAt: entry.loggedAt,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-20 right-4 z-50">
        <Button size="lg" className="rounded-full shadow-lg" onClick={() => { void navigate({ to: '/nutrition/chat' }) }}>
          Log Meal
        </Button>
      </div>
    </div>
  )
}
