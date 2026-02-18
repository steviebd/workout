import { ExerciseItem, ExerciseItemProps } from './ExerciseItem';

export interface ExerciseListProps {
  exercises: ExerciseItemProps[];
}

export function ExerciseList({ exercises }: ExerciseListProps) {
  return (
    <div className="space-y-3">
      {exercises.map((exercise) => (
        <ExerciseItem key={exercise.id} {...exercise} />
      ))}
    </div>
  );
}
