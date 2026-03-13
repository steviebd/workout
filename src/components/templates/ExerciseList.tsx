'use client';

import { X } from 'lucide-react';
import type { TemplateExerciseWithDetails } from '~/lib/db/template/types';

type Exercise = Pick<TemplateExerciseWithDetails, 'id' | 'exerciseId'> & {
  name: string;
  muscleGroup: string | null;
};

interface ExerciseListProps {
  exercises: Exercise[];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (exerciseId: string) => void;
}

export function ExerciseList({
  exercises,
  onMoveUp,
  onMoveDown,
  onRemove,
}: ExerciseListProps) {
  return (
    <div className="space-y-2">
      {exercises.map((exercise, index) => (
        <div
          className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border"
          key={exercise.id}
        >
          <span className="flex items-center justify-center w-6 h-6 bg-primary/20 text-primary text-sm font-medium rounded">
            {index + 1}
          </span>
          <div className="flex-1">
            <p className="font-medium text-foreground">{exercise.name}</p>
            {exercise.muscleGroup ? <p className="text-sm text-muted-foreground">{exercise.muscleGroup}</p> : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              data-direction="up"
              data-index={index}
              disabled={index === 0}
              onClick={() => onMoveUp(index)}
              type="button"
            >
              ↑
            </button>

            <button
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              data-direction="down"
              data-index={index}
              disabled={index === exercises.length - 1}
              onClick={() => onMoveDown(index)}
              type="button"
            >
              ↓
            </button>

            <button
              className="p-1 text-muted-foreground hover:text-red-600"
              data-id={exercise.id}
              onClick={() => onRemove(exercise.exerciseId)}
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
