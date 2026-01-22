'use client'

import { Trophy, TrendingUp, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'

export interface PersonalRecord {
  id: string
  exerciseName: string
  date: string
  weight: number
  reps: number
  previousRecord?: number
}

interface PRBoardProps {
  records: PersonalRecord[]
}

export function PRBoard({ records }: PRBoardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-chart-4" />
          Personal Records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.map((record, index) => (
          <div
            key={record.id}
            className="relative flex items-center gap-4 rounded-lg border border-border bg-secondary/30 p-4 transition-all hover:border-chart-4/50 hover:bg-secondary/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/20 text-lg font-bold text-chart-4">
              #{index + 1}
            </div>
            
            <div className="flex-1">
              <p className="font-semibold">{record.exerciseName}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(record.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span>{record.reps} rep{record.reps > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xl font-bold text-chart-4">{record.weight} lbs</p>
              {record.previousRecord ? (
                <p className="flex items-center justify-end gap-1 text-xs text-success">
                  <TrendingUp className="h-3 w-3" />
                  +{record.weight - record.previousRecord} lbs
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
