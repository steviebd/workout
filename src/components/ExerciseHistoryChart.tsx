'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { useMemo, useState, useEffect, type FC } from 'react';
import { useUnit } from '@/lib/context/UnitContext';
import { useDateFormat } from '@/lib/context/DateFormatContext';

interface ExerciseHistoryItem {
  workoutId: string;
  workoutName: string;
  workoutDate: string;
  maxWeight: number;
  repsAtMax: number;
  est1rm: number;
  isPR: boolean;
}

interface ExerciseHistoryChartProps {
  readonly data: readonly ExerciseHistoryItem[];
  readonly chartType: 'weight' | 'volume';
}



export const ExerciseHistoryChart: FC<ExerciseHistoryChartProps> = ({ data, chartType }) => {
  const { weightUnit, convertWeight } = useUnit();
  const { formatDateShort } = useDateFormat();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function formatTick(value: string | number): string {
    const converted = typeof value === 'number' ? convertWeight(value) : value;
    return `${converted}${chartType === 'weight' ? ` ${weightUnit}` : ` ${weightUnit}·reps`}`
  }

  const chartData = useMemo(() => {
    const sortedData = [...data].sort((a, b) => new Date(a.workoutDate).getTime() - new Date(b.workoutDate).getTime());
    return sortedData.map((item, index) => {
      return {
        ...item,
        date: formatDateShort(item.workoutDate),
        value: chartType === 'weight' ? item.maxWeight : item.maxWeight * item.repsAtMax,
        prIndex: item.isPR ? index : -1,
      };
    });
  }, [data, chartType, formatDateShort]);

  const prPoints = useMemo(() => {
    return chartData.filter((d) => d.isPR).map((d) => ({ x: d.date, y: d.value }));
  }, [chartData]);

  if (!mounted) {
    return (
      <div className="h-64 flex items-center justify-center bg-secondary rounded-lg border border-border">
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-secondary rounded-lg border border-border">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
            tickLine={{ stroke: 'var(--border)' }}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
            tickLine={{ stroke: 'var(--border)' }}
            axisLine={{ stroke: 'var(--border)' }}
            domain={['dataMin - 5', 'dataMax + 5']}
            tickFormatter={formatTick}
          />
           <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--foreground)',
            }}
           />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
          />
          {prPoints.map((point) => (
            <ReferenceDot
              key={`${point.x}-${point.y}`}
              x={point.x}
              y={point.y}
              r={6}
              fill="var(--chart-4)"
              stroke="var(--card)"
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
