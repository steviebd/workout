import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { Calendar, Copy, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useAuth } from './__root';
import type { Template } from '~/lib/db/template/types';
import { getSession } from '~/lib/auth';
import { EmptyTemplates } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { InlineError } from '@/components/ui/ErrorState';
import { Card, CardContent } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Badge } from '~/components/ui/Badge';
import { useDateFormat } from '@/lib/context/UserPreferencesContext';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { PageLayout } from '~/components/ui/PageLayout';
import { IconButton } from '~/components/ui/IconButton';

const getSessionServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const request = await getRequest();
  const session = await getSession(request);
  return session?.sub ? { sub: session.sub, email: session.email } : null;
});

type TemplateData = Pick<Template, 'id' | 'name' | 'description' | 'notes' | 'createdAt' | 'updatedAt'> & { exerciseCount: number };

function Templates() {
  const auth = useAuth();
  const { formatDate } = useDateFormat();
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: templatesData, isLoading, refetch } = useQuery<TemplateData[]>({
    queryKey: ['templates', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const response = await fetch(`/api/templates?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
    enabled: !!auth.user,
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(`/api/templates?${params.toString()}`, {
        credentials: 'include',
      });

       if (response.ok) {
         const data = await response.json();
         setTemplates(data as TemplateData[]);
       }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const handleDelete = useCallback(async (templateId: string) => {
    try {
       const response = await fetch(`/api/templates/${templateId}`, {
         method: 'DELETE',
         credentials: 'include',
       });

       if (response.ok) {
         void refetch();
       } else {
         setError('Failed to delete template');
       }
     } catch {
       setError('Failed to delete template');
     }
   }, [refetch]);

   const handleDeleteClick = useCallback((e: React.MouseEvent) => {
     const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
     if (id) {
       void handleDelete(id);
     }
   }, [handleDelete]);

   const handleDuplicate = useCallback(async (templateId: string) => {
     try {
       const response = await fetch(`/api/templates/${templateId}/duplicate`, {
         method: 'POST',
         credentials: 'include',
       });

       if (response.ok) {
         void refetch();
       } else {
         setError('Failed to duplicate template');
       }
     } catch {
       setError('Failed to duplicate template');
     }
   }, [refetch]);

   const handleDuplicateClick = useCallback((e: React.MouseEvent) => {
     const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
     if (id) {
       void handleDuplicate(id);
     }
   }, [handleDuplicate]);

   const handleCreateTemplate = useCallback(() => {
     window.location.href = '/templates/new';
   }, []);

   if (auth.loading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <p className="text-muted-foreground">Loading...</p>
       </div>
     );
   }

   const displayTemplates = templatesData ?? templates;

  return (
    <>
      {error ? (
        <div className="px-4 pt-4">
          <InlineError message={error} onRetry={() => void refetch()} onDismiss={() => setError(null)} />
        </div>
      ) : null}
      <PageLayout
        title="Templates"
        action={
          <Button asChild={true} size="sm">
            <Link to="/templates/new">
              <Plus className="h-4 w-4 mr-1" />
              New
            </Link>
          </Button>
        }
      >
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10"
              onChange={handleSearchChange}
              placeholder="Search templates..."
              type="text"
              value={search}
            />
          </div>
        </div>

        <PullToRefresh onRefresh={fetchTemplates}>
          {isLoading || loading ? (
            <SkeletonList count={4} />
          ) : displayTemplates.length === 0 ? (
            <EmptyTemplates onCreate={handleCreateTemplate} />
          ) : (
            <div className="space-y-4">
              {displayTemplates.map((template) => (
                <Card key={template.id} className="overflow-hidden touch-manipulation">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Link
                        className="text-base font-semibold hover:text-primary"
                        to="/templates/$id"
                        params={{ id: template.id }}
                      >
                        {template.name}
                      </Link>
                      <Badge variant="secondary">
                        {template.exerciseCount} exercises
                      </Badge>
                    </div>
                    {template.description ? <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{template.description}</p> : null}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="mr-1 h-3 w-3" />
                        {formatDate(template.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <IconButton
                          icon={Copy}
                          label="Duplicate template"
                          variant="ghost"
                          size="sm"
                          data-id={template.id}
                          onClick={handleDuplicateClick}
                        />
                        <Link to="/templates/$id/edit" params={{ id: template.id }}>
                          <IconButton
                            icon={Edit}
                            label="Edit template"
                            variant="ghost"
                            size="sm"
                          />
                        </Link>
                        <IconButton
                          icon={Trash2}
                          label="Delete template"
                          variant="ghost"
                          size="sm"
                          data-id={template.id}
                          onClick={handleDeleteClick}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </PullToRefresh>
      </PageLayout>
    </>
  );
}

export const Route = createFileRoute('/templates/_index')({
  loader: async () => {
    const session = await getSessionServerFn();
    if (!session?.sub) throw redirect({ to: '/auth/signin' }); // eslint-disable-line @typescript-eslint/only-throw-error
  },
  component: Templates,
});
