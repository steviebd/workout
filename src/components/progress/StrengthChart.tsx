'use client'

import { useEffect, useState } from 'react'
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

function ClientOnly({ children }: { children: () => React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return <>{children()}</>
}

export function StrengthChart({ data, exerciseName }: StrengthChartProps) {
  const { convertWeight, formatWeight } = useUnit()
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
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            {exerciseName} Progress
          </CardTitle>
          {improvement > 0 && (
            <div className="flex items-center gap-1 rounded-xl bg-success/20 px-2.5 py-1 text-success animate-in fade-in zoom-in duration-300">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">+{improvementPercent}%</span>
            </div>
          )}
          {improvement < 0 && (
            <div className="flex items-center gap-1 rounded-xl bg-muted px-2.5 py-1 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 rotate-180" />
              <span className="text-xs font-medium">{improvementPercent}%</span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Current: <span className="font-semibold text-foreground">{formatWeight(latestWeight)}</span>
          {data.length > 1 && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({improvement >= 0 ? '+' : ''}{formatWeight(improvement)} total)
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent>
        <ClientOnly>
          {() => (
            <div className="h-[180px] sm:h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart
                  data={data}
                  margin={{ top: 5, right: 8, left: -15, bottom: 5 }}
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    tickLine={{ stroke: 'var(--border)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickFormatter={formatChartDate}
                    interval="preserveStartEnd"
                    minTickGap={30}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    tickLine={{ stroke: 'var(--border)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    domain={['dataMin - 10', 'dataMax + 10']}
                    tickFormatter={(value: number) => `${convertWeight(value).toFixed(0)}`}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      boxShadow: '0 4px 6px -1px oklch(0 0 0 / 0.15), 0 2px 4px -2px oklch(0 0 0 / 0.1)',
                    }}
                    labelFormatter={formatFullChartDate}
                    formatter={(value: number | undefined) => [formatWeight(value ?? 0), 'Weight']}
                    labelStyle={{ color: 'var(--muted-foreground)', fontSize: 11 }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="url(#lineGradient)"
                    strokeWidth={3}
                    dot={{ fill: 'var(--primary)', strokeWidth: 2, r: data.length > 20 ? 3 : 5, strokeOpacity: 0.8 }}
                    activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 2 }}
                    animationDuration={750}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ClientOnly>
      </CardContent>
    </Card>
  )
}
