import { Search } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';

export interface ExerciseSelectorProps<T extends { id: string; name: string }> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: T[];
  selectedExerciseIds?: string[];
  onAddExercise: (exercise: T) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function ExerciseSelector<T extends { id: string; name: string; muscleGroup?: string | null }>({
  open,
  onOpenChange,
  exercises,
  selectedExerciseIds,
  onAddExercise,
  searchValue,
  onSearchChange,
}: ExerciseSelectorProps<T>) {
  const selectedIds = selectedExerciseIds ?? [];
  const filteredExercises = exercises.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(searchValue.toLowerCase()) &&
      !selectedIds.includes(exercise.id)
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add Exercise</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              autoFocus={true}
              className="pl-10"
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search exercises..."
              type="text"
              value={searchValue}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {filteredExercises.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No exercises found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExercises.map((exercise) => (
                <button
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-colors"
                  data-id={exercise.id}
                  key={exercise.id}
                  onClick={() => onAddExercise(exercise)}
                >
                  <div>
                    <h3 className="font-medium text-foreground">{exercise.name}</h3>
                    {exercise.muscleGroup ? (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-primary bg-primary/10 rounded-full">
                        {exercise.muscleGroup}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
