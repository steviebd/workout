'use client'

import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { StreakDisplay } from '~/components/achievements/StreakDisplay'
import { BadgeCard } from '~/components/achievements/BadgeCard'
import { PageLayout, PageLoading } from '~/components/ui/PageLayout'
import { FilterPills } from '~/components/ui/FilterPills'

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  category: string
  unlocked: boolean
  progress: number
  requirement: number
  unlockedAt?: string
}

interface UserStats {
  weeklyCount: number
  thirtyDayStreak: {
    current: number
    target: number
    progress: number
  }
}

type BadgeFilter = 'all' | 'unlocked' | 'locked'

function AchievementsPage() {
  const [filter, setFilter] = useState<BadgeFilter>('all')

  const { data: statsData, isLoading: statsLoading } = useQuery<{ weeklyCount: number; thirtyDayStreak: { current: number; target: number; progress: number } }>({
    queryKey: ['streaks'],
    queryFn: async () => {
      const res = await fetch('/api/streaks', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch streaks');
      return res.json();
    },
  });

  const { data: badgesData, isLoading: badgesLoading } = useQuery<{ badges: Badge[]; workoutDatesInWeek: string[] }>({
    queryKey: ['badges'],
    queryFn: async () => {
      const res = await fetch('/api/badges', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch badges');
      return res.json();
    },
  });

  const stats: UserStats = statsData ? {
    weeklyCount: statsData.weeklyCount ?? 0,
    thirtyDayStreak: statsData.thirtyDayStreak ?? { current: 0, target: 4, progress: 0 },
  } : { weeklyCount: 0, thirtyDayStreak: { current: 0, target: 4, progress: 0 } };

  const badges = badgesData?.badges ?? [];
  const workoutDatesInWeek = badgesData?.workoutDatesInWeek ?? [];

  const loading = statsLoading || badgesLoading;
  const unlockedCount = badges.filter((b) => b.unlocked).length
  const totalCount = badges.length

  const filteredBadges = badges.filter((badge) => {
    if (filter === 'unlocked') return badge.unlocked
    if (filter === 'locked') return !badge.unlocked
    return true
  })

  const filters: Array<{ value: BadgeFilter; label: string }> = [
    { value: 'all', label: `All (${totalCount})` },
    { value: 'unlocked', label: `Unlocked (${unlockedCount})` },
    { value: 'locked', label: `Locked (${totalCount - unlockedCount})` },
  ]

  if (loading) {
    return (
      <PageLayout title="Achievements">
        <PageLoading message="Loading achievements..." />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Achievements"
      subtitle={`${unlockedCount} of ${totalCount} badges earned`}
    >
      <StreakDisplay stats={stats} workoutDatesInWeek={workoutDatesInWeek} />

      <section className="mt-4">
        <FilterPills
          options={filters}
          value={filter}
          onChange={(value) => setFilter(value as BadgeFilter)}
        />

        <div className="grid gap-4 mt-4">
          {filteredBadges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      </section>
    </PageLayout>
  )
}

export const Route = createFileRoute('/achievements')({
  component: AchievementsPage,
})
