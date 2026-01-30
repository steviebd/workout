import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Plus, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from './__root';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { useToast } from '@/components/ToastProvider';

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Core', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Full Body', 'Cardio', 'Other'
] as const;

function NewExercise() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', muscleGroup: '', description: '' });
  const [errors, setErrors] = useState<{ name?: string; muscleGroup?: string }>({});

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!newExercise.name.trim()) {
      setErrors({ name: 'Name is required' });
      return;
    }
    if (!newExercise.muscleGroup) {
      setErrors({ muscleGroup: 'Muscle group is required' });
      return;
    }

    setCreating(true);

    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newExercise.name,
          muscleGroup: newExercise.muscleGroup,
          description: newExercise.description || undefined,
        }),
      });

      if (!response.ok) {
        const data: { message?: string } = await response.json();
        throw new Error(data.message ?? 'Failed to create exercise');
      }

      const data: { id: string } = await response.json();
      toast.success('Exercise created successfully!');
      void navigate({ to: '/exercises/$id', params: { id: data.id } });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!auth.user) {
    return null;
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Create Exercise</h1>
          <Button variant="ghost" size="icon-sm" onClick={() => void navigate({ to: '/exercises' })}>
            <X size={18} />
          </Button>
        </div>

        <form onSubmit={void handleCreateExercise} className="space-y-4">
          <div>
            <label htmlFor="exercise-name" className="block text-sm font-medium mb-1">Name *</label>
            <Input
              id="exercise-name"
              autoFocus={true}
              value={newExercise.name}
              onChange={e => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Exercise name"
            />
            {errors.name ? <p className="text-sm text-destructive mt-1">{errors.name}</p> : null}
          </div>

          <div>
            <label htmlFor="muscle-group" className="block text-sm font-medium mb-1">Muscle Group *</label>
            <select
              id="muscle-group"
              className="w-full px-3 py-2 border border-input rounded-lg bg-background"
              value={newExercise.muscleGroup}
              onChange={e => setNewExercise(prev => ({ ...prev, muscleGroup: e.target.value }))}
            >
              <option value="">Select muscle group</option>
              {MUSCLE_GROUPS.map(mg => (
                <option key={mg} value={mg}>{mg}</option>
              ))}
            </select>
            {errors.muscleGroup ? <p className="text-sm text-destructive mt-1">{errors.muscleGroup}</p> : null}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
            <textarea
              id="description"
              className="w-full px-3 py-2 border border-input rounded-lg bg-background resize-none"
              rows={3}
              value={newExercise.description}
              onChange={e => setNewExercise(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void navigate({ to: '/exercises' })} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={creating} className="flex-1">
              {creating ? (
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
    </main>
  );
}

export const Route = createFileRoute('/exercises/new')({
  component: NewExercise,
});
