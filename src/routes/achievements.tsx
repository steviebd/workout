'use client'

import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { StreakDisplay } from '~/components/achievements/StreakDisplay'
import { BadgeCard } from '~/components/achievements/BadgeCard'
import { PageLayout } from '~/components/ui/PageLayout'
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
  const [stats, setStats] = useState<UserStats>({ weeklyCount: 0, thirtyDayStreak: { current: 0, target: 4, progress: 0 } })
  const [badges, setBadges] = useState<Badge[]>([])
  const [workoutDatesInWeek, setWorkoutDatesInWeek] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<BadgeFilter>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, badgesRes] = await Promise.all([
          fetch('/api/streaks', { credentials: 'include' }),
          fetch('/api/badges', { credentials: 'include' }),
        ])

        if (statsRes.ok) {
          const data: UserStats = await statsRes.json()
          setStats({
            weeklyCount: data.weeklyCount ?? 0,
            thirtyDayStreak: data.thirtyDayStreak ?? { current: 0, target: 4, progress: 0 },
          })
        }

        if (badgesRes.ok) {
          const badgesData: { badges: Badge[]; workoutDatesInWeek: string[] } = await badgesRes.json()
          setBadges(badgesData.badges ?? [])
          setWorkoutDatesInWeek(badgesData.workoutDatesInWeek ?? [])
        }
      } catch (error) {
        console.error('Failed to fetch achievements data:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [])

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
        <p className="text-muted-foreground">Loading...</p>
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
