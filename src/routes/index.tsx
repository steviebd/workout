import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from './__root'
import type { PersonalRecord as PersonalRecordType } from '~/lib/domain/stats/types'
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

type PersonalRecord = Pick<PersonalRecordType, 'id' | 'exerciseName' | 'weight' | 'date'> & { improvement: number }

interface WorkoutTemplate {
  id: string
  name: string
  exerciseCount: number
}

function Dashboard() {
  const auth = useAuth()

  const { data: stats, isLoading: statsLoading } = useQuery<WorkoutHistoryStats>({
    queryKey: ['workout-stats'],
    queryFn: async () => {
      const res = await fetch('/api/workouts/stats', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    enabled: !!auth.user,
  })

  const { data: templates = [], isLoading: templatesLoading } = useQuery<WorkoutTemplate[]>({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch templates')
      return res.json()
    },
    enabled: !!auth.user,
  })

  const { data: prsData, isLoading: prsLoading } = useQuery<{ recentPRs: Array<{ id: string; exerciseName: string; date: string; weight: number; previousRecord?: number }> }>({
    queryKey: ['recent-prs'],
    queryFn: async () => {
      const res = await fetch('/api/progress/prs?mode=allTime&limit=3', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch PRs')
      return res.json()
    },
    enabled: !!auth.user,
  })

  const personalRecords: PersonalRecord[] = prsData?.recentPRs.map((pr) => ({
    id: pr.id,
    exerciseName: pr.exerciseName,
    date: formatRelativeDate(pr.date),
    weight: pr.weight,
    improvement: pr.previousRecord ? pr.weight - pr.previousRecord : 0,
  })) ?? []

  const loading = auth.loading || statsLoading || templatesLoading || prsLoading

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-5 py-8 space-y-4">
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

  const currentStats = stats ?? { totalWorkouts: 0, thisWeek: 0, thisMonth: 0, totalVolume: 0, totalSets: 0 }
  const isNewUser = currentStats.totalWorkouts === 0 && templates.length === 0

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
          stats={currentStats}
          isNewUser={isNewUser}
        />
      </PageLayout>
    </DashboardProvider>
  )
}

export const Route = createFileRoute('/')({
  loader: async () => {
    const session = await getSessionServerFn()
    if (!session?.sub) {
      // TanStack Start's redirect() returns a special redirect object, not an Error
      // This is the standard pattern for route guards in TanStack Start
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/auth/signin' })
    }
  },
  component: Dashboard,
})
