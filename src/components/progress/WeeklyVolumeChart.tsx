'use client'

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { Dumbbell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { useUnit } from '@/lib/context/UnitContext'

interface WeeklyVolume {
  week: string
  volume: number
}

interface WeeklyVolumeChartProps {
  data: WeeklyVolume[]
}

export function WeeklyVolumeChart({ data }: WeeklyVolumeChartProps) {
  const { weightUnit, formatVolume } = useUnit()
  const totalVolume = data.reduce((acc, week) => acc + week.volume, 0)
  const avgVolume = Math.round(totalVolume / data.length)

  function formatWeek(value: string): string {
    return value.replace('Week ', 'W')
  }

  function formatVolumeTick(value: number): string {
    const converted = weightUnit === 'lbs' ? value * 2.20462 : value
    return `${Math.round(converted / 1000)}k`
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-5 w-5 text-accent" />
            Weekly Volume
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Avg: {formatVolume(avgVolume)}/week
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                tickLine={{ stroke: 'var(--border)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickFormatter={formatWeek}
              />
              <YAxis
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                tickLine={{ stroke: 'var(--border)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickFormatter={formatVolumeTick}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                }}
                formatter={(value: number | undefined) => [formatVolume(value ?? 0), 'Volume']}
              />
              <Bar
                dataKey="volume"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
