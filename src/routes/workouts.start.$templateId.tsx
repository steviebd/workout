import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { Play, ChevronLeft, Loader2, RefreshCw } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useParams, useRouter } from '@tanstack/react-router'
import { useAuth } from './__root'
import { Button } from '~/components/ui/Button'
import { useToast } from '~/components/app/ToastProvider'
import { trackEvent } from '@/lib/analytics'
import { getSession } from '~/lib/auth/session'

const getSessionServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const request = await getRequest()
  const session = await getSession(request)
  return session?.sub ? { sub: session.sub, email: session.email } : null
})

interface TemplateExercise {
  id: string;
  exerciseId: string;
  orderIndex: number;
  exercise?: {
    id: string;
    name: string;
    muscleGroup: string | null;
  };
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  exercises: TemplateExercise[];
}

function StartWorkoutPage() {
  const auth = useAuth()
  const params = useParams({ from: '/workouts/start/$templateId' })
  const router = useRouter()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const templateId = params.templateId

  const { data: template, isLoading } = useQuery<Template>({
    queryKey: ['template', templateId],
    queryFn: async () => {
      const res = await fetch(`/api/templates/${templateId}`, { credentials: 'include' })
      if (!res.ok) {
        let errorData: { error?: string } = {}
        try {
          errorData = await res.json()
        } catch {}
        const message = errorData.error ?? 'Template not found'
        throw new Error(message)
      }
      return res.json()
    },
    enabled: !!templateId && !!auth.user,
  })

  const handleStartWorkout = useCallback(async () => {
    if (!template) {
      return
    }

    const userId = auth.user?.id
    if (!userId) {
      void router.navigate({ to: '/auth/signin' })
      return
    }

    try {
      setCreating(true)
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: template.name,
          templateId: template.id,
        }),
      })

      if (res.ok) {
        const workout: { id: string } = await res.json()
        void trackEvent('workout_started', {
          template_id: template.id,
          template_name: template.name,
          workout_id: workout.id,
        });
        await router.navigate({ to: '/workouts/$id', params: { id: workout.id } })
      } else {
        let errorData: { error?: string } = {}
        try {
          errorData = await res.json()
        } catch {
        }
        const errorMessage = errorData.error ?? `Failed to create workout`
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } catch {
      const errorMessage = 'Failed to create workout'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setCreating(false)
    }
  }, [template, auth.user?.id, router, toast])

  const onStartWorkoutClick = useCallback(() => {
    if (!auth.loading) {
      void handleStartWorkout()
    }
  }, [handleStartWorkout, auth.loading])

  if (auth.loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const displayError = error ?? (template === undefined ? 'Template not found' : null)

  if (displayError || !template) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <a href="/workouts" className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </a>
            <div>
              <h1 className="text-xl font-bold">Start Workout</h1>
            </div>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
            <p className="text-destructive">{displayError ?? 'Template not found'}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setError(null)
            }}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <a href="/workouts" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-xl font-bold">{template.name}</h1>
            <p className="text-sm text-muted-foreground">
              {template.exercises.length} exercises
            </p>
          </div>
        </div>

        {template.description ? (
          <p className="text-muted-foreground mb-6">{template.description}</p>
        ) : null}

        <div className="space-y-3 mb-6">
          {template.exercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 text-sm font-medium rounded bg-primary/10 text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium">{exercise.exercise?.name ?? 'Unknown Exercise'}</p>
                  {exercise.exercise?.muscleGroup ? (
                    <p className="text-sm text-muted-foreground">
                      {exercise.exercise.muscleGroup}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {template.exercises.length === 0 && (
            <div className="bg-card border border-border rounded-lg p-4 text-center text-muted-foreground">
              This template has no exercises
            </div>
          )}
        </div>

        <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border">
          <Button
            className="w-full"
            size="lg"
            onClick={onStartWorkoutClick}
            disabled={creating || template.exercises.length === 0}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Workout
              </>
            )}
          </Button>
        </div>
    </main>
  )
}

export const Route = createFileRoute('/workouts/start/$templateId')({
  loader: async () => {
    const session = await getSessionServerFn()
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    if (!session?.sub) throw redirect({ to: '/auth/signin' })
  },
  component: StartWorkoutPage,
})
