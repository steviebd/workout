'use client'

import { Dumbbell, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { useUnit } from '@/lib/context/UnitContext'

interface VolumeSummaryProps {
  totalVolume: number
  weeklyVolume: number
  volumeGoal: number
  volumeChange: number
}

export function VolumeSummary({ totalVolume, weeklyVolume, volumeGoal, volumeChange }: VolumeSummaryProps) {
  const { formatVolume } = useUnit()
  const volumePercentage = Math.min((totalVolume / volumeGoal) * 100, 100)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Dumbbell className="h-5 w-5 text-accent" />
          Volume Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{formatVolume(totalVolume)}</p>
            <p className="text-sm text-muted-foreground">Total Volume Lifted</p>
          </div>
          <div className="flex items-center gap-1 text-success">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">+{volumeChange}%</span>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress to {volumeGoal.toLocaleString()} Club</span>
            <span className="font-medium text-accent">{totalVolume.toLocaleString()}/{volumeGoal.toLocaleString()}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${volumePercentage}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg bg-secondary/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">This Week</span>
            <span className="font-semibold">{formatVolume(weeklyVolume)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
