'use client'

import { useState, useRef, useCallback } from 'react'
import { Check, Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/Button'
import { cn } from '~/lib/cn'
import { useUnit } from '@/lib/context/UserPreferencesContext'

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
  onDelete?: () => void
}

function sanitizeReps(value: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return 5
  }
  return Math.max(0, Math.round(value))
}

export function SetLogger({ setNumber, set, onUpdate, onDelete }: SetLoggerProps) {
  const { weightUnit } = useUnit()
  const [weight, setWeight] = useState(set.weight)
  const [reps, setReps] = useState(() => sanitizeReps(set.reps))
  const [isEditingWeight, setIsEditingWeight] = useState(false)
  const [isEditingReps, setIsEditingReps] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startX = useRef<number | null>(null)
  const weightInputRef = useRef<HTMLInputElement>(null)
  const repsInputRef = useRef<HTMLInputElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isEditingWeight || isEditingReps) return;
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, [isEditingWeight, isEditingReps]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startX.current === null || !isSwiping) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    if (diff > 0 && diff < 100) {
      setSwipeOffset(diff);
    }
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (startX.current === null) return;

    if (swipeOffset >= 50) {
      onUpdate({
        ...set,
        weight,
        reps,
        completed: !set.completed,
      });
    }

    setSwipeOffset(0);
    setIsSwiping(false);
    startX.current = null;
  }, [swipeOffset, set, weight, reps, onUpdate]);

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

  const handleRepsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || /^\d+$/.test(value)) {
      setReps(value === '' ? 0 : parseInt(value, 10))
    }
  }, [])

  const handleRepsDecrease = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    adjustReps(-1)
  }, [adjustReps])

  const handleRepsIncrease = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
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
      ref={containerRef}
      className={cn(
        'rounded-xl border p-2 sm:p-3 transition-all relative overflow-hidden',
        set.completed
          ? 'border-success/50 bg-gradient-to-br from-success/14 to-transparent'
          : 'border-border/70 bg-surface-1/40',
        isSwiping && 'cursor-grab active:cursor-grabbing'
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${Math.min(swipeOffset * 0.5, 60)}px)`,
        transition: isSwiping ? 'none' : undefined,
        touchAction: 'pan-y',
      }}
    >
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold shrink-0">
          {setNumber}
        </div>

        <div className="flex items-end gap-0.5 sm:gap-1">
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleWeightDecrease}
              className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-secondary/70 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-95"
              aria-label="Decrease weight"
            >
              <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <div
              className={cn(
                'w-11 sm:w-14 text-center cursor-pointer rounded-lg px-1.5 py-1.5 sm:px-2 sm:py-2 transition-colors h-8 sm:h-10 flex items-center justify-center bg-background/70 border border-border/70',
                isEditingWeight ? 'ring-2 ring-primary' : 'hover:bg-secondary/50'
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
              aria-label="Edit weight"
            >
              {isEditingWeight ? (
                <input
                  ref={weightInputRef}
                  className="w-full text-xs sm:text-sm font-bold text-center outline-none bg-transparent"
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
                  <span className="text-xs sm:text-sm font-bold">{weight}</span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground ml-0.5">{weightUnit}</span>
                </>
              )}
            </div>
            <button
              onClick={handleWeightIncrease}
              className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-secondary/70 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-95"
              aria-label="Increase weight"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>

          <span className="text-muted-foreground font-bold text-xs sm:text-lg mb-0.5">×</span>

          <div className="flex items-center gap-0.5">
            <button
              onClick={handleRepsDecrease}
              className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-secondary/70 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-95"
              aria-label="Decrease reps"
            >
              <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <div
              className={cn(
                'w-9 sm:w-12 text-center cursor-pointer rounded-lg px-1.5 py-1.5 sm:px-2 sm:py-2 transition-colors h-8 sm:h-10 flex items-center justify-center bg-background/70 border border-border/70',
                isEditingReps ? 'ring-2 ring-primary' : 'hover:bg-secondary/50'
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
              aria-label="Edit reps"
            >
              {isEditingReps ? (
                <input
                  ref={repsInputRef}
                  className="w-full text-xs sm:text-sm font-bold text-center outline-none bg-transparent"
                  onBlur={handleRepsBlur}
                  onChange={handleRepsChange}
                  onKeyDown={handleRepsKeyDown}
                  type="text"
                  value={reps}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              ) : (
                <span className="text-xs sm:text-sm font-bold">{reps}</span>
              )}
            </div>
            <button
              onClick={handleRepsIncrease}
              className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-secondary/70 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-95"
              aria-label="Increase reps"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>

        <Button
          size="icon"
          variant={set.completed ? 'default' : 'outline'}
          onClick={() => {
            onUpdate({
              ...set,
              weight,
              reps,
              completed: !set.completed,
            })
          }}
          className={cn(
            'h-8 w-8 sm:h-10 sm:w-10 rounded-full',
            set.completed && 'bg-success hover:bg-success/90 text-success-foreground'
          )}
        >
          <Check className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {onDelete ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label="Delete set"
          >
            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
