import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from './__root'
import { StreakCard } from '~/components/dashboard/StreakCard'
import { VolumeSummary } from '~/components/dashboard/VolumeSummary'
import { QuickActions } from '~/components/dashboard/QuickActions'
import { RecentPRs } from '~/components/dashboard/RecentPRs'
import { EmptyStateBanner } from '~/components/dashboard/EmptyStateBanner'
import { Skeleton } from '~/components/ui/Skeleton'
import { useStreak } from '@/lib/context/StreakContext'

interface WorkoutHistoryStats {
  totalWorkouts: number
  thisWeek: number
  thisMonth: number
  totalVolume: number
  totalSets: number
}

interface Workout {
  id: string
  name: string
  startedAt: string
  completedAt: string | null
  createdAt: string
}

interface PersonalRecord {
  id: string
  exerciseName: string
  weight: number
  date: string
  improvement: number
}

interface WorkoutTemplate {
  id: string
  name: string
  exerciseCount: number
}

interface DashboardData {
  stats: WorkoutHistoryStats
  recentWorkouts: Workout[]
  prCount: number
  personalRecords: PersonalRecord[]
  templates: WorkoutTemplate[]
}

function Dashboard() {
  const auth = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentStreak, longestStreak, weeklyWorkouts, totalWorkouts, loading: streakLoading } = useStreak()

  console.log('[Dashboard] auth state:', { loading: auth.loading, user: auth.user })
  console.log('[Dashboard] local state:', { loading, error, hasData: !!data })

  useEffect(() => {
    console.log('[Dashboard useEffect] auth.loading:', auth.loading, 'auth.user:', auth.user)
    
    if (!auth.loading && !auth.user) {
      console.log('[Dashboard] No user, redirecting to signin')
      window.location.href = '/auth/signin'
      return
    }

    if (!auth.user) {
      console.log('[Dashboard] auth.user is null, waiting...')
      return
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const [statsRes, workoutsRes, prCountRes, templatesRes] = await Promise.all([
          fetch('/api/workouts/stats', { credentials: 'include' }),
          fetch('/api/workouts?limit=5&sortBy=startedAt&sortOrder=DESC', { credentials: 'include' }),
          fetch('/api/workouts/pr-count', { credentials: 'include' }),
          fetch('/api/templates', { credentials: 'include' }),
        ])

        if (statsRes.status === 401 || workoutsRes.status === 401 || prCountRes.status === 401) {
          window.location.href = '/auth/signin'
          return
        }

        if (!statsRes.ok || !workoutsRes.ok || !prCountRes.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const stats: WorkoutHistoryStats = statsRes.ok ? await statsRes.json() : { totalWorkouts: 0, thisWeek: 0, thisMonth: 0, totalVolume: 0, totalSets: 0 }
        const workouts: Workout[] = workoutsRes.ok ? await workoutsRes.json() : []
        const prCountData: { count: number } = prCountRes.ok ? await prCountRes.json() : { count: 0 }
        const templates: WorkoutTemplate[] = templatesRes.ok ? await templatesRes.json() : []

        const personalRecords: PersonalRecord[] = [
          { id: '1', exerciseName: 'Bench Press', weight: 225, date: '2 days ago', improvement: 10 },
          { id: '2', exerciseName: 'Squat', weight: 315, date: '1 week ago', improvement: 15 },
          { id: '3', exerciseName: 'Deadlift', weight: 405, date: '2 weeks ago', improvement: 20 },
        ]

        setData({
          stats,
          recentWorkouts: workouts,
          prCount: prCountData.count,
          personalRecords,
          templates,
        })
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    void fetchDashboardData()
  }, [auth.loading, auth.user])

  if (auth.loading || loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-[120px] rounded-xl" />
        <Skeleton className="h-[100px] rounded-xl" />
        <Skeleton className="h-[200px] rounded-xl" />
        <Skeleton className="h-[150px] rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive p-4">{error}</div>
      </div>
    )
  }

  const stats = data?.stats ?? { totalWorkouts: 0, thisWeek: 0, thisMonth: 0, totalVolume: 0, totalSets: 0 }
  const personalRecords = data?.personalRecords ?? []
  const templates = data?.templates ?? []

  const isNewUser = stats.totalWorkouts === 0 && templates.length === 0

  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{greeting}</h1>
          <p className="text-muted-foreground">Ready to crush your workout?</p>
        </div>

        {isNewUser ? <EmptyStateBanner /> : null}

        <div className="space-y-4">
          <StreakCard
            currentStreak={streakLoading ? 0 : currentStreak}
            longestStreak={streakLoading ? 0 : longestStreak}
            weeklyWorkouts={streakLoading ? 0 : weeklyWorkouts}
            totalWorkouts={streakLoading ? 0 : totalWorkouts}
          />
          <VolumeSummary
            totalVolume={stats.totalVolume}
            weeklyVolume={stats.totalVolume / 4}
            volumeGoal={50000}
            volumeChange={12}
          />
          <QuickActions templates={templates} />
          <RecentPRs records={personalRecords} />
        </div>
    </main>
  )
}

export const Route = createFileRoute('/')({
  component: Dashboard,
})
