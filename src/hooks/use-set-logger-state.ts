'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface UseSetLoggerStateOptions {
  initialWeight: number
  initialReps: number
}

function sanitizeReps(value: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return 5
  }
  return Math.max(0, Math.round(value))
}

export function useSetLoggerState({ initialWeight, initialReps }: UseSetLoggerStateOptions) {
  const [weight, setWeight] = useState(initialWeight)
  const [reps, setReps] = useState(() => sanitizeReps(initialReps))
  const [isEditingWeight, setIsEditingWeight] = useState(false)
  const [isEditingReps, setIsEditingReps] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startX = useRef<number | null>(null)
  const weightInputRef = useRef<HTMLInputElement>(null)
  const repsInputRef = useRef<HTMLInputElement>(null)

  const adjustWeight = useCallback((delta: number) => {
    setWeight(prev => Math.max(0, prev + delta))
  }, [])

  const adjustReps = useCallback((delta: number) => {
    setReps(prev => Math.max(0, prev + delta))
  }, [])

  const handleWeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWeight(value === '' ? 0 : parseFloat(value))
    }
  }, [])

  const handleRepsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || /^\d+$/.test(value)) {
      setReps(value === '' ? 0 : parseInt(value, 10))
    }
  }, [])

  const handleWeightKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      weightInputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setWeight(initialWeight)
      setIsEditingWeight(false)
    }
  }, [initialWeight])

  const handleRepsKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      repsInputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setReps(initialReps)
      setIsEditingReps(false)
    }
  }, [initialReps])

  const startEditingWeight = useCallback(() => {
    setIsEditingWeight(true)
    setTimeout(() => weightInputRef.current?.focus(), 0)
  }, [])

  const startEditingReps = useCallback(() => {
    setIsEditingReps(true)
    setTimeout(() => repsInputRef.current?.focus(), 0)
  }, [])

  const handleWeightBlur = useCallback(() => {
    setIsEditingWeight(false)
  }, [])

  const handleRepsBlur = useCallback(() => {
    setIsEditingReps(false)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      if (isEditingWeight || isEditingReps) return
      startX.current = e.touches[0].clientX
      setIsSwiping(true)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (startX.current === null) return
      const currentX = e.touches[0].clientX
      const diff = currentX - startX.current
      if (diff > 0 && diff < 100) {
        setSwipeOffset(diff)
      }
    }

    const handleTouchEnd = () => {
      if (startX.current === null) return
      setSwipeOffset(0)
      setIsSwiping(false)
      startX.current = null
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isEditingWeight, isEditingReps])

  return {
    weight,
    reps,
    isEditingWeight,
    isEditingReps,
    swipeOffset,
    isSwiping,
    containerRef,
    weightInputRef: weightInputRef as React.RefObject<HTMLInputElement>,
    repsInputRef: repsInputRef as React.RefObject<HTMLInputElement>,
    adjustWeight,
    adjustReps,
    setWeight,
    setReps,
    setIsEditingWeight,
    setIsEditingReps,
    handleWeightChange,
    handleRepsChange,
    handleWeightKeyDown,
    handleRepsKeyDown,
    startEditingWeight,
    startEditingReps,
    handleWeightBlur,
    handleRepsBlur,
  }
}
