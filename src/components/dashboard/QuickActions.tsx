'use client'

import { Play, Plus, Loader2, History, Dumbbell, Calendar } from 'lucide-react'
import { useRouter, Link } from '@tanstack/react-router'
import { useState, type MouseEvent } from 'react'
import { Button } from '~/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { useToast } from '~/components/ToastProvider'

interface WorkoutTemplate {
  id: string
  name: string
  exerciseCount: number
}

interface QuickActionsProps {
  templates: WorkoutTemplate[]
}

export function QuickActions({ templates }: QuickActionsProps) {
  const router = useRouter()
  const toast = useToast()
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null)

  const hasTemplates = templates.length > 0

  const handleStartWorkout = async (template: WorkoutTemplate) => {
    setLoadingTemplateId(template.id)

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        credentials: 'include',
      })
      if (!response.ok) {
        const errorData = await response.json() as { error?: string }
        throw new Error(errorData.error ?? 'Failed to fetch template')
      }

      const templateData = await response.json() as { name: string };

      const createResponse = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: templateData.name,
          templateId: template.id,
        }),
      })

      console.log('QuickActions: Create workout response status:', createResponse.status)

      if (!createResponse.ok) {
        const errorData = await createResponse.json() as { error?: string }
        console.error('QuickActions: Create workout error:', errorData)
        throw new Error(errorData.error ?? 'Failed to create workout')
      }

      const workout = await createResponse.json() as { id: string }
      console.log('QuickActions: Workout created with ID:', workout.id)
      void router.navigate({ to: '/workouts/$id', params: { id: workout.id } })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
      setLoadingTemplateId(null)
    }
  }

  const handleTemplateClick = (e: MouseEvent<HTMLButtonElement>) => {
    const templateId = e.currentTarget.dataset.templateId
    const template = templates.find(t => t.id === templateId)
    if (template) {
      void handleStartWorkout(template)
    }
  }

  if (!hasTemplates) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Play className="h-5 w-5 text-primary" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              No templates yet. Start with a program or create your first workout!
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild={true} className="w-full">
                <Link to="/programs">
                  <Calendar className="mr-2 h-5 w-5" />
                  Browse Programs
                </Link>
              </Button>
              <Button asChild={true} variant="outline" className="w-full bg-transparent">
                <Link to="/1rm-test">
                  <Dumbbell className="mr-2 h-5 w-5" />
                  Test Your 1RM
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button asChild={true} variant="outline" className="flex-1 bg-transparent">
              <Link to="/workouts">
<Plus className="mr-2 h-5 w-5" />
                New Workout
              </Link>
            </Button>
            <Button asChild={true} variant="outline" className="flex-1 bg-transparent">
              <Link to="/progress">
<History className="mr-2 h-5 w-5" />
                History
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Play className="h-5 w-5 text-primary" />
          Quick Start
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.slice(0, 3).map((template) => (
          <button
            key={template.id}
            data-template-id={template.id}
            onClick={handleTemplateClick}
            disabled={loadingTemplateId === template.id}
            className="group flex w-full items-center justify-between rounded-lg border border-border bg-secondary/30 p-3 transition-colors hover:border-primary/50 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="text-left">
              <p className="font-medium group-hover:text-primary transition-colors">
                {template.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {template.exerciseCount} exercises
              </p>
            </div>
            {loadingTemplateId === template.id ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <Play className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </button>
        ))}

        <div className="flex gap-2 pt-2">
          <Button asChild={true} variant="outline" className="flex-1 bg-transparent">
            <Link to="/workouts">
              <Plus className="mr-2 h-4 w-4" />
              New Workout
            </Link>
          </Button>
          <Button asChild={true} variant="outline" className="flex-1 bg-transparent">
            <Link to="/progress">
              <History className="mr-2 h-4 w-4" />
              History
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
