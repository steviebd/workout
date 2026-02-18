import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import { useEffect, useState } from 'react'
import { useAuth } from './__root'
import { getSession } from '~/lib/auth'
import { DashboardWidgets } from '~/components/dashboard/DashboardWidgets'
import { DashboardCustomizer } from '~/components/dashboard/DashboardCustomizer'
import { DashboardProvider } from '@/lib/context/DashboardContext'
import { formatRelativeDate } from '~/lib/utils/date'
import { PageLayout } from '~/components/ui/PageLayout'

const getSessionServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const request = await getRequest()
  const session = await getSession(request)
  return session?.sub ? { sub: session.sub, email: session.email } : null
})

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

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.href = '/auth/signin'
      return
    }

    if (!auth.user) {
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

        let personalRecords: PersonalRecord[] = []
        try {
          const prsRes = await fetch('/api/progress/prs?mode=allTime&limit=3', { credentials: 'include' })
          if (prsRes.ok) {
            const prsData: { recentPRs: Array<{ id: string; exerciseName: string; date: string; weight: number; previousRecord?: number }> } = await prsRes.json()
            personalRecords = prsData.recentPRs.map((pr) => ({
              id: pr.id,
              exerciseName: pr.exerciseName,
              date: formatRelativeDate(pr.date),
              weight: pr.weight,
              improvement: pr.previousRecord ? pr.weight - pr.previousRecord : 0,
            }))
          }
        } catch (err) {
          console.error('Failed to fetch recent PRs:', err)
        }

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
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-[120px] rounded-xl bg-muted animate-pulse" />
        <div className="h-[100px] rounded-xl bg-muted animate-pulse" />
        <div className="h-[200px] rounded-xl bg-muted animate-pulse" />
        <div className="h-[150px] rounded-xl bg-muted animate-pulse" />
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
    <DashboardProvider>
      <PageLayout
        title={greeting}
        subtitle="Ready to crush your workout?"
        action={<DashboardCustomizer />}
      >
        <DashboardWidgets
          templates={templates}
          personalRecords={personalRecords}
          stats={stats}
          isNewUser={isNewUser}
        />
      </PageLayout>
    </DashboardProvider>
  )
}

export const Route = createFileRoute('/_index')({
  loader: async () => {
    const session = await getSessionServerFn()
    if (!session?.sub) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/auth/signin' })
    }
  },
  component: Dashboard,
})
