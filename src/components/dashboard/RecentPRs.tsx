'use client'

import { Trophy, TrendingUp, ChevronRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { useUnit } from '@/lib/context/UserPreferencesContext'

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
      <CardHeader className="flex flex-row items-center justify-between p-5 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-streak" />
          Recent PRs
        </CardTitle>
        <Link
          to="/progress"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          View All
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-3">
        {records.slice(0, 3).map((record) => (
          <div 
            key={record.id}
            className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-medium">{record.exerciseName}</p>
                <p className="text-xs text-muted-foreground">{record.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-success">{formatWeight(record.weight)}</p>
              {record.improvement > 0 && (
                <p className="text-xs text-success">
                  +{formatWeight(record.improvement)}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
