'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { SetLogger } from './SetLogger'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { Button } from '~/components/ui/Button'
import { cn } from '~/lib/cn'

interface WorkoutSet {
  id: string
  reps: number
  weight: number
  completed: boolean
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  isAmrap?: boolean;
}

interface ExerciseLoggerProps {
  exercise: Exercise
  sets: WorkoutSet[]
  onSetsUpdate: (sets: WorkoutSet[]) => void
  onAddSet?: (exerciseId: string, currentSets: WorkoutSet[]) => Promise<void>
}

export function ExerciseLogger({ exercise, sets, onSetsUpdate, onAddSet }: ExerciseLoggerProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const completedSets = sets.filter((s) => s.completed).length
  const totalSets = sets.length
  const allCompleted = completedSets === totalSets && totalSets > 0

  const isAmrapSet = exercise.isAmrap ?? exercise.name.endsWith('3+')

  const handleSetUpdate = (index: number, updatedSet: WorkoutSet) => {
    const newSets = [...sets]
    newSets[index] = updatedSet
    onSetsUpdate(newSets)
  }

  const addSet = async () => {
    const lastSet = sets[sets.length - 1]
    const newSet: WorkoutSet = {
      id: crypto.randomUUID(),
      reps: lastSet.reps,
      weight: lastSet.weight,
      completed: false,
    }
    
    if (onAddSet) {
      await onAddSet(exercise.id, [...sets, newSet])
    } else {
      onSetsUpdate([...sets, newSet])
    }
  }

  function handleToggleExpand() {
    setIsExpanded(!isExpanded)
  }

  return (
    <Card className={cn(allCompleted && 'border-success/50')}>
      <CardHeader
        className="cursor-pointer p-4"
        onClick={handleToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold',
                allCompleted
                  ? 'bg-success/20 text-success'
                  : 'bg-primary/20 text-primary'
              )}
            >
              {completedSets}/{totalSets}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {exercise.name}
                {isAmrapSet ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                    AMRAP
                  </span>
                ) : null}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{exercise.muscleGroup}</p>
              {isAmrapSet ? (
                <p className="text-[10px] text-amber-600 mt-0.5">
                  As Many Reps As Possible - enter reps completed
                </p>
              ) : null}
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {isExpanded ? <CardContent className="space-y-3 px-4 pb-4 pt-0">
          {sets.map((set, index) => (
            <SetLogger
              key={set.id}
              setNumber={index + 1}
              set={set}
              onUpdate={(updatedSet) => handleSetUpdate(index, updatedSet)}
            />
          ))}

          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={() => { void addSet(); }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Set
          </Button>
                    </CardContent> : null}
    </Card>
  )
}
