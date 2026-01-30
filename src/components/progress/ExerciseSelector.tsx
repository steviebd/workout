'use client'

import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '~/lib/cn'

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
  const [isOpen, setIsOpen] = useState(false)

  const selectedExercise = exercises.find(e => e.id === selectedId)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-left shadow-sm transition-colors hover:bg-secondary/50"
      >
        <span className="font-medium">{selectedExercise?.name ?? 'Select Exercise'}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setIsOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
            role="button"
            tabIndex={0}
          />
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-card shadow-lg">
            {exercises.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => {
                  onSelect(exercise.id)
                  setIsOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors',
                  selectedId === exercise.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary'
                )}
              >
                <span>{exercise.name}</span>
                {selectedId === exercise.id && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
