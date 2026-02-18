import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Card } from '~/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/Select';
import { MUSCLE_GROUPS } from '~/lib/constants/exercise';
import { useToast } from '@/components/app/ToastProvider';

export interface ExerciseFormProps {
  onCancel: () => void;
  onSuccess: (id: string) => void;
}

export function ExerciseForm({ onCancel, onSuccess }: ExerciseFormProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string; muscleGroup?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!name.trim()) {
      setErrors({ name: 'Name is required' });
      return;
    }
    if (!muscleGroup) {
      setErrors({ muscleGroup: 'Muscle group is required' });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          muscleGroup,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const data: { message?: string } = await response.json();
        throw new Error(data.message ?? 'Failed to create exercise');
      }

      const data: { id: string } = await response.json();
      toast.success('Exercise created successfully!');
      setTimeout(() => {
        onSuccess(data.id);
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Create Exercise</h2>
        <Button variant="ghost" size="icon-sm" onClick={onCancel}>
          <X size={18} />
        </Button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(e); }} className="space-y-4">
        <div>
          <label htmlFor="exercise-name" className="block text-sm font-medium mb-1">Name *</label>
          <Input
            id="exercise-name"
            autoFocus={true}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Exercise name"
          />
          {errors.name ? <p className="text-sm text-destructive mt-1">{errors.name}</p> : null}
        </div>

        <div>
          <label htmlFor="muscle-group" className="block text-sm font-medium mb-1">Muscle Group *</label>
          <Select value={muscleGroup} onValueChange={setMuscleGroup}>
            <SelectTrigger id="muscle-group" className="w-full px-3 py-2 border border-input rounded-lg bg-background">
              <SelectValue placeholder="Select muscle group" />
            </SelectTrigger>
            <SelectContent>
              {MUSCLE_GROUPS.map(mg => (
                <SelectItem key={mg} value={mg}>{mg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.muscleGroup ? <p className="text-sm text-destructive mt-1">{errors.muscleGroup}</p> : null}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
          <textarea
            id="description"
            className="w-full px-3 py-2 border border-input rounded-lg bg-background resize-none"
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Creating...
              </>
            ) : (
              <>
                <Plus size={16} />
                Create
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
