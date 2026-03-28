import { useCallback, useState } from 'react'
import { Check, Minus, Plus, Trash2 } from 'lucide-react'
import type { WorkoutSet } from '~/lib/db/workout/types'
import { Button } from '~/components/ui/Button'
import { cn } from '~/lib/cn'
import { useUnit } from '@/lib/context/UserPreferencesContext'
import { useSetLoggerState } from '~/hooks/use-set-logger-state'

type SetLoggerSet = Pick<WorkoutSet, 'id'> & { reps: number; weight: number; completed: boolean }

interface SetLoggerProps {
  setNumber: number
  set: SetLoggerSet
  onUpdate: (set: SetLoggerSet) => void
  onDelete?: () => void
}

interface WeightInputProps {
  weight: number
  weightInputValue: string
  weightUnit: string
  isEditing: boolean
  onDecrease: () => void
  onIncrease: () => void
  onStartEditing: () => void
  onBlur: () => void
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  inputRef: React.RefObject<HTMLInputElement>
}

function WeightInput({
  weight,
  weightInputValue,
  weightUnit,
  isEditing,
  onDecrease,
  onIncrease,
  onStartEditing,
  onBlur,
  onChange,
  onKeyDown,
  inputRef,
}: WeightInputProps) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onDecrease}
        className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-secondary/70 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-95"
        aria-label="Decrease weight"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div
        className={cn(
          'flex-1 min-w-16 sm:min-w-20 text-center cursor-pointer rounded-lg px-1.5 py-1.5 sm:px-2 sm:py-2 transition-colors h-8 sm:h-10 flex items-center justify-center bg-background/70 border border-border/70',
          isEditing ? 'ring-2 ring-primary' : 'hover:bg-secondary/50'
        )}
        onClick={onStartEditing}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onStartEditing();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Edit weight"
      >
        {isEditing ? (
          <input
            ref={inputRef}
            className="w-full text-xs sm:text-sm font-bold text-center outline-none bg-transparent"
            onBlur={onBlur}
            onChange={onChange}
            onKeyDown={onKeyDown}
            type="text"
            value={weightInputValue}
            inputMode="decimal"
          />
        ) : (
          <>
            <span className="text-xs sm:text-sm font-bold">{weight}</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground ml-0.5">{weightUnit}</span>
          </>
        )}
      </div>
      <button
        onClick={onIncrease}
        className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-secondary/70 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-95"
        aria-label="Increase weight"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

interface RepsInputProps {
  reps: number
  isEditing: boolean
  onDecrease: (e: React.MouseEvent) => void
  onIncrease: (e: React.MouseEvent) => void
  onStartEditing: () => void
  onBlur: () => void
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  inputRef: React.RefObject<HTMLInputElement>
}

