import type { WorkoutExerciseWithDetails } from '~/lib/db/workout/types';
import { cn } from '~/lib/cn';
import { useUnit } from '@/lib/context/UserPreferencesContext';

interface ExerciseSummaryProps {
  exercises: WorkoutExerciseWithDetails[];
}

function SetTag({ set, formatWeight }: { set: { id: string; weight: number | null | undefined; reps: number | null | undefined; isComplete: boolean | null }; formatWeight: (w: number) => string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded text-sm',
        set.isComplete
          ? 'bg-success/20 text-success'
          : 'bg-secondary text-muted-foreground'
      )}
    >
      {set.weight ? <span>{formatWeight(set.weight)}</span> : null}
      {set.weight && set.reps ? <span>×</span> : null}
      {set.reps ? <span>{set.reps}</span> : null}
    </span>
  );
}

function ExerciseItem({ exercise, formatWeight }: { exercise: WorkoutExerciseWithDetails; formatWeight: (w: number) => string }) {
  const completedSets = exercise.sets.filter((s) => s.isComplete).length;
  const totalSets = exercise.sets.length;

  return (
    <div className="border-b border-border last:border-0 pb-4 last:pb-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-medium text-foreground">{exercise.exercise?.name ?? 'Unknown'}</p>
          {exercise.exercise?.muscleGroup ? <p className="text-sm text-muted-foreground">{exercise.exercise.muscleGroup}</p> : null}
        </div>
        <span className="text-sm text-muted-foreground">
          {completedSets}/{totalSets} sets
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {exercise.sets.map((set) => (
          <SetTag key={set.id} set={set} formatWeight={formatWeight} />
        ))}
      </div>
    </div>
  );
}

export function ExerciseSummary({ exercises }: ExerciseSummaryProps) {
  const { formatWeight } = useUnit();

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Exercise Summary</h2>
      <div className="space-y-4">
        {exercises.map((exercise) => (
          <ExerciseItem key={exercise.id} exercise={exercise} formatWeight={formatWeight} />
        ))}
      </div>
    </div>
  );
}
