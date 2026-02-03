import { Dumbbell } from 'lucide-react';

interface BodyweightExerciseRowProps {
  name: string;
  sets: number;
  reps: number | string;
  targetWeight: number;
  addedWeight: number;
  isRequired: boolean;
  unit: 'kg' | 'lb';
  onUpdateAddedWeight: (weight: number) => void;
}

export function BodyweightExerciseRow({
  name,
  sets,
  reps,
  addedWeight,
  isRequired,
  unit,
  onUpdateAddedWeight,
}: BodyweightExerciseRowProps) {
  const totalWeight = addedWeight;

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
      <div className="flex-shrink-0">
        <Dumbbell className="w-5 h-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{name}</span>
          {!isRequired && (
            <span className="flex-shrink-0 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              Optional
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {sets} × {typeof reps === 'string' ? reps : `${reps} reps`}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">+</span>
        <input
          type="number"
          className="w-20 px-2 py-1 text-right border rounded bg-background"
          value={addedWeight || ''}
          onChange={(e) => onUpdateAddedWeight(parseFloat(e.target.value) || 0)}
          placeholder="0"
          min="0"
          step="2.5"
        />
        <span className="text-sm text-muted-foreground w-8">{unit}</span>
      </div>

      <div className="flex-shrink-0 w-20 text-right font-mono font-medium">
        {totalWeight} {unit}
      </div>
    </div>
  );
}
