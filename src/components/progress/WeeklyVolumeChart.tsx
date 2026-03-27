import { useEffect, useState, useRef, memo } from 'react'
import { Dumbbell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { useUnit } from '@/lib/context/UserPreferencesContext'

interface WeeklyVolume {
  week: string
  volume: number
}

interface WeeklyVolumeChartProps {
  data: WeeklyVolume[]
}

// Lightweight SVG bar chart - ~2KB vs recharts 735KB
function SimpleBarChart({ 
  data, 
  width, 
  height,
  barColor = 'var(--volume)'
}: { 
  data: WeeklyVolume[]
  width: number
  height: number
  barColor?: string
}) {
  if (data.length === 0 || width <= 0 || height <= 0) return null

  const padding = { top: 10, right: 10, bottom: 30, left: 45 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const volumes = data.map(d => d.volume)
  const maxVolume = Math.max(...volumes)

  const barWidth = Math.min(40, (chartWidth / data.length) * 0.7)
  const barGap = (chartWidth - barWidth * data.length) / (data.length + 1)

  const xScale = (i: number) => padding.left + barGap + i * (barWidth + barGap)
  const yScale = (v: number) => (v / maxVolume) * chartHeight

  // Y-axis ticks
  const yTicks = 5
  const yTickValues = Array.from({ length: yTicks }, (_, i) => 
    (maxVolume * i) / (yTicks - 1)
  )

  // Format volume in thousands
  const formatVolume = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
    return v.toString()
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={barColor} stopOpacity={1} />
          <stop offset="100%" stopColor={barColor} stopOpacity={0.6} />
        </linearGradient>
      </defs>
      
      {/* Grid lines */}
      {yTickValues.map((tick, i) => (
        <line
          key={`grid-${i}`}
          x1={padding.left}
          y1={padding.top + chartHeight - yScale(tick)}
          x2={width - padding.right}
          y2={padding.top + chartHeight - yScale(tick)}
          stroke="var(--border)"
          strokeDasharray="3 3"
        />
      ))}
      
      {/* Bars */}
      {data.map((d, i) => {
        const barHeight = yScale(d.volume)
        const barY = padding.top + chartHeight - barHeight
        return (
          <g key={`bar-${i}`}>
            <rect
              x={xScale(i)}
              y={barY}
              width={barWidth}
              height={barHeight}
              fill="url(#barGradient)"
              rx={4}
              ry={4}
            />
          </g>
        )
      })}
      
      {/* Y-axis labels */}
      {yTickValues.map((tick, i) => (
        <text
          key={`y-${i}`}
          x={padding.left - 8}
          y={padding.top + chartHeight - yScale(tick)}
          textAnchor="end"
          dominantBaseline="middle"
          fill="var(--muted-foreground)"
          fontSize={10}
        >
          {formatVolume(tick)}
        </text>
      ))}
      
      {/* X-axis labels (show subset if many) */}
      {data.map((d, i) => {
        // Only show label for first and every ~4th item
        if (data.length > 8 && i % 4 !== 0 && i !== data.length - 1) return null
        const weekNum = d.week.replace('Week of ', '')
        return (
          <text
            key={`x-${i}`}
            x={xScale(i) + barWidth / 2}
            y={height - 8}
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize={10}
          >
            {weekNum}
          </text>
        )
      })}
    </svg>
  )
}

const MemoizedBarChart = memo(SimpleBarChart)

function WeeklyVolumeChart({ data }: WeeklyVolumeChartProps) {
  const { formatVolume } = useUnit()
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

  const totalVolume = data.reduce((acc, week) => acc + week.volume, 0)
  const avgVolume = Math.round(totalVolume / data.length)

  return (
    <Card className="overflow-hidden min-w-0">
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-5 w-5 text-volume" />
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
      <CardContent className="min-w-0">
        {data.length === 0 ? (
          <div className="h-[180px] sm:h-[220px] flex items-center justify-center text-sm text-muted-foreground">
            No volume data yet
          </div>
        ) : (
          <div ref={containerRef} className="h-[180px] sm:h-[220px] w-full min-w-0">
            <MemoizedBarChart
              data={data}
              width={dimensions.width}
              height={dimensions.height}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { WeeklyVolumeChart }
export default WeeklyVolumeChart
