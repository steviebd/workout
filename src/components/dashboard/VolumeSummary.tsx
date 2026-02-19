'use client'

import { Dumbbell, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/Card'
import { useUnit } from '@/lib/context/UserPreferencesContext'

interface VolumeSummaryProps {
  totalVolume: number
  weeklyVolume: number
  volumeGoal: number
  volumeChange: number
}

export function VolumeSummary({ totalVolume, volumeGoal, volumeChange }: VolumeSummaryProps) {
  const { formatVolume } = useUnit()
  const volumePercentage = Math.min((totalVolume / volumeGoal) * 100, 100)

  return (
    <Card className="border-volume/25">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-volume/20">
              <Dumbbell className="h-6 w-6 text-volume" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Volume</p>
              <p className="text-2xl font-semibold tabular-nums text-volume">{formatVolume(totalVolume)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-success shadow-sm">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">+{volumeChange}%</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {Math.round((volumeGoal - totalVolume) / 1000)}k {formatVolume(1000)} until {formatVolume(volumeGoal)} Club badge
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-volume transition-all duration-500"
            style={{ width: `${volumePercentage}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
