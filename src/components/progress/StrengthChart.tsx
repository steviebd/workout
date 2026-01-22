'use client'

import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { useUnit } from '@/lib/context/UnitContext'
import { useDateFormat } from '@/lib/context/DateFormatContext'

interface ProgressDataPoint {
  date: string
  weight: number
}

interface StrengthChartProps {
  data: ProgressDataPoint[]
  exerciseName: string
}

export function StrengthChart({ data, exerciseName }: StrengthChartProps) {
  const { weightUnit, convertWeight, formatWeight } = useUnit()
  const { formatDateShort, formatDateLong } = useDateFormat()
  const latestWeight = data[data.length - 1]?.weight ?? 0
  const firstWeight = data[0]?.weight ?? 0
  const improvement = latestWeight - firstWeight
  const improvementPercent = firstWeight > 0 ? Math.round((improvement / firstWeight) * 100) : 0

  function formatChartDate(value: string | number | Date): string {
    return formatDateShort(value.toString())
  }

  function formatFullChartDate(value: string | number | Date): string {
    return formatDateLong(value.toString())
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            {exerciseName} Progress
          </CardTitle>
          {improvement > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-success/20 px-2.5 py-1 text-success">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">+{improvementPercent}%</span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Current: <span className="font-semibold text-foreground">{formatWeight(latestWeight)}</span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                tickLine={{ stroke: 'var(--border)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickFormatter={formatChartDate}
              />
              <YAxis
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                tickLine={{ stroke: 'var(--border)' }}
                axisLine={{ stroke: 'var(--border)' }}
                domain={['dataMin - 20', 'dataMax + 20']}
                tickFormatter={(value: number) => `${convertWeight(value).toFixed(0)} ${weightUnit}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                }}
                labelFormatter={formatFullChartDate}
                formatter={(value: number | undefined) => [formatWeight(value ?? 0), 'Weight']}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#2563eb' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
