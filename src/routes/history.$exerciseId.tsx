import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { AlertCircle, Calendar, Loader2, Trophy, TrendingUp } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { EmptyExerciseHistory } from '@/components/ui/EmptyState';
import { useDateFormat } from '@/lib/context/DateFormatContext';
import { useUnit } from '@/lib/context/UnitContext';

const ExerciseHistoryChart = lazy(() => import('@/components/ExerciseHistoryChart').then(module => ({ default: module.ExerciseHistoryChart })));
import { ChartSkeleton } from '@/components/ChartSkeleton';

interface ExerciseHistoryItem {
  workoutId: string;
  workoutName: string;
  workoutDate: string;
  maxWeight: number;
  repsAtMax: number;
  est1rm: number;
  isPR: boolean;
}

interface ExerciseHistoryStats {
  maxWeight: number;
  est1rm: number;
  totalWorkouts: number;
}

interface ExerciseInfo {
  id: string;
  name: string;
  muscleGroup: string | null;
}

interface ExerciseHistoryResponse {
  exercise: ExerciseInfo;
  stats: ExerciseHistoryStats;
  history: ExerciseHistoryItem[];
}

interface ApiError {
  error: string;
  details?: string;
}

const getThisYearRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1);
  firstDay.setHours(0, 0, 0, 0);

  const lastDay = new Date(now);
  lastDay.setHours(23, 59, 59, 999);

  return {
    from: firstDay.toISOString(),
    to: lastDay.toISOString(),
  };
};

const getThisMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  firstDay.setHours(0, 0, 0, 0);

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  lastDay.setHours(23, 59, 59, 999);

  return {
    from: firstDay.toISOString(),
    to: lastDay.toISOString(),
  };
};

const getThisWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    from: monday.toISOString(),
    to: sunday.toISOString(),
  };
};

