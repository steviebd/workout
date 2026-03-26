'use client'

import { useEffect, useState, useRef, memo } from 'react'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { useUnit } from '@/lib/context/UserPreferencesContext'

interface ProgressDataPoint {
  date: string
  weight: number
}

interface StrengthChartProps {
  data: ProgressDataPoint[]
  exerciseName: string
}

// Lightweight SVG line chart - ~2KB vs recharts 735KB
function SimpleLineChart({ 
  data, 
  width, 
  height,
  convertWeight,
  strokeColor = 'var(--primary)'
}: { 
  data: ProgressDataPoint[]
  width: number
  height: number
  convertWeight: (w: number) => number
  strokeColor?: string
}) {
  if (data.length === 0 || width <= 0 || height <= 0) return null

  const padding = { top: 10, right: 10, bottom: 30, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const weights = data.map(d => d.weight)
  const minWeight = Math.min(...weights)
  const maxWeight = Math.max(...weights)
  const range = maxWeight - minWeight || 1
  const yPadding = range * 0.1

  const xScale = (i: number) => padding.left + (i / (data.length - 1 || 1)) * chartWidth
  const yScale = (w: number) => padding.top + chartHeight - ((w - minWeight + yPadding) / (range + 2 * yPadding)) * chartHeight

  // Generate path
  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.weight).toFixed(1)}`)
    .join(' ')

  // Generate gradient area path
  const areaD = `${pathD} L ${xScale(data.length - 1).toFixed(1)} ${(padding.top + chartHeight).toFixed(1)} L ${padding.left} ${(padding.top + chartHeight).toFixed(1)} Z`

  // Y-axis ticks
  const yTicks = 5
  const yTickValues = Array.from({ length: yTicks }, (_, i) =>
    minWeight + yPadding + ((range + 2 * yPadding) * i) / (yTicks - 1)
  )

  // X-axis ticks (show max 5)
  const xTickIndices = data.length <= 5 
    ? data.map((_, i) => i)
    : [0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor(3 * data.length / 4), data.length - 1]

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={1} />
        </linearGradient>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      
      {/* Grid lines */}
      {yTickValues.map((tick, i) => (
        <line
          key={`grid-${i}`}
          x1={padding.left}
          y1={yScale(tick)}
          x2={width - padding.right}
          y2={yScale(tick)}
          stroke="var(--border)"
          strokeDasharray="3 3"
        />
      ))}
      
      {/* Area fill */}
      <path d={areaD} fill="url(#areaGradient)" />
      
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#lineGradient)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Data points */}
      {data.map((d, i) => (
        <circle
          key={`dot-${i}`}
          cx={xScale(i)}
          cy={yScale(d.weight)}
          r={data.length > 20 ? 3 : 5}
          fill={strokeColor}
          stroke="var(--card)"
          strokeWidth={2}
        />
      ))}
      
      {/* Y-axis labels */}
      {yTickValues.map((tick, i) => (
        <text
          key={`y-${i}`}
          x={padding.left - 8}
          y={yScale(tick)}
          textAnchor="end"
          dominantBaseline="middle"
          fill="var(--muted-foreground)"
          fontSize={10}
        >
          {convertWeight(tick).toFixed(0)}
        </text>
      ))}
      
      {/* X-axis labels */}
      {xTickIndices.map(i => (
        <text
          key={`x-${i}`}
          x={xScale(i)}
          y={height - 8}
          textAnchor="middle"
          fill="var(--muted-foreground)"
          fontSize={10}
        >
          {data[i]?.date.slice(5) || ''}
        </text>
      ))}
    </svg>
  )
}

const MemoizedLineChart = memo(SimpleLineChart)

function StrengthChart({ data, exerciseName }: StrengthChartProps) {
  const { convertWeight, formatWeight } = useUnit()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateDimensions = () => {
      const { width, height } = container.getBoundingClientRect()
      if (width > 0 && height > 0) {
        setDimensions({ width, height })
      }
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(container)

    requestAnimationFrame(() => {
      requestAnimationFrame(updateDimensions)
    })

    return () => resizeObserver.disconnect()
  }, [])

  const latestWeight = data[data.length - 1]?.weight ?? 0
  const firstWeight = data[0]?.weight ?? 0
  const improvement = latestWeight - firstWeight
  const improvementPercent = firstWeight > 0 ? Math.round((improvement / firstWeight) * 100) : 0

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
        {data.length === 0 ? (
          <div className="h-[180px] sm:h-[220px] flex items-center justify-center text-sm text-muted-foreground">
            No strength data yet
          </div>
        ) : (
          <div ref={containerRef} className="h-[180px] sm:h-[220px] w-full min-w-0">
            <MemoizedLineChart
              data={data}
              width={dimensions.width}
              height={dimensions.height}
              convertWeight={convertWeight}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { StrengthChart }
export default StrengthChart
