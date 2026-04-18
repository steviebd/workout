import { Heart, Activity, Flame, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useUserPreferences } from '@/lib/context/UserPreferencesContext'
import { cn } from '~/lib/cn'

interface WhoopNutritionCardProps {
  recovery: {
    score: number | null
    status: 'red' | 'yellow' | 'green' | null
    hrv: number | null
  } | null
  cycle: {
    caloriesBurned: number | null
    totalStrain: number | null
  } | null
}

const statusLabels = {
  green: 'Optimal',
  yellow: 'Fair',
  red: 'Low',
}

export function WhoopNutritionCard({ recovery, cycle }: WhoopNutritionCardProps) {
  const { formatEnergy } = useUserPreferences()

  if (!recovery && !cycle) {
    return null
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-foreground">Whoop Recovery</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {recovery !== null ? (
            <>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1">Recovery</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-2xl font-bold',
                    recovery.status === 'green' ? 'text-success' : '',
                    recovery.status === 'yellow' ? 'text-warning' : '',
                    recovery.status === 'red' ? 'text-destructive' : '',
                    !recovery.status ? 'text-foreground' : ''
                  )}
                  >
                    {recovery.score ?? '--'}
                  </span>
                  {recovery.status !== null ? (
                    <Badge
                      variant={recovery.status === 'green' ? 'success' : recovery.status === 'yellow' ? 'warning' : 'default'}
                      className="text-xs"
                    >
                      {statusLabels[recovery.status]}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1">HRV</span>
                <div className="flex items-center gap-1">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-semibold text-foreground">
                    {recovery.hrv ?? '--'}
                  </span>
                  <span className="text-xs text-muted-foreground">ms</span>
                </div>
              </div>
            </>
          ) : null}
          {cycle !== null ? (
            <>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1">Calories</span>
                <div className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-semibold text-foreground">
                    {cycle.caloriesBurned !== null ? formatEnergy(cycle.caloriesBurned).split(' ')[0] : '--'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1">Strain</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-semibold text-foreground">
                    {cycle.totalStrain?.toFixed(1) ?? '--'}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
