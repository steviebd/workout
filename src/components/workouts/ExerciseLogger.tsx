'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Play } from 'lucide-react'
import { SetLogger } from './SetLogger'
import type { VideoTutorial } from '~/lib/db/exercise/library'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/Card'
import { Button } from '~/components/ui/Button'
import { cn } from '~/lib/cn'
import { VideoTutorialModal } from '~/components/workouts/VideoTutorialModal'

interface WorkoutSet {
  id: string
  reps: number
  weight: number
  completed: boolean
}

interface Exercise {
  id: string
  name: string
  muscleGroup: string
  isAmrap?: boolean
}

interface ExerciseLoggerProps {
  exercise: Exercise
  sets: WorkoutSet[]
  onSetsUpdate: (sets: WorkoutSet[]) => void
  onAddSet?: (exerciseId: string, currentSets: WorkoutSet[]) => Promise<void>
  videoTutorial?: VideoTutorial | null
}

export function ExerciseLogger({
  exercise,
  sets,
  onSetsUpdate,
  onAddSet,
  videoTutorial,
}: ExerciseLoggerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showTutorial, setShowTutorial] = useState(false)

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
    <>
      <Card className={cn('pressable', allCompleted && 'border-success/50')}>
        <CardHeader className="cursor-pointer p-4 sm:p-4 hover:bg-secondary/30 rounded-t-xl transition-colors" onClick={handleToggleExpand}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div
                className={cn(
                  'flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg text-xs sm:text-sm font-bold shrink-0',
                  allCompleted
                    ? 'bg-success/20 text-success'
                    : 'bg-primary/20 text-primary'
                )}
              >
                {completedSets}/{totalSets}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base flex items-center gap-1 sm:gap-2 truncate">
                  {exercise.name}
                  {isAmrapSet ? (
                    <span className="text-[9px] sm:text-[10px] font-bold px-1 py-0.5 bg-warning/20 text-warning rounded shrink-0">
                      AMRAP
                    </span>
                  ) : null}
                  {videoTutorial ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 h-6 w-6 sm:h-7 sm:w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowTutorial(true)
                      }}
                      aria-label={`Watch tutorial for ${exercise.name}`}
                      title={`Watch tutorial: ${videoTutorial.title}`}
                    >
                      <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  ) : null}
                </CardTitle>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{exercise.muscleGroup}</p>
                {isAmrapSet ? (
                  <p className="text-[9px] sm:text-[10px] text-amber-600 mt-0.5 hidden sm:block">
                    As Many Reps As Possible - enter reps completed
                  </p>
                ) : null}
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
            )}
          </div>
        </CardHeader>

        {isExpanded ? (
          <CardContent className="space-y-2 px-3 pb-3 sm:px-4 sm:pb-4 pt-0">
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
              className="w-full bg-transparent text-xs sm:text-sm"
              onClick={() => {
                void addSet()
              }}
            >
              <Plus className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
              Add Set
            </Button>
          </CardContent>
        ) : null}
      </Card>

      {videoTutorial ? (
        <VideoTutorialModal
          videoTutorial={videoTutorial}
          exerciseName={exercise.name}
          open={showTutorial}
          onOpenChange={setShowTutorial}
        />
      ) : null}
    </>
  )
}
