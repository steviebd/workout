import { useQuery } from '@tanstack/react-query';
import { createFileRoute, redirect, useParams } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { Copy, Dumbbell, Edit, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useAuth } from './__root';
import { Template, TemplateExerciseWithDetails as TemplateExercise } from '@/lib/db/template';
import { getSession } from '~/lib/auth';
import { Button } from '~/components/ui/Button';
import { Card, CardContent } from '~/components/ui/Card';
import { PageLayout, PageLoading } from '~/components/ui/PageLayout';
import { ErrorState } from '@/components/ui/ErrorState';
import { useToast } from '@/components/app/ToastProvider';
import { useDateFormat } from '@/lib/context/UserPreferencesContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/AlertDialog';

const getSessionServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const request = await getRequest();
  const session = await getSession(request);
  return session?.sub ? { sub: session.sub, email: session.email } : null;
});

function TemplateDetail() {
  const params = useParams({ from: '/templates/$id' });
  const auth = useAuth();
  const toast = useToast();
  const { formatDateLong } = useDateFormat();
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const templateId = params.id;

  const { data: templateData, isLoading: templateLoading, error } = useQuery<Template>({
    queryKey: ['template', templateId],
    queryFn: async () => {
      const response = await fetch(`/api/templates/${templateId}`, {
        credentials: 'include',
      });
      if (response.status === 404) throw new Error('NOT_FOUND');
      if (!response.ok) throw new Error('Failed to load template');
      return response.json();
    },
    enabled: !!auth.user,
  });

  const { data: exercisesData = [], isLoading: exercisesLoading } = useQuery<TemplateExercise[]>({
    queryKey: ['template-exercises', templateId],
    queryFn: async () => {
      const response = await fetch(`/api/templates/${templateId}/exercises`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load exercises');
      return response.json();
    },
    enabled: !!auth.user && !!templateData,
  });

  const template = templateData ?? null;
  const exercises = exercisesData;

  const handleCopy = useCallback(async () => {
    setCopying(true);

    try {
      const response = await fetch(`/api/templates/${templateId}/copy`, {
        method: 'POST',
        credentials: 'include',
      });

       if (response.ok) {
          const newTemplate: Template = await response.json();
          window.location.href = `/templates/${newTemplate.id}`;
      } else {
        toast.error('Failed to copy template');
      }
    } catch {
      toast.error('Failed to copy template');
    } finally {
      setCopying(false);
    }
  }, [templateId, toast]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        window.location.href = '/templates';
      } else {
        toast.error('Failed to delete template');
      }
    } catch {
      toast.error('Failed to delete template');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [templateId, toast]);

  const handleCopyClick = useCallback(() => {
    void handleCopy();
  }, [handleCopy]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    void handleDelete();
  }, [handleDelete]);

  if (auth.loading) {
    return (
      <PageLayout title="Loading">
        <PageLoading message="Loading..." />
      </PageLayout>
    );
  }

  if (templateLoading || exercisesLoading) {
    return (
      <PageLayout title="Template">
        <PageLoading message="Loading template..." />
      </PageLayout>
    );
  }

  if (error || !template) {
    return (
      <PageLayout title="Error">
        <ErrorState
          title="Failed to Load Template"
          description={error?.message ?? 'Template not found'}
          onRetry={() => window.location.reload()}
          onGoHome={() => { window.location.href = '/templates' }}
        />
      </PageLayout>
    );
  }

  return (
     <PageLayout
       title={template.name}
       action={
         <div className="flex gap-3">
           <Button variant="outline" size="sm" disabled={copying} onClick={handleCopyClick}>
             <Copy size={18} />
             {copying ? 'Copying...' : 'Copy'}
           </Button>
           <Button variant="outline" size="sm" asChild={true}>
             <a href={`/templates/${template.id}/edit`}>
               <Edit size={18} />
               Edit
             </a>
           </Button>
           <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDeleteClick}>
             <Trash2 size={18} />
             {deleting ? 'Deleting...' : 'Delete'}
           </Button>
         </div>
       }
     >
       <Card className="overflow-hidden">
         <CardContent className="pt-4 space-y-4">
           {template.description ? (
             <div>
               <span className="block text-sm font-medium text-muted-foreground">Description</span>
               <p className="mt-1 text-foreground whitespace-pre-wrap">{template.description}</p>
             </div>
           ) : null}

           {template.notes ? (
             <div>
               <span className="block text-sm font-medium text-muted-foreground">Notes</span>
               <p className="mt-1 text-foreground whitespace-pre-wrap">{template.notes}</p>
             </div>
           ) : null}

           <div>
             <span className="block text-sm font-medium text-muted-foreground mb-3">
               Exercises (
               {exercises.length}
               )
             </span>
             {exercises.length === 0 ? (
               <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                 <Dumbbell className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                 <p className="text-muted-foreground">No exercises in this template</p>
               </div>
             ) : (
               <div className="space-y-2">
                 {exercises.map((te, index) => (
                   <div
                     className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border"
                     key={te.id}
                   >
                     <span className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-sm font-medium rounded">
                       {index + 1}
                     </span>
                     <Dumbbell className="text-muted-foreground" size={18} />
                     <div className="flex-1">
                         <p className="font-medium text-foreground flex items-center gap-2">
                           {te.exercise?.name ?? 'Unknown Exercise'}
                           {te.isAmrap ? (
                             <span className="text-[10px] font-bold px-1.5 py-0.5 bg-warning/20 text-warning rounded">
                               AMRAP
                             </span>
                           ) : null}
                         </p>
                         {te.exercise?.muscleGroup ? <p className="text-sm text-muted-foreground">{te.exercise.muscleGroup}</p> : null}
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>

           <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
             <div>
               <span className="block text-sm font-medium text-muted-foreground">Created</span>
               <p className="mt-1 text-foreground text-sm">
                 {formatDateLong(template.createdAt)}
               </p>
             </div>
             <div>
               <span className="block text-sm font-medium text-muted-foreground">Last Updated</span>
               <p className="mt-1 text-foreground text-sm">
                 {formatDateLong(template.updatedAt)}
               </p>
             </div>
           </div>
         </CardContent>
       </Card>

       <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Delete Template</AlertDialogTitle>
             <AlertDialogDescription>
               Are you sure you want to delete this template? This action cannot be undone.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={handleConfirmDelete} disabled={deleting}>
               {deleting ? 'Deleting...' : 'Delete'}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </PageLayout>
   );
}

export const Route = createFileRoute('/templates/$id')({
  loader: async () => {
    const session = await getSessionServerFn();
    if (!session?.sub) throw redirect({ to: '/auth/signin' }); // eslint-disable-line @typescript-eslint/only-throw-error
  },
  component: TemplateDetail,
});
