'use client'

import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { StreakDisplay } from '~/components/achievements/StreakDisplay'
import { BadgeCard } from '~/components/achievements/BadgeCard'
import { cn } from '~/lib/cn'

const mockBadges = [
  {
    id: '1',
    name: '7 Day Streak',
    description: 'Work out 7 days in a row',
    icon: 'flame',
    category: 'streak',
    unlocked: true,
    progress: 7,
    requirement: 7,
    unlockedAt: '2024-01-15',
  },
  {
    id: '2',
    name: '30 Day Streak',
    description: 'Work out 30 days in a row',
    icon: 'flame',
    category: 'streak',
    unlocked: false,
    progress: 14,
    requirement: 30,
  },
  {
    id: '3',
    name: '1000 Club',
    description: 'Lift over 1000 in a workout',
    icon: 'dumbbell',
    category: 'volume',
    unlocked: true,
    progress: 1000,
    requirement: 1000,
    unlockedAt: '2024-01-10',
  },
  {
    id: '4',
    name: 'First PR',
    description: 'Set your first personal record',
    icon: 'trophy',
    category: 'pr',
    unlocked: true,
    progress: 1,
    requirement: 1,
    unlockedAt: '2024-01-05',
  },
]

const mockStats = {
  currentStreak: 7,
  longestStreak: 14,
  weeklyWorkouts: 4,
}

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

type BadgeFilter = 'all' | 'unlocked' | 'locked'

function AchievementsPage() {
  const [filter, setFilter] = useState<BadgeFilter>('all')

  const unlockedCount = mockBadges.filter((b) => b.unlocked).length
  const totalCount = mockBadges.length

  const filteredBadges = mockBadges.filter((badge) => {
    if (filter === 'unlocked') return badge.unlocked
    if (filter === 'locked') return !badge.unlocked
    return true
  })

  const filters: Array<{ value: BadgeFilter; label: string }> = [
    { value: 'all', label: `All (${totalCount})` },
    { value: 'unlocked', label: `Unlocked (${unlockedCount})` },
    { value: 'locked', label: `Locked (${totalCount - unlockedCount})` },
  ]

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-6">Achievements</h1>
        <p className="text-muted-foreground">
          {unlockedCount} of {totalCount} badges earned
        </p>
      </div>
      
      <StreakDisplay stats={mockStats} />

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
            <BadgeCard key={badge.id} badge={badge as Badge} />
          ))}
        </div>
      </section>
    </main>
  )
}

export const Route = createFileRoute('/achievements')({
  component: AchievementsPage,
})
