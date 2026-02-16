import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { EmptyExercises } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Button } from '~/components/ui/Button';
import { PullToRefresh } from '@/components/PullToRefresh';
import { PageLayout } from '~/components/ui/PageLayout';
import { ExerciseList, ExerciseSearch, ExerciseForm } from '@/components/exercises';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  createdAt: string;
}

function Exercises() {
  const auth = useAuth();
  const [redirecting] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

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

  const handleCreateClick = useCallback(() => {
    setShowCreateForm(true);
  }, []);

  const handleCancelCreate = useCallback(() => {
    setShowCreateForm(false);
  }, []);

  const handleCreateSuccess = useCallback((id: string) => {
    window.location.href = `/exercises/${id}`;
  }, []);

  if (auth.loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to sign in...</p>
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

      <ExerciseSearch value={search} onChange={setSearch} />

      <PullToRefresh onRefresh={fetchExercises}>
        {loading ? (
          <SkeletonList count={6} />
        ) : exercises.length === 0 ? (
          <EmptyExercises onCreate={handleCreateClick} />
        ) : (
          <ExerciseList exercises={exercises} />
        )}
      </PullToRefresh>
    </PageLayout>
  );
}

export const Route = createFileRoute('/exercises/_index')({
  component: Exercises,
});
