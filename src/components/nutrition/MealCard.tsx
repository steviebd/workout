import { Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useUserPreferences } from '@/lib/context/UserPreferencesContext'

interface MealCardProps {
  entry: {
    id: string
    name: string | null
    mealType: string | null
    calories: number | null
    proteinG: number | null
    carbsG: number | null
    fatG: number | null
    loggedAt: string | null | undefined
  }
}

const mealTypeColors: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
  breakfast: 'default',
  lunch: 'secondary',
  dinner: 'success',
  snack: 'warning',
}

export function MealCard({ entry }: MealCardProps) {
  const { formatEnergy } = useUserPreferences()

  const mealType = entry.mealType ?? 'snack'
  const mealTypeLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1)

  const loggedAt = entry.loggedAt ? new Date(entry.loggedAt) : null
  const timeString = loggedAt
    ? loggedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : ''

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-foreground truncate">
                {entry.name ?? 'Unnamed meal'}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={mealTypeColors[mealType] ?? 'default'} className="text-xs">
                {mealTypeLabel}
              </Badge>
              {timeString.length > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeString}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-semibold text-foreground">
              {formatEnergy(entry.calories ?? 0)}
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-3 text-sm">
          <div>
            <span className="text-muted-foreground">P: </span>
            <span className="font-medium text-foreground">{entry.proteinG ?? 0}g</span>
          </div>
          <div>
            <span className="text-muted-foreground">C: </span>
            <span className="font-medium text-foreground">{entry.carbsG ?? 0}g</span>
          </div>
          <div>
            <span className="text-muted-foreground">F: </span>
            <span className="font-medium text-foreground">{entry.fatG ?? 0}g</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
