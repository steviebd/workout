import { useQuery } from '@tanstack/react-query';
import { createFileRoute, redirect, useParams, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { useCallback, useState } from 'react';
import { useAuth } from './__root';
import type { Exercise } from '~/lib/db/exercise/types';
import { getSession } from '~/lib/auth';
import { Button, Card, CardContent } from '~/components/ui';
import { PageLayout } from '~/components/ui/PageLayout';
import { useDateFormat } from '@/lib/context/UserPreferencesContext';
import { useToast } from '@/components/app/ToastProvider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/AlertDialog';

const getSessionServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const request = await getRequest();
  const session = await getSession(request);
  return session?.sub ? { sub: session.sub, email: session.email } : null;
});

function ExerciseDetail() {
  const { id } = useParams({ from: '/exercises/$id' });
  const auth = useAuth();
  const toast = useToast();
  const { formatDateLong } = useDateFormat();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const exerciseId = id;

  const { data: exercise, isLoading, error } = useQuery<Exercise | null>({
    queryKey: ['exercise', exerciseId],
    queryFn: async () => {
      const response = await fetch(`/api/exercises/${exerciseId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to load exercise');
      }
      return response.json();
    },
    enabled: !!auth.user,
  });

  const handleDelete = useCallback(async () => {
    setDeleting(true);

    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        void navigate({ to: '/exercises' });
      } else {
        toast.error('Failed to delete exercise');
      }
    } catch {
      toast.error('Failed to delete exercise');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [exerciseId, toast, navigate]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading exercise...</p>
      </div>
    );
  }

  if (error) {
    return (
      <PageLayout title="Error">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  if (!exercise) {
    return (
      <PageLayout title="Exercise Not Found">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-muted-foreground">The exercise you're looking for doesn't exist or has been deleted.</p>
            <a className="text-primary hover:text-primary/80 inline-block" href="/exercises">
              ← Back to Exercises
            </a>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={exercise.name}
      action={
        <div className="flex gap-3">
          <Button variant="outline" asChild={true}>
            <a href={`/exercises/${exercise.id}/edit`}>Edit</a>
          </Button>
          <Button variant="destructive" disabled={deleting} onClick={handleDeleteClick}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      }
    >
      <Card>
        <CardContent className="pt-6 space-y-4">
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
                {formatDateLong(exercise.createdAt ?? '')}
              </p>
            </div>
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Last Updated</span>
              <p className="text-foreground text-sm">
                {formatDateLong(exercise.updatedAt ?? '')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exercise</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this exercise? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}

export const Route = createFileRoute('/exercises/$id')({
  loader: async () => {
    const session = await getSessionServerFn();
    if (!session?.sub) throw redirect({ to: '/auth/signin' }); // eslint-disable-line @typescript-eslint/only-throw-error
  },
  component: ExerciseDetail,
});
