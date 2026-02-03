'use client';

import { StreakCard } from './StreakCard';
import { VolumeSummary } from './VolumeSummary';
import { QuickActions } from './QuickActions';
import { RecentPRs } from './RecentPRs';
import { EmptyStateBanner } from './EmptyStateBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { useStreak } from '@/lib/context/StreakContext';
import { useDashboard } from '@/lib/context/DashboardContext';

interface DashboardWidgetsProps {
  templates: Array<{ id: string; name: string; exerciseCount: number }>;
  personalRecords: Array<{
    id: string;
    exerciseName: string;
    weight: number;
    date: string;
    improvement: number;
  }>;
  stats: {
    totalWorkouts: number;
    thisWeek: number;
    thisMonth: number;
    totalVolume: number;
    totalSets: number;
  };
  isNewUser: boolean;
}

export function DashboardWidgets({ templates, personalRecords, stats, isNewUser }: DashboardWidgetsProps) {
  const { widgets } = useDashboard();
  const { weeklyCount, weeklyTarget, thirtyDayStreak, totalWorkouts, loading: streakLoading } = useStreak();

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'emptyState':
        if (!isNewUser) return null;
        return <EmptyStateBanner key="emptyState" />;
      case 'streak':
        return (
          <StreakCard
            key="streak"
            weeklyCount={streakLoading ? 0 : weeklyCount}
            weeklyTarget={streakLoading ? 3 : weeklyTarget}
            thirtyDayStreak={streakLoading ? { current: 0, target: 4, progress: 0, maxConsecutive: 0, weeklyDetails: [] } : thirtyDayStreak}
            totalWorkouts={streakLoading ? 0 : totalWorkouts}
          />
        );
      case 'volume':
        return (
          <VolumeSummary
            key="volume"
            totalVolume={stats.totalVolume}
            weeklyVolume={stats.totalVolume / 4}
            volumeGoal={50000}
            volumeChange={12}
          />
        );
      case 'quickActions':
        return <QuickActions key="quickActions" templates={templates} />;
      case 'recentPRs':
        return <RecentPRs key="recentPRs" records={personalRecords} />;
      default:
        return null;
    }
  };

  if (streakLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[120px] rounded-xl" />
        <Skeleton className="h-[100px] rounded-xl" />
        <Skeleton className="h-[200px] rounded-xl" />
        <Skeleton className="h-[150px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {sortedWidgets.filter((w) => w.enabled).map((widget) => renderWidget(widget.id))}
    </div>
  );
}
