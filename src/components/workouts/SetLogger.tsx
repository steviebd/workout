'use client'

import { useState, useRef, useCallback } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { Button } from '~/components/ui/Button'
import { cn } from '~/lib/cn'
import { useUnit } from '@/lib/context/UnitContext'

interface WorkoutSet {
  id: string
  reps: number
  weight: number
  completed: boolean
}

interface SetLoggerProps {
  setNumber: number
  set: WorkoutSet
  onUpdate: (set: WorkoutSet) => void
}

export function SetLogger({ setNumber, set, onUpdate }: SetLoggerProps) {
  const { weightUnit } = useUnit()
  const [weight, setWeight] = useState(set.weight)
  const [reps, setReps] = useState(set.reps)
  const [isEditingWeight, setIsEditingWeight] = useState(false)
  const [isEditingReps, setIsEditingReps] = useState(false)
  const weightInputRef = useRef<HTMLInputElement>(null)
  const repsInputRef = useRef<HTMLInputElement>(null)

  const handleComplete = () => {
    onUpdate({
      ...set,
      weight,
      reps,
      completed: !set.completed,
    })
  }

  const adjustWeight = useCallback((delta: number) => {
    const newWeight = Math.max(0, weight + delta)
    setWeight(newWeight)
  }, [weight])

  const handleWeightDecrease = useCallback(() => {
    adjustWeight(-5)
  }, [adjustWeight])

  const handleWeightIncrease = useCallback(() => {
    adjustWeight(5)
  }, [adjustWeight])

  const adjustReps = useCallback((delta: number) => {
    const newReps = Math.max(0, reps + delta)
    setReps(newReps)
  }, [reps])

  const handleRepsDecrease = useCallback(() => {
    adjustReps(-1)
  }, [adjustReps])

  const handleRepsIncrease = useCallback(() => {
    adjustReps(1)
  }, [adjustReps])

  const handleWeightBlur = useCallback(() => {
    setIsEditingWeight(false)
    onUpdate({
      ...set,
      weight,
      reps,
      completed: set.completed,
    })
  }, [set, weight, reps, onUpdate])

  const handleRepsBlur = useCallback(() => {
    setIsEditingReps(false)
    onUpdate({
      ...set,
      weight,
      reps,
      completed: set.completed,
    })
  }, [set, weight, reps, onUpdate])

  const handleWeightKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      weightInputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setWeight(set.weight)
      setIsEditingWeight(false)
    }
  }, [set.weight])

  const handleRepsKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      repsInputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setReps(set.reps)
      setIsEditingReps(false)
    }
  }, [set.reps])

  const handleWeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || /^\d+$/.test(value)) {
      setWeight(value === '' ? 0 : parseInt(value, 10))
    }
  }, [])

  const handleRepsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || /^\d+$/.test(value)) {
      setReps(value === '' ? 0 : parseInt(value, 10))
    }
  }, [])

  const startEditingWeight = useCallback(() => {
    setIsEditingWeight(true)
    setTimeout(() => weightInputRef.current?.focus(), 0)
  }, [])

  const startEditingReps = useCallback(() => {
    setIsEditingReps(true)
    setTimeout(() => repsInputRef.current?.focus(), 0)
  }, [])

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 transition-all',
        set.completed
          ? 'border-success/50 bg-success/10'
          : 'border-border bg-secondary/30'
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
        {setNumber}
      </div>

      <div className="flex flex-1 items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleWeightDecrease}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div
            className={cn(
              'w-20 text-center cursor-pointer rounded px-2 py-1 transition-colors',
              isEditingWeight ? 'bg-background' : 'hover:bg-secondary/50'
            )}
            onClick={startEditingWeight}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startEditingWeight();
              }
            }}
            role="button"
            tabIndex={0}
          >
            {isEditingWeight ? (
              <input
                ref={weightInputRef}
                className="w-full text-lg font-bold text-center outline-none"
                onBlur={handleWeightBlur}
                onChange={handleWeightChange}
                onKeyDown={handleWeightKeyDown}
                type="text"
                value={weight}
                inputMode="numeric"
                pattern="[0-9]*"
              />
            ) : (
              <>
                <span className="text-lg font-bold">{weight}</span>
                <span className="text-xs text-muted-foreground ml-0.5">{weightUnit}</span>
              </>
            )}
          </div>
          <button
            onClick={handleWeightIncrease}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRepsDecrease}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div
            className={cn(
              'w-16 text-center cursor-pointer rounded px-2 py-1 transition-colors',
              isEditingReps ? 'bg-background' : 'hover:bg-secondary/50'
            )}
            onClick={startEditingReps}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startEditingReps();
              }
            }}
            role="button"
            tabIndex={0}
          >
            {isEditingReps ? (
              <input
                ref={repsInputRef}
                className="w-full text-lg font-bold text-center outline-none"
                onBlur={handleRepsBlur}
                onChange={handleRepsChange}
                onKeyDown={handleRepsKeyDown}
                type="text"
                value={reps}
                inputMode="numeric"
                pattern="[0-9]*"
              />
            ) : (
              <>
                <span className="text-lg font-bold">{reps}</span>
                <span className="text-xs text-muted-foreground ml-0.5">reps</span>
              </>
            )}
          </div>
          <button
            onClick={handleRepsIncrease}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Button
        size="icon"
        variant={set.completed ? 'default' : 'outline'}
        onClick={handleComplete}
        className={cn(
          'h-10 w-10 rounded-full',
          set.completed && 'bg-success hover:bg-success/90 text-success-foreground'
        )}
      >
        <Check className="h-5 w-5" />
      </Button>
    </div>
  )
}
