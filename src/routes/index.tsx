import { createFileRoute, Link } from '@tanstack/react-router';
import { Calendar, Clock, Dumbbell, Loader2, Plus, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from './__root';

interface WorkoutHistoryStats {
  totalWorkouts: number;
  thisWeek: number;
  thisMonth: number;
  totalVolume: number;
  totalSets: number;
}

interface Workout {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

interface DashboardData {
  stats: WorkoutHistoryStats;
  recentWorkouts: Workout[];
  prCount: number;
}

const formatDuration = (startTime: string, endTime: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

function Dashboard() {
  const auth = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.href = '/auth/signin';
      return;
    }

    if (!auth.user) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, workoutsRes, prCountRes] = await Promise.all([
          fetch('/api/workouts/stats', { credentials: 'include' }),
          fetch('/api/workouts?limit=5&sortBy=startedAt&sortOrder=DESC', { credentials: 'include' }),
          fetch('/api/workouts/pr-count', { credentials: 'include' }),
        ]);

        if (!statsRes.ok || !workoutsRes.ok || !prCountRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const stats: WorkoutHistoryStats = await statsRes.json();
        const workouts: Workout[] = await workoutsRes.json();
        const prCountData: { count: number } = await prCountRes.json();

        setData({
          stats,
          recentWorkouts: workouts,
          prCount: prCountData.count,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboardData();
  }, [auth.loading, auth.user]);

  if (auth.loading || loading) {
    return (
      <div className={'min-h-screen flex items-center justify-center'}>
        <Loader2 className={'animate-spin text-blue-600'} size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={'min-h-screen bg-gray-50 p-8'}>
        <div className={'max-w-4xl mx-auto'}>
          <div className={'bg-red-50 border border-red-200 rounded-lg p-4'}>
            <p className={'text-red-600'}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = data?.stats ?? { totalWorkouts: 0, thisWeek: 0, thisMonth: 0, totalVolume: 0, totalSets: 0 };
  const recentWorkouts = data?.recentWorkouts ?? [];
  const prCount = data?.prCount ?? 0;

  return (
    <div className={'min-h-screen bg-gray-50'}>
      <div className={'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
        <div className={'mb-8'}>
          <h1 className={'text-3xl font-bold text-gray-900'}>{'Dashboard'}</h1>
          <p className={'text-gray-600 mt-1'}>{'Welcome back! Here\'s your fitness overview.'}</p>
        </div>

        <div className={'mb-8'}>
          <Link
            className={'inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm'}
            to={'/workouts/new'}
          >
            <Plus size={20} />
            {'Start Workout'}
          </Link>
        </div>

        <div className={'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'}>
          <div className={'bg-white rounded-lg border border-gray-200 p-6'}>
            <div className={'flex items-center gap-3 mb-2'}>
              <div className={'p-2 bg-blue-100 rounded-lg'}>
                <Calendar className={'text-blue-600'} size={20} />
              </div>
              <span className={'text-sm font-medium text-gray-500'}>{'This Week'}</span>
            </div>
            <p className={'text-3xl font-bold text-gray-900'}>{stats.thisWeek}</p>
            <p className={'text-sm text-gray-500 mt-1'}>{'workouts'}</p>
          </div>

          <div className={'bg-white rounded-lg border border-gray-200 p-6'}>
            <div className={'flex items-center gap-3 mb-2'}>
              <div className={'p-2 bg-green-100 rounded-lg'}>
                <Calendar className={'text-green-600'} size={20} />
              </div>
              <span className={'text-sm font-medium text-gray-500'}>{'This Month'}</span>
            </div>
            <p className={'text-3xl font-bold text-gray-900'}>{stats.thisMonth}</p>
            <p className={'text-sm text-gray-500 mt-1'}>{'workouts'}</p>
          </div>

          <div className={'bg-white rounded-lg border border-gray-200 p-6'}>
            <div className={'flex items-center gap-3 mb-2'}>
              <div className={'p-2 bg-purple-100 rounded-lg'}>
                <Dumbbell className={'text-purple-600'} size={20} />
              </div>
              <span className={'text-sm font-medium text-gray-500'}>{'Total'}</span>
            </div>
            <p className={'text-3xl font-bold text-gray-900'}>{stats.totalWorkouts}</p>
            <p className={'text-sm text-gray-500 mt-1'}>{'workouts'}</p>
          </div>

          <div className={'bg-white rounded-lg border border-gray-200 p-6'}>
            <div className={'flex items-center gap-3 mb-2'}>
              <div className={'p-2 bg-amber-100 rounded-lg'}>
                <Trophy className={'text-amber-600'} size={20} />
              </div>
              <span className={'text-sm font-medium text-gray-500'}>{'PRs'}</span>
            </div>
            <p className={'text-3xl font-bold text-gray-900'}>{prCount}</p>
            <p className={'text-sm text-gray-500 mt-1'}>{'personal records'}</p>
          </div>
        </div>

        <div className={'bg-white rounded-lg border border-gray-200'}>
          <div className={'flex items-center justify-between p-6 border-b border-gray-200'}>
            <h2 className={'text-xl font-semibold text-gray-900'}>{'Recent Workouts'}</h2>
            <Link className={'text-sm text-blue-600 hover:text-blue-700 font-medium'} to={'/history'}>
              {'View All'}
            </Link>
          </div>

          {recentWorkouts.length === 0 ? (
            <div className={'p-6 text-center'}>
              <p className={'text-gray-500 mb-4'}>{'No workouts yet. Start your first workout!'}</p>
              <Link
                className={'inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'}
                to={'/workouts/new'}
              >
                <Plus size={18} />
                {'Start Workout'}
              </Link>
            </div>
          ) : (
            <div className={'divide-y divide-gray-100'}>
              {recentWorkouts.map((workout) => (
                <div className={'p-6 hover:bg-gray-50 transition-colors'} key={workout.id}>
                  <div className={'flex items-center justify-between'}>
                    <div>
                      <h3 className={'font-medium text-gray-900'}>{workout.name}</h3>
                      <div className={'flex items-center gap-4 mt-1 text-sm text-gray-500'}>
                        <span className={'flex items-center gap-1'}>
                          <Calendar size={14} />
                          {formatDate(workout.startedAt)}
                        </span>
                        {workout.completedAt ? (
                          <span className={'flex items-center gap-1'}>
                            <Clock size={14} />
                            {formatDuration(workout.startedAt, workout.completedAt)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <Link
                      className={'text-sm text-blue-600 hover:text-blue-700 font-medium'}
                      to={'/workouts/$id'}
                      params={{ id: workout.id }}
                    >
                      {'View'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: Dashboard,
});
