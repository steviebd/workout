'use client'

import { Play, Plus, Loader2, History, Dumbbell, Calendar, Sparkles, ChevronRight } from 'lucide-react'
import { useRouter, Link } from '@tanstack/react-router'
import { useState, type MouseEvent } from 'react'
import { Button } from '~/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { useToast } from '~/components/app/ToastProvider'

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
      <Card className="card-glow overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Play className="h-4 w-4 text-primary" />
            </div>
            <span>Start Session</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative rounded-xl border border-dashed border-border-strong bg-gradient-to-br from-surface-2 to-surface-3/50 p-5 text-center">
            <div className="mb-4 flex justify-center">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary glow-animated" />
              </div>
            </div>
            <h3 className="mb-1.5 font-semibold text-foreground">Get Started</h3>
            <p className="mb-5 text-sm text-muted-foreground">
              Choose a program or create your first workout
            </p>
            <div className="flex flex-col gap-2.5">
              <Button asChild={true} className="group w-full shine">
                <Link to="/programs">
                  <Calendar className="mr-2 h-4 w-4" />
                  Browse Programs
                  <ChevronRight className="ml-auto h-4 w-4 opacity-50 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild={true} variant="outline" className="group w-full bg-surface-1 hover:bg-surface-2">
                <Link to="/1rm-test">
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Test Your 1RM
                  <ChevronRight className="ml-auto h-4 w-4 opacity-50 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex gap-2.5">
            <Button asChild={true} variant="ghost" className="flex-1 hover:bg-surface-2">
              <Link to="/workouts">
                <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">New Workout</span>
              </Link>
            </Button>
            <Button asChild={true} variant="ghost" className="flex-1 hover:bg-surface-2">
              <Link to="/progress">
                <History className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">History</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="card-glow overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Play className="h-4 w-4 text-primary" />
          </div>
          <span>Start Session</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {templates.slice(0, 3).map((template, index) => (
          <button
            key={template.id}
            data-template-id={template.id}
            onClick={handleTemplateClick}
            disabled={loadingTemplateId === template.id}
            className="group pressable shine relative flex w-full items-center gap-3 rounded-xl border border-border/60 bg-gradient-to-r from-surface-2/80 to-surface-2/40 px-3.5 py-3 transition-all duration-200 hover:border-primary/30 hover:from-surface-3 hover:to-surface-2/60 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 transition-colors group-hover:bg-primary/10">
              {loadingTemplateId === template.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Play className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate font-medium tracking-tight transition-colors group-hover:text-primary">
                {template.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {template.exerciseCount} exercise{template.exerciseCount !== 1 ? 's' : ''}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary/70" />
            {index === 0 && (
              <div className="absolute -right-px -top-px rounded-bl-lg rounded-tr-xl bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                Recent
              </div>
            )}
          </button>
        ))}

        <div className="flex gap-2 pt-3">
          <Button asChild={true} variant="outline" className="flex-1 bg-surface-1 hover:bg-surface-2">
            <Link to="/workouts">
              <Plus className="mr-2 h-4 w-4" />
              New Workout
            </Link>
          </Button>
          <Button asChild={true} variant="ghost" className="flex-1 hover:bg-surface-2">
            <Link to="/progress">
              <History className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">History</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
