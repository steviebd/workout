'use client'

import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { StreakDisplay } from '~/components/achievements/StreakDisplay'
import { BadgeCard } from '~/components/achievements/BadgeCard'
import { cn } from '~/lib/cn'

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
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-6">Achievements</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-6">Achievements</h1>
        <p className="text-muted-foreground">
          {unlockedCount} of {totalCount} badges earned
        </p>
      </div>
      
      <StreakDisplay stats={stats} workoutDatesInWeek={workoutDatesInWeek} />

      <section className="mt-4 mb-6">
        <div className="flex justify-center overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-3 px-4">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'whitespace-nowrap flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all',
                  filter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {filteredBadges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      </section>
    </main>
  )
}

export const Route = createFileRoute('/achievements')({
  component: AchievementsPage,
})
