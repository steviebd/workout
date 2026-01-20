import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { AlertCircle, Calendar, Loader2, Trophy, TrendingUp } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { EmptyExerciseHistory } from '@/components/EmptyState';

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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

function ExerciseHistory() {
  const auth = useAuth();
  const params = useParams({ from: '/history/$exerciseId' });
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Redirecting to sign in...</p>
      </div>
    );
  }

  if (!data && !loading && error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link to="/history" className="text-blue-600 hover:underline text-sm">
              ← Back to History
            </Link>
          </div>
          <div className="bg-white rounded-lg border border-red-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">Unable to Load Exercise History</h2>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="bg-gray-50 rounded p-4 mb-4">
              <p className="text-sm text-gray-500 mb-2">Debug Information:</p>
              <p className="text-sm font-mono text-gray-700">Exercise ID: {params.exerciseId}</p>
            </div>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              type="button"
            >
              Try Again
            </button>
          </div>
          <div className="text-center">
            <Link to="/history" className="text-blue-600 hover:underline">
              ← Back to Workout History
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link to="/history" className="text-blue-600 hover:underline text-sm">
              ← Back to History
            </Link>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <span className="ml-2 text-gray-600">Loading exercise history...</span>
          </div>
        </div>
      </div>
    );
  }

  const { exercise, stats, history } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link to="/history" className="text-blue-600 hover:underline text-sm">
            ← Back to History
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{exercise.name}</h1>
          {exercise.muscleGroup ? <p className="text-gray-600">{exercise.muscleGroup}</p> : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-amber-600" size={18} />
              <span className="text-sm text-gray-500">Max Weight</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.maxWeight} kg</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-green-600" size={18} />
              <span className="text-sm text-gray-500">Est. 1RM</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.est1rm} kg</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-blue-600" size={18} />
              <span className="text-sm text-gray-500">Workouts</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalWorkouts}</p>
          </div>
        </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Progress Over Time</h2>
              <div className="flex items-center gap-2">
                <button
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    chartType === 'weight'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={chartType === 'volume' ? handleChartTypeChange : undefined}
                  type="button"
                >
                  Weight
                </button>
                <button
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    chartType === 'volume'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
             onClick={() => handleQuickFilter('allTime')} // eslint-disable-line react/jsx-no-bind
            type="button"
          >
            All Time
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              fromDate && fromDate === getThisWeekRange().from
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
             onClick={() => handleQuickFilter('thisWeek')} // eslint-disable-line react/jsx-no-bind
            type="button"
          >
            This Week
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              fromDate && fromDate === getThisMonthRange().from
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
             onClick={() => handleQuickFilter('thisMonth')} // eslint-disable-line react/jsx-no-bind
            type="button"
          >
            This Month
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              fromDate && fromDate === getThisYearRange().from
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
             onClick={() => handleQuickFilter('thisYear')} // eslint-disable-line react/jsx-no-bind
            type="button"
          >
            This Year
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <input
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            onChange={handleFromDateChange}
            type="date"
            value={fromDate ? fromDate.split('T')[0] : ''}
          />

          <input
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            onChange={handleToDateChange}
            type="date"
            value={toDate ? toDate.split('T')[0] : ''}
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {history.length === 0 ? (
            <EmptyExerciseHistory />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Workout</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Max Weight</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Reps</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Est. 1RM</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500" />
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50" key={item.workoutId}>
                      <td className="py-3 px-4 text-sm text-gray-900">{formatDate(item.workoutDate)}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{item.workoutName}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{item.maxWeight} kg</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{item.repsAtMax}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{item.est1rm} kg</td>
                      <td className="py-3 px-4 text-sm">
                        {item.isPR ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
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
      </div>
    </div>
  );
}

export const Route = createFileRoute('/history/$exerciseId')({
  component: ExerciseHistory,
});
