import { BodyweightExerciseRow } from './BodyweightExerciseRow';
import type { WorkoutAccessory } from '@/lib/programs/types';

interface AccessorySectionProps {
  accessories: WorkoutAccessory[];
  unit: 'kg' | 'lb';
  onUpdateAddedWeight: (accessoryId: string, weight: number) => void;
}

export function AccessorySection({
  accessories,
  unit,
  onUpdateAddedWeight,
}: AccessorySectionProps) {
  const required = accessories.filter((a) => a.isRequired);
  const optional = accessories.filter((a) => !a.isRequired);

  return (
    <div className="space-y-4">
      {required.length > 0 && (
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            Required Accessories
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              {required.length}
            </span>
          </h3>
          <div className="space-y-2">
            {required.map((accessory) => (
              <BodyweightExerciseRow
                key={accessory.accessoryId}
                name={accessory.name}
                sets={accessory.sets}
                reps={accessory.reps}
                targetWeight={accessory.targetWeight}
                addedWeight={accessory.addedWeight}
                isRequired={accessory.isRequired}
                unit={unit}
                onUpdateAddedWeight={(weight) => onUpdateAddedWeight(accessory.accessoryId, weight)}
              />
            ))}
          </div>
        </div>
      )}

      {optional.length > 0 && (
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            Optional Accessories
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {optional.length}
            </span>
          </h3>
          <div className="space-y-2">
            {optional.map((accessory) => (
              <BodyweightExerciseRow
                key={accessory.accessoryId}
                name={accessory.name}
                sets={accessory.sets}
                reps={accessory.reps}
                targetWeight={accessory.targetWeight}
                addedWeight={accessory.addedWeight}
                isRequired={accessory.isRequired}
                unit={unit}
                onUpdateAddedWeight={(weight) => onUpdateAddedWeight(accessory.accessoryId, weight)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
