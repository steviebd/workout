/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-use-before-define, @typescript-eslint/no-floating-promises */
import { createFileRoute, Link } from '@tanstack/react-router';
import { Calendar, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { EmptyExercises } from '@/components/EmptyState';
import { SkeletonList } from '@/components/LoadingSpinner';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Badge } from '~/components/ui/Badge';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  createdAt: string;
}

function Exercises() {
  const auth = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleCreateExercise = useCallback(() => {
    window.location.href = '/exercises/new';
  }, []);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      fetchExercises();
    }
  }, [auth.loading, auth.user]);

  async function fetchExercises() {
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
  }

  if (auth.loading || redirecting) {
    return (
      <div className={'min-h-screen flex items-center justify-center bg-background'}>
        <p className={'text-muted-foreground'}>{'Redirecting to sign in...'}</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Exercises</h1>
          <Button asChild={true} size="sm">
            <a href="/exercises/new">
              <Plus className="h-4 w-4 mr-1" />
              New
            </a>
          </Button>
        </div>

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

        {loading ? (
          <SkeletonList count={6} />
        ) : exercises.length === 0 ? (
          <EmptyExercises
            searchActive={!!search}
            onCreate={handleCreateExercise}
          />
        ) : (
          <div className="space-y-3">
            {exercises.map((exercise) => (
              <Link key={exercise.id} to="/exercises/$id" params={{ id: exercise.id }}>
                <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold line-clamp-1">{exercise.name}</h3>
                    {exercise.muscleGroup ? <Badge variant="secondary">{exercise.muscleGroup}</Badge> : null}
                  </div>
                  {exercise.description ? <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{exercise.description}</p> : null}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="mr-1 h-3 w-3" />
                      {new Date(exercise.createdAt).toLocaleDateString()}
                    </div>
                    <span className="text-xs text-primary font-medium">View Details</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
    </main>
  );
}

export const Route = createFileRoute('/exercises/_index')({
  component: Exercises,
});
