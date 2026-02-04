'use client'

import { useEffect, useState } from 'react'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { Dumbbell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { useUnit } from '@/lib/context/UnitContext'

const BarShape = (props: React.SVGProps<SVGRectElement>) => {
  return (
    <rect
      {...props}
      fill="url(#barGradient)"
    />
  )
}

interface WeeklyVolume {
  week: string
  volume: number
}

interface WeeklyVolumeChartProps {
  data: WeeklyVolume[]
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
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-5 w-5 text-accent" />
            Weekly Volume
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Avg: {formatVolume(avgVolume)}/wk
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{formatVolume(totalVolume)}</span>
        </p>
      </CardHeader>
      <CardContent>
        <ClientOnly>
          {() => (
            <div className="h-[180px] sm:h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart
                  data={data}
                  margin={{ top: 5, right: 8, left: -15, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={1} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    tickLine={{ stroke: 'var(--border)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickFormatter={formatWeek}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    tickLine={{ stroke: 'var(--border)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickFormatter={formatVolumeTick}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--foreground)',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    labelFormatter={(value) => `Week ${value}`}
                    formatter={(value: number | undefined) => [formatVolume(value ?? 0), 'Volume']}
                    labelStyle={{ color: 'var(--muted-foreground)', fontSize: 11 }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Bar
                    dataKey="volume"
                    shape={<BarShape />}
                    radius={[6, 6, 0, 0]}
                    animationDuration={500}
                    isAnimationActive={false}
                    activeBar={{ fill: 'url(#barGradient)' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ClientOnly>
      </CardContent>
    </Card>
  )
}
