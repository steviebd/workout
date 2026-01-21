'use client'

import { cn } from '@/lib/cn'

interface Exercise {
  id: string
  name: string
}

interface ExerciseSelectorProps {
  exercises: Exercise[]
  selectedId: string
  onSelect: (id: string) => void
}

export function ExerciseSelector({ exercises, selectedId, onSelect }: ExerciseSelectorProps) {
  function handleClick(id: string) {
    return () => onSelect(id)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {exercises.map((exercise) => (
        <button
          key={exercise.id}
          onClick={handleClick(exercise.id)}
          className={cn(
            'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all',
            selectedId === exercise.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
          )}
        >
          {exercise.name}
        </button>
      ))}
    </div>
  )
}
