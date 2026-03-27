import { useQuery } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useAuth } from './__root';
import type { Exercise } from '~/lib/db/exercise/types';
import { getSession } from '~/lib/auth';
import { EmptyExercises } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Button } from '~/components/ui/Button';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { PageLayout } from '~/components/ui/PageLayout';
import { ExerciseListSimple, ExerciseSearchSimple, ExerciseForm, ExerciseItemProps } from '@/components/exercises';

const getSessionServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const request = await getRequest();
  const session = await getSession(request);
  return session?.sub ? { sub: session.sub, email: session.email } : null;
});

function Exercises() {
  const auth = useAuth();
  const [exercises, setExercises] = useState<ExerciseItemProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: exercisesData, isLoading } = useQuery({
    queryKey: ['exercises', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const response = await fetch(`/api/exercises?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch exercises');
      return response.json() as Promise<Exercise[]>;
    },
    enabled: !!auth.user,
  });

  const handleCreateClick = useCallback(() => {
    setShowCreateForm(true);
  }, []);

  const handleCancelCreate = useCallback(() => {
    setShowCreateForm(false);
  }, []);

  const handleCreateSuccess = useCallback((id: string) => {
    window.location.href = `/exercises/${id}`;
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!auth.loading && auth.user) {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        const response = await fetch(`/api/exercises?${params.toString()}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data: Exercise[] = await response.json();
          setExercises(data.map(e => ({
            id: e.id,
            name: e.name,
            muscleGroup: e.muscleGroup,
            description: e.description,
            createdAt: e.createdAt ?? '',
          })));
        }
      } catch (error) {
        console.error('Failed to fetch exercises:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [auth.loading, auth.user, search]);

  if (exercisesData) {
    const mapped = exercisesData.map(e => ({
      id: e.id,
      name: e.name,
      muscleGroup: e.muscleGroup,
      description: e.description,
      createdAt: e.createdAt ?? '',
    }));
    if (JSON.stringify(mapped) !== JSON.stringify(exercises)) {
      setExercises(mapped);
    }
  }

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <PageLayout
      title="Exercises"
      action={
        !showCreateForm ? (
          <Button onClick={handleCreateClick} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        ) : null
      }
    >
      {showCreateForm ? (
        <ExerciseForm onCancel={handleCancelCreate} onSuccess={handleCreateSuccess} />
      ) : null}

      <ExerciseSearchSimple value={search} onChange={setSearch} />

      <PullToRefresh onRefresh={handleRefresh}>
        {isLoading || loading ? (
          <SkeletonList count={6} />
        ) : exercises.length === 0 ? (
          <EmptyExercises onCreate={handleCreateClick} />
        ) : (
          <ExerciseListSimple exercises={exercises} />
        )}
      </PullToRefresh>
    </PageLayout>
  );
}

export const Route = createFileRoute('/exercises/_index')({
  loader: async () => {
    const session = await getSessionServerFn();
    if (!session?.sub) throw redirect({ to: '/auth/signin' }); // eslint-disable-line @typescript-eslint/only-throw-error
  },
  component: Exercises,
});
