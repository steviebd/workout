import { useState, useCallback } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
}

interface InlineEditExerciseProps {
  exercise: Exercise;
  onSave: (updates: Partial<Exercise>) => void;
  onCancel: () => void;
}

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Core', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Full Body', 'Cardio', 'Other'
] as const;

export function InlineEditExercise({
  exercise,
  onSave,
  onCancel,
}: InlineEditExerciseProps) {
  const [name, setName] = useState(exercise.name);
  const [muscleGroup, setMuscleGroup] = useState(exercise.muscleGroup ?? '');
  const [description, setDescription] = useState(exercise.description ?? '');
  const [errors, setErrors] = useState<{ name?: string; muscleGroup?: string }>({});

  const validate = useCallback(() => {
    const newErrors: { name?: string; muscleGroup?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!muscleGroup) {
      newErrors.muscleGroup = 'Muscle group is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, muscleGroup]);

  const handleSave = useCallback(() => {
    if (!validate()) return;

    onSave({
      name: name.trim(),
      muscleGroup,
      description: description.trim() || undefined,
    });
  }, [name, muscleGroup, description, validate, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [handleSave, onCancel]);

  return (
    <div className="p-4 bg-secondary rounded-lg border border-primary animate-in fade-in">
      <div className="space-y-3">
        <div>
          <label htmlFor="inline-edit-name" className="block text-sm font-medium mb-1">Name *</label>
          <Input
            id="inline-edit-name"
            autoFocus={true}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Exercise name"
          />
          {errors.name !== null && errors.name !== undefined && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="inline-edit-muscle-group" className="block text-sm font-medium mb-1">Muscle Group *</label>
          <select
            id="inline-edit-muscle-group"
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
            value={muscleGroup}
            onChange={e => setMuscleGroup(e.target.value)}
          >
            <option value="">Select muscle group</option>
            {MUSCLE_GROUPS.map(mg => (
              <option key={mg} value={mg}>{mg}</option>
            ))}
          </select>
          {errors.muscleGroup !== null && errors.muscleGroup !== undefined && <p className="text-sm text-destructive mt-1">{errors.muscleGroup}</p>}
        </div>

        <div>
          <label htmlFor="inline-edit-description" className="block text-sm font-medium mb-1">Description</label>
          <textarea
            id="inline-edit-description"
            className="w-full px-3 py-2 border border-input rounded-lg bg-background resize-none"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Optional description"
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            type="button"
          >
            <X size={16} className="mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            type="button"
          >
            <Check size={16} className="mr-1" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

interface InlineCreateExerciseProps {
  onCreate: (name: string, muscleGroup: string, description: string) => void;
  onCancel: () => void;
  initialName?: string;
  initialMuscleGroup?: string;
}

export function InlineCreateExercise({
  onCreate,
  onCancel,
  initialName = '',
  initialMuscleGroup = '',
}: InlineCreateExerciseProps) {
  const [name, setName] = useState(initialName);
  const [muscleGroup, setMuscleGroup] = useState(initialMuscleGroup);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string; muscleGroup?: string }>({});

  const validate = useCallback(() => {
    const newErrors: { name?: string; muscleGroup?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!muscleGroup) {
      newErrors.muscleGroup = 'Muscle group is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, muscleGroup]);

  const handleCreate = useCallback(() => {
    if (!validate()) return;

    onCreate(name.trim(), muscleGroup, description.trim());
    setName('');
    setMuscleGroup('');
    setDescription('');
  }, [name, muscleGroup, description, validate, onCreate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [handleCreate, onCancel]);

  return (
    <div className="p-4 bg-secondary rounded-lg border border-primary animate-in fade-in">
      <div className="space-y-3">
        <div>
          <label htmlFor="inline-create-name" className="block text-sm font-medium mb-1">Name *</label>
          <Input
            id="inline-create-name"
            autoFocus={true}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Exercise name"
          />
          {errors.name !== null && errors.name !== undefined && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="inline-create-muscle-group" className="block text-sm font-medium mb-1">Muscle Group *</label>
          <select
            id="inline-create-muscle-group"
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
            value={muscleGroup}
            onChange={e => setMuscleGroup(e.target.value)}
          >
            <option value="">Select muscle group</option>
            {MUSCLE_GROUPS.map(mg => (
              <option key={mg} value={mg}>{mg}</option>
            ))}
          </select>
          {errors.muscleGroup !== null && errors.muscleGroup !== undefined && <p className="text-sm text-destructive mt-1">{errors.muscleGroup}</p>}
        </div>

        <div>
          <label htmlFor="inline-create-description" className="block text-sm font-medium mb-1">Description</label>
          <textarea
            id="inline-create-description"
            className="w-full px-3 py-2 border border-input rounded-lg bg-background resize-none"
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Optional description"
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            type="button"
          >
            <X size={16} className="mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            type="button"
          >
            <Check size={16} className="mr-1" />
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
