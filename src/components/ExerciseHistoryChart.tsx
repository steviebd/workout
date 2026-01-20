import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { useMemo, useState, useEffect, type FC } from 'react';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    const sortedData = [...data].sort((a, b) => new Date(a.workoutDate).getTime() - new Date(b.workoutDate).getTime());
    return sortedData.map((item, index) => ({
      ...item,
      date: new Date(item.workoutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: chartType === 'weight' ? item.maxWeight : item.maxWeight * item.repsAtMax,
      prIndex: item.isPR ? index : -1,
    }));
  }, [data, chartType]);

  const prPoints = useMemo(() => {
    return chartData.filter((d) => d.isPR).map((d) => ({ x: d.date, y: d.value }));
  }, [chartData]);

  if (!mounted) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">Loading chart...</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No data to display</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
            axisLine={{ stroke: '#e5e7eb' }}
            domain={['dataMin - 5', 'dataMax + 5']}
            tickFormatter={(value) => `${value}${chartType === 'weight' ? 'kg' : 'kg·reps'}`} // eslint-disable-line react/jsx-no-bind
          />
           <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#2563eb' }}
          />
          {prPoints.map((point) => (
            <ReferenceDot
              key={`${point.x}-${point.y}`}
              x={point.x}
              y={point.y}
              r={6}
              fill="#f59e0b"
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