function ExerciseHistory() {
  const auth = useAuth();
  const params = useParams({ from: '/history/$exerciseId' });
  const { formatDateLong } = useDateFormat();
  const { formatWeight } = useUnit();
  const [redirecting, setRedirecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExerciseHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [chartType, setChartType] = useState<'weight' | 'volume'>('weight');

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const urlParams = new URLSearchParams();
      if (fromDate) urlParams.set('fromDate', fromDate);
      if (toDate) urlParams.set('toDate', toDate);

      const response = await fetch(`/api/exercises/${params.exerciseId}/history?${urlParams.toString()}`, {
        credentials: 'include',
      });

      console.log('[ExerciseHistory] API Response status:', response.status);

      if (response.ok) {
        const historyData = await response.json();
        console.log('[ExerciseHistory] Data received:', historyData);
        setData(historyData as ExerciseHistoryResponse);
        setError(null);
      } else {
        const errorData = await response.json().catch(() => ({})) as ApiError;
        console.error('[ExerciseHistory] API Error:', errorData);
        setError(errorData.error || `HTTP ${response.status}: Failed to load exercise history`);
        setData(null);
      }
    } catch (err) {
      console.error('[ExerciseHistory] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to server');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, params.exerciseId]);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      const { from, to } = getThisYearRange();
      setFromDate(from);
      setToDate(to);
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      void fetchHistory();
    }
  }, [auth.loading, auth.user, fetchHistory]);

  const handleQuickFilter = useCallback((filter: string) => {
    if (filter === 'thisWeek') {
      const range = getThisWeekRange();
      setFromDate(range.from);
      setToDate(range.to);
    } else if (filter === 'thisMonth') {
      const range = getThisMonthRange();
      setFromDate(range.from);
      setToDate(range.to);
    } else if (filter === 'thisYear') {
      const range = getThisYearRange();
      setFromDate(range.from);
      setToDate(range.to);
    } else if (filter === 'allTime') {
      setFromDate('');
      setToDate('');
    }
  }, []);

  const handleFromDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFromDate(e.target.value);
  }, []);

  const handleToDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setToDate(e.target.value);
  }, []);

  const handleChartTypeChange = useCallback(() => {
    setChartType((prev) => (prev === 'weight' ? 'volume' : 'weight'));
  }, []);

  const handleRetry = useCallback(() => {
    void fetchHistory();
  }, [fetchHistory]);

  if (auth.loading || redirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </div>
    );
  }

  if (!data && !loading && error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6">
          <Link to="/history" className="text-primary hover:underline text-sm">
            ← Back to History
          </Link>
        </div>
        <div className="bg-card border border-destructive p-6 mb-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-destructive" size={24} />
            <h2 className="text-lg font-semibold text-foreground">Unable to Load Exercise History</h2>
          </div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="bg-secondary rounded p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-2">Debug Information:</p>
            <p className="text-sm font-mono text-foreground">Exercise ID: {params.exerciseId}</p>
          </div>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            type="button"
          >
            Try Again
          </button>
        </div>
        <div className="text-center">
          <Link to="/history" className="text-primary hover:underline">
            ← Back to Workout History
          </Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6">
          <Link to="/history" className="text-primary hover:underline text-sm">
            ← Back to History
          </Link>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-2 text-muted-foreground">Loading exercise history...</span>
        </div>
      </main>
    );
  }

  const { exercise, stats, history } = data;

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <Link to="/history" className="text-primary hover:underline text-sm">
          ← Back to History
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-2">{exercise.name}</h1>
        {exercise.muscleGroup ? <p className="text-muted-foreground">{exercise.muscleGroup}</p> : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="text-chart-4" size={18} />
            <span className="text-sm text-muted-foreground">Max Weight</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatWeight(stats.maxWeight)}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-chart-3" size={18} />
            <span className="text-sm text-muted-foreground">Est. 1RM</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatWeight(stats.est1rm)}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-chart-2" size={18} />
            <span className="text-sm text-muted-foreground">Workouts</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalWorkouts}</p>
        </div>
      </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Progress Over Time</h2>
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  chartType === 'weight'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                onClick={chartType === 'volume' ? handleChartTypeChange : undefined}
                type="button"
              >
                Weight
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  chartType === 'volume'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                onClick={chartType === 'weight' ? handleChartTypeChange : undefined}
                type="button"
              >
                Volume
              </button>
            </div>
          </div>
          <Suspense fallback={<ChartSkeleton />}>
            <ExerciseHistoryChart data={history} chartType={chartType} />
          </Suspense>
        </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !fromDate && !toDate
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
            onClick={() => handleQuickFilter('allTime')}
          type="button"
        >
          All Time
        </button>
        <button
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            fromDate && fromDate === getThisWeekRange().from
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
           onClick={() => handleQuickFilter('thisWeek')}
          type="button"
        >
          This Week
        </button>
        <button
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            fromDate && fromDate === getThisMonthRange().from
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
           onClick={() => handleQuickFilter('thisMonth')}
          type="button"
        >
          This Month
        </button>
        <button
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            fromDate && fromDate === getThisYearRange().from
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
           onClick={() => handleQuickFilter('thisYear')}
          type="button"
        >
          This Year
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <input
          className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-input outline-none transition-shadow bg-background text-foreground"
          onChange={handleFromDateChange}
          type="date"
          value={fromDate ? fromDate.split('T')[0] : ''}
        />

        <input
          className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-input outline-none transition-shadow bg-background text-foreground"
          onChange={handleToDateChange}
          type="date"
          value={toDate ? toDate.split('T')[0] : ''}
        />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {history.length === 0 ? (
          <EmptyExerciseHistory />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Workout</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Max Weight</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Reps</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Est. 1RM</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr className="border-b border-border last:border-0 hover:bg-muted/50" key={item.workoutId}>
                    <td className="py-3 px-4 text-sm text-foreground">{formatDateLong(item.workoutDate)}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{item.workoutName}</td>
                    <td className="py-3 px-4 text-sm font-medium text-foreground">{formatWeight(item.maxWeight)}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{item.repsAtMax}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{formatWeight(item.est1rm)}</td>
                    <td className="py-3 px-4 text-sm">
                      {item.isPR ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-chart-4/20 text-chart-4">
                          🏆 PR
                                   </span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

export const Route = createFileRoute('/history/$exerciseId')({
  component: ExerciseHistory,
});
