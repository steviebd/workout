/* eslint-disable no-alert */
import { createFileRoute, useParams } from '@tanstack/react-router';
import { Copy, Dumbbell, Edit, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { Template, TemplateExerciseWithDetails as TemplateExercise } from '@/lib/db/template';
import { Button } from '~/components/ui/Button';
import { Card, CardContent } from '~/components/ui/Card';
import { PageLayout, PageLoading } from '~/components/ui/PageLayout';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDateFormat } from '@/lib/context/DateFormatContext';

function TemplateDetail() {
  const params = useParams({ from: '/templates/$id' });
  const auth = useAuth();
  const { formatDateLong } = useDateFormat();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<Template | null>(null);
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const templateId = params.id;

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
        alert('Failed to copy template');
      }
    } catch {
      alert('Failed to copy template');
    } finally {
      setCopying(false);
    }
  }, [templateId]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        window.location.href = '/templates';
      } else {
        alert('Failed to delete template');
      }
    } catch {
      alert('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  }, [templateId]);

  const handleCopyClick = useCallback(() => {
    void handleCopy();
  }, [handleCopy]);

  const handleDeleteClick = useCallback(() => {
    void handleDelete();
  }, [handleDelete]);

  useEffect(() => {
    async function fetchTemplate() {
      if (!auth.user) return;

      try {
        const [templateResponse, exercisesResponse] = await Promise.all([
          fetch(`/api/templates/${templateId}`, {
            credentials: 'include',
          }),
          fetch(`/api/templates/${templateId}/exercises`, {
            credentials: 'include',
          }),
        ]);

        if (!templateResponse.ok) {
          if (templateResponse.status === 404) {
            setTemplate(null);
            setExercises([]);
            setError(null);
          } else {
            setError('Failed to load template');
          }
          return;
        }

        const templateData: Template = await templateResponse.json();
        setTemplate(templateData);
        setError(null);

        if (exercisesResponse.ok) {
          const exercisesData: TemplateExercise[] = await exercisesResponse.json();
          setExercises(exercisesData);
        }
      } catch {
        setError('Failed to load template');
      } finally {
        setLoading(false);
      }
    }

    if (!auth.loading && auth.user) {
      void fetchTemplate();
    } else if (!auth.loading && !auth.user) {
      setLoading(false);
    }
   }, [auth.loading, auth.user, templateId]);

   useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

   if (auth.loading || !auth.user) {
    return (
      <PageLayout title="Loading">
        <PageLoading message="Loading..." />
      </PageLayout>
    );
  }

   if (loading) {
    return (
      <PageLayout title="Template">
        <PageLoading message="Loading template..." />
      </PageLayout>
    );
  }

   if (error) {
    return (
      <PageLayout title="Error">
        <ErrorState
          title="Failed to Load Template"
          description={error}
          onRetry={() => window.location.reload()}
          onGoHome={() => { window.location.href = '/templates' }}
        />
      </PageLayout>
    );
  }

   if (!template) {
    return (
      <PageLayout title="Template Not Found">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">
              The template you're looking for doesn't exist or has been deleted.
            </p>
            <a className="text-primary hover:text-primary/80" href="/templates">
              ← Back to Templates
            </a>
          </CardContent>
        </Card>
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
     </PageLayout>
    );
  }

export const Route = createFileRoute('/templates/$id')({
  component: TemplateDetail,
});
