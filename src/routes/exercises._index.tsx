import { createFileRoute, Link } from '@tanstack/react-router';
import { Calendar, Plus, Search, X, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { EmptyExercises } from '@/components/EmptyState';
import { SkeletonList } from '@/components/LoadingSpinner';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Badge } from '~/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/Select';
import { useDateFormat } from '@/lib/context/DateFormatContext';
import { useToast } from '@/components/ToastProvider';
import { PullToRefresh } from '@/components/PullToRefresh';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  createdAt: string;
}

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Core', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Full Body', 'Cardio', 'Other'
] as const;

function Exercises() {
  const auth = useAuth();
  const toast = useToast();
  const { formatDate } = useDateFormat();
  const [redirecting] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', muscleGroup: '', description: '' });
  const [errors, setErrors] = useState<{ name?: string; muscleGroup?: string }>({});

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleCreateClick = useCallback(() => {
    setShowCreateForm(true);
  }, []);

  const handleCancelCreate = useCallback(() => {
    setShowCreateForm(false);
    setNewExercise({ name: '', muscleGroup: '', description: '' });
    setErrors({});
  }, []);

  const handleCreateExercise = useCallback(async (e: React.FormEvent) => {
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
      setTimeout(() => {
        window.location.href = `/exercises/${data.id}`;
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  }, [newExercise, toast]);

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(`/api/exercises?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setExercises(data as Exercise[]);
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      void fetchExercises();
    }
  }, [auth.loading, auth.user, fetchExercises]);

  if (auth.loading || redirecting) {
    return (
      <div className={'min-h-screen flex items-center justify-center bg-background'}>
        <p className={'text-muted-foreground'}>{'Redirecting to sign in...'}</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6 touch-pan-y" style={{ touchAction: 'pan-y' }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Exercises</h1>
          {!showCreateForm && (
            <Button onClick={handleCreateClick} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          )}
        </div>

        {showCreateForm ? <Card className="p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create Exercise</h2>
              <Button variant="ghost" size="icon-sm" onClick={handleCancelCreate}>
                <X size={18} />
              </Button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); void handleCreateExercise(e); }} className="space-y-4">
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
                <Select value={newExercise.muscleGroup} onValueChange={value => setNewExercise(prev => ({ ...prev, muscleGroup: value }))}>
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
                  value={newExercise.description}
                  onChange={e => setNewExercise(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCancelCreate} className="flex-1">
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
                          </Card> : null}

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10"
              onChange={handleSearchChange}
              placeholder="Search exercises..."
              type="text"
              value={search}
            />
          </div>
        </div>

        <PullToRefresh onRefresh={fetchExercises}>
          {loading ? (
            <SkeletonList count={6} />
          ) : exercises.length === 0 ? (
            <EmptyExercises
              searchActive={!!search}
              onCreate={handleCreateClick}
            />
          ) : (
            <div className="space-y-3">
              {exercises.map((exercise) => (
                <Link key={exercise.id} to="/exercises/$id" params={{ id: exercise.id }}>
                  <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer touch-manipulation">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold line-clamp-1">{exercise.name}</h3>
                      {exercise.muscleGroup ? <Badge variant="secondary">{exercise.muscleGroup}</Badge> : null}
                    </div>
                    {exercise.description ? <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{exercise.description}</p> : null}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="mr-1 h-3 w-3" />
                        {formatDate(exercise.createdAt)}
                      </div>
                      <span className="text-xs text-primary font-medium">View Details</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </PullToRefresh>
    </main>
  );
}

export const Route = createFileRoute('/exercises/_index')({
  component: Exercises,
});