function RepsInput({
  reps,
  isEditing,
  onDecrease,
  onIncrease,
  onStartEditing,
  onBlur,
  onChange,
  onKeyDown,
  inputRef,
}: RepsInputProps) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onDecrease}
        className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-secondary/70 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-95"
        aria-label="Decrease reps"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div
        className={cn(
          'w-9 sm:w-12 text-center cursor-pointer rounded-lg px-1.5 py-1.5 sm:px-2 sm:py-2 transition-colors h-8 sm:h-10 flex items-center justify-center bg-background/70 border border-border/70',
          isEditing ? 'ring-2 ring-primary' : 'hover:bg-secondary/50'
        )}
        onClick={onStartEditing}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onStartEditing();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Edit reps"
      >
        {isEditing ? (
          <input
            ref={inputRef}
            className="w-full text-xs sm:text-sm font-bold text-center outline-none bg-transparent"
            onBlur={onBlur}
            onChange={onChange}
            onKeyDown={onKeyDown}
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
        onClick={onIncrease}
        className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-secondary/70 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-95"
        aria-label="Increase reps"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

export function SetLogger({ setNumber, set, onUpdate, onDelete }: SetLoggerProps) {
  const { weightUnit } = useUnit()

  const {
    weight,
    weightInput,
    reps,
    isEditingWeight,
    isEditingReps,
    swipeOffset,
    isSwiping,
    containerRef,
    weightInputRef,
    repsInputRef,
    adjustWeight,
    adjustReps,
    setWeight,
    handleWeightChange,
    handleRepsChange,
    handleWeightKeyDown,
    handleRepsKeyDown,
    startEditingWeight,
    startEditingReps,
    handleWeightBlur,
    handleRepsBlur,
  } = useSetLoggerState({
    initialWeight: set.weight,
    initialReps: set.reps,
  })

  const [localCompleted, setLocalCompleted] = useState(set.completed)

  const handleWeightDecrease = useCallback(() => {
    adjustWeight(-2.5)
  }, [adjustWeight])

  const handleWeightIncrease = useCallback(() => {
    adjustWeight(2.5)
  }, [adjustWeight])

  const handleRepsDecrease = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    adjustReps(-1)
  }, [adjustReps])

  const handleRepsIncrease = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    adjustReps(1)
  }, [adjustReps])

  const handleWeightBlurWrapper = useCallback(() => {
    handleWeightBlur()
    onUpdate({
      ...set,
      weight,
      reps,
      completed: localCompleted,
    })
  }, [handleWeightBlur, onUpdate, set, weight, reps, localCompleted])

  const handleRepsBlurWrapper = useCallback(() => {
    handleRepsBlur()
    onUpdate({
      ...set,
      weight,
      reps,
      completed: localCompleted,
    })
  }, [handleRepsBlur, onUpdate, set, weight, reps, localCompleted])

  const handleToggleComplete = useCallback(() => {
    const newCompleted = !localCompleted
    setLocalCompleted(newCompleted)
    onUpdate({
      ...set,
      weight,
      reps,
      completed: newCompleted,
    })
  }, [onUpdate, set, weight, reps, localCompleted])

  const handleCompleteWithSwipe = useCallback(() => {
    const newCompleted = !localCompleted
    setLocalCompleted(newCompleted)
    onUpdate({
      ...set,
      weight,
      reps,
      completed: newCompleted,
    })
  }, [onUpdate, set, weight, reps, localCompleted])

  const swipeHandlers = isSwiping ? {} : {
    onTouchStart: (e: React.TouchEvent) => {
      if (isEditingWeight || isEditingReps) return;
      const startX = e.touches[0].clientX;
      let currentX = startX;
      
      const handleTouchMove = (moveEvent: TouchEvent) => {
        currentX = moveEvent.touches[0].clientX;
        const diff = currentX - startX;
        if (diff > 0 && diff < 100) {
          setWeight(diff);
        }
      };

      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        
        const finalDiff = currentX - startX;
        if (finalDiff >= 50) {
          handleCompleteWithSwipe();
        }
        setWeight(0);
      };

      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    },
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'rounded-xl border p-2 sm:p-3 transition-all relative',
        set.completed
          ? 'border-success/50 bg-gradient-to-br from-success/14 to-transparent'
          : 'border-border/70 bg-surface-1/40',
        isSwiping && 'cursor-grab active:cursor-grabbing'
      )}
      style={{
        transform: `translateX(${Math.min(swipeOffset * 0.5, 60)}px)`,
        transition: isSwiping ? 'none' : undefined,
        touchAction: 'pan-y',
      }}
      {...swipeHandlers}
    >
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold shrink-0">
            {setNumber}
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 flex-1 min-w-0 justify-center">
            <WeightInput
              weight={weight}
              weightInputValue={weightInput}
              weightUnit={weightUnit}
              isEditing={isEditingWeight}
              onDecrease={handleWeightDecrease}
              onIncrease={handleWeightIncrease}
              onStartEditing={startEditingWeight}
              onBlur={handleWeightBlurWrapper}
              onChange={handleWeightChange}
              onKeyDown={handleWeightKeyDown}
              inputRef={weightInputRef}
            />

            <span className="text-muted-foreground font-bold text-xs sm:text-lg shrink-0">×</span>

            <RepsInput
              reps={reps}
              isEditing={isEditingReps}
              onDecrease={handleRepsDecrease}
              onIncrease={handleRepsIncrease}
              onStartEditing={startEditingReps}
              onBlur={handleRepsBlurWrapper}
              onChange={handleRepsChange}
              onKeyDown={handleRepsKeyDown}
              inputRef={repsInputRef}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 w-full">
          <Button
            size="icon"
            variant={set.completed ? 'default' : 'outline'}
            onClick={handleToggleComplete}
            className={cn(
              'shadow-sm hover:shadow-md transition-all duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 h-10 sm:h-12 flex-[2]',
              set.completed && 'bg-success hover:bg-success/90 text-success-foreground'
            )}
          >
            <Check className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>

          {onDelete ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              className="h-8 sm:h-9 shadow-sm hover:shadow-md transition-all duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-[1]"
              aria-label="Delete set"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
