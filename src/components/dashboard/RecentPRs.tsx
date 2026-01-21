'use client'

import { Trophy, TrendingUp } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { useUnit } from '@/lib/context/UnitContext'

interface PersonalRecord {
  id: string
  exerciseName: string
  weight: number
  date: string
  improvement: number
}

interface RecentPRsProps {
  records: PersonalRecord[]
}

export function RecentPRs({ records }: RecentPRsProps) {
  const { formatWeight } = useUnit()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-chart-4" />
          Recent PRs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.slice(0, 3).map((record) => (
          <div 
            key={record.id}
            className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-4/20">
                <Trophy className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="font-medium">{record.exerciseName}</p>
                <p className="text-xs text-muted-foreground">{record.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatWeight(record.weight)}</p>
              <div className="flex items-center gap-1 text-success">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-medium">+{formatWeight(record.improvement)}</span>
              </div>
            </div>
          </div>
        ))}

        <Link to="/progress" className="block pt-2">
          <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border p-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
            View All PRs
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}
