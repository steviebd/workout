import { createFileRoute } from '@tanstack/react-router'
import { StreakDisplay } from '~/components/achievements/StreakDisplay'
import { BadgeCard } from '~/components/achievements/BadgeCard'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/Tabs'

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

function AchievementsPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Achievements</h1>
        
        <StreakDisplay stats={mockStats} />
        
        <Tabs defaultValue="all" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unlocked">Unlocked</TabsTrigger>
            <TabsTrigger value="locked">Locked</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 grid gap-3">
            {mockBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge as Badge} />
            ))}
          </div>
        </Tabs>
    </main>
  )
}

export const Route = createFileRoute('/achievements')({
  component: AchievementsPage,
})
