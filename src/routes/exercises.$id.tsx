import { createFileRoute, useParams } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { Button, Card, CardContent } from '~/components/ui';
import { useDateFormat } from '@/lib/context/DateFormatContext';
import { useToast } from '@/components/ToastProvider';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

function ExerciseDetail() {
  const { id } = useParams({ from: '/exercises/$id' });
  const auth = useAuth();
  const toast = useToast();
  const { formatDateLong } = useDateFormat();
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const exerciseId = id;

  useEffect(() => {
    async function fetchExercise() {
      if (!auth.user) return;

      try {
        const response = await fetch(`/api/exercises/${exerciseId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) {
            setExercise(null);
            setError(null);
          } else {
            setError('Failed to load exercise');
          }
          return;
        }

        const data = await response.json() as Exercise;
        setExercise(data);
        setError(null);
      } catch {
        setError('Failed to load exercise');
      } finally {
        setLoading(false);
      }
    }

    if (!auth.loading && auth.user) {
      void fetchExercise();
    } else if (!auth.loading && !auth.user) {
      setLoading(false);
    }
  }, [auth.loading, auth.user, exerciseId]);

   const handleDelete = useCallback(async () => {
     // eslint-disable-next-line no-alert
     if (!confirm('Are you sure you want to delete this exercise?')) {
       return;
     }

     setDeleting(true);

     try {
       const response = await fetch(`/api/exercises/${exerciseId}`, {
         method: 'DELETE',
         credentials: 'include',
       });

       if (response.ok) {
         window.location.href = '/exercises';
       } else {
         toast.error('Failed to delete exercise');
       }
     } catch {
       toast.error('Failed to delete exercise');
     } finally {
       setDeleting(false);
     }
   }, [exerciseId, toast]);

   const handleDeleteClick = useCallback(() => {
     void handleDelete();
   }, [handleDelete]);

   useEffect(() => {
     if (!auth.loading && !auth.user) {
       window.location.href = '/auth/signin';
     }
   }, [auth.loading, auth.user]);



  if (auth.loading || (!auth.user && !auth.loading)) {
    return (
	<div className="min-h-screen flex items-center justify-center">
		<p className="text-muted-foreground">Loading...</p>
	</div>
    );
  }

  if (loading) {
    return (
	<div className="min-h-screen flex items-center justify-center">
		<p className="text-muted-foreground">Loading exercise...</p>
	</div>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!exercise) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Exercise Not Found</h1>
            <p className="text-muted-foreground">The exercise you're looking for doesn't exist or has been deleted.</p>
            <a className="text-primary hover:text-primary/80 inline-block" href="/exercises">
              ← Back to Exercises
            </a>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <a className="text-primary hover:text-primary/80 text-sm" href="/exercises">
          ← Back to Exercises
        </a>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-foreground">{exercise.name}</h1>
            <div className="flex space-x-3">
              <Button variant="outline" asChild={true}>
                <a href={`/exercises/${exercise.id}/edit`}>
                  Edit
                </a>
              </Button>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={handleDeleteClick}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>

          {exercise.muscleGroup ? (
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Muscle Group</span>
              <p className="text-foreground">{exercise.muscleGroup}</p>
            </div>
          ) : null}

          {exercise.description ? (
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Description</span>
              <p className="text-foreground whitespace-pre-wrap">{exercise.description}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Created</span>
              <p className="text-foreground text-sm">
                {formatDateLong(exercise.createdAt)}
              </p>
            </div>
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Last Updated</span>
              <p className="text-foreground text-sm">
                {formatDateLong(exercise.updatedAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export const Route = createFileRoute('/exercises/$id')({
  component: ExerciseDetail,
});
