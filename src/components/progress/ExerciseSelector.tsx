'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/Select'

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
  const selectedExercise = exercises.find(e => e.id === selectedId)

  return (
    <Select value={selectedId} onValueChange={onSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select exercise">
          {selectedExercise?.name ?? 'Select exercise'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {exercises.map(exercise => (
          <SelectItem key={exercise.id} value={exercise.id}>
            {exercise.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
