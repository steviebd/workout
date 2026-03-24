import { ExerciseItem, ExerciseItemProps } from './ExerciseItem';

export interface ExerciseListSimpleProps {
  exercises: ExerciseItemProps[];
}

export function ExerciseListSimple({ exercises }: ExerciseListSimpleProps) {
  return (
    <div className="space-y-3">
      {exercises.map((exercise) => (
        <ExerciseItem key={exercise.id} {...exercise} />
      ))}
    </div>
  );
}
