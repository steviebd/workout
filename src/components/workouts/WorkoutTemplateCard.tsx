'use client'

import { Play, MoreVertical, Dumbbell } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/Card'
import { Button } from '~/components/ui/Button'

interface TemplateExercise {
  exerciseId: string
  exercise: {
    id: string
    name: string
    muscleGroup: string
  }
  targetSets: number
  targetReps: number
}

interface WorkoutTemplate {
  id: string
  name: string
  exercises: TemplateExercise[]
}

interface WorkoutTemplateCardProps {
  template: WorkoutTemplate
}

export function WorkoutTemplateCard({ template }: WorkoutTemplateCardProps) {
  const muscleGroups = [...new Set(template.exercises.map((e) => e.exercise.muscleGroup))]

  return (
    <Card className="group transition-all hover:border-primary/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
              <Dumbbell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{template.name}</h3>
              <p className="text-sm text-muted-foreground">
                {template.exercises.length} exercises
              </p>
            </div>
          </div>
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {muscleGroups.map((group) => (
            <span
              key={group}
              className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              {group}
            </span>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {template.exercises.slice(0, 3).map((ex) => (
            <div
              key={ex.exerciseId}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{ex.exercise.name}</span>
              <span className="font-medium">
                {ex.targetSets} x {ex.targetReps}
              </span>
            </div>
          ))}
          {template.exercises.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{template.exercises.length - 3} more exercises
            </p>
          )}
        </div>

        <Button asChild={true} className="mt-4 w-full" size="lg">
          <a href={`/workouts/${template.id}/start`}>
            <Play className="mr-2 h-4 w-4" />
            Start Workout
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
