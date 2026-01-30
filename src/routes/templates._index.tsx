/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { createFileRoute, Link } from '@tanstack/react-router';
import { Calendar, Copy, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { EmptyTemplates } from '@/components/EmptyState';
import { SkeletonList } from '@/components/LoadingSpinner';
import { Card, CardContent } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Badge } from '~/components/ui/Badge';
import { useDateFormat } from '@/lib/context/DateFormatContext';

type Template = {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  exerciseCount: number;
  createdAt: string;
  updatedAt: string;
}

function Templates() {
  const auth = useAuth();
  const { formatDate } = useDateFormat();
  const [redirecting, setRedirecting] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

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
         setTemplates(data as Template[]);
       }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      void fetchTemplates();
    }
  }, [auth.loading, auth.user, fetchTemplates]);


     const handleDelete = useCallback(async (templateId: string) => {
       try {
         const response = await fetch(`/api/templates/${templateId}`, {
           method: 'DELETE',
           credentials: 'include',
         });

         if (response.ok) {
           void fetchTemplates();
         } else {
           setError('Failed to delete template');
         }
       } catch {
         setError('Failed to delete template');
       }
     }, [fetchTemplates]);

    const handleDeleteClick = useCallback((e: React.MouseEvent) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) {
        void handleDelete(id);
      }
    }, [handleDelete]);

    const handleCreateTemplate = useCallback(() => {
      window.location.href = '/templates/new';
    }, []);


  if (auth.loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <>
      {error ? <div className="text-destructive px-4 pt-4">{error}</div> : null}
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Templates</h1>
          <Button asChild={true} size="sm">
            <Link to="/templates/new">
              <Plus className="h-4 w-4 mr-1" />
              New
            </Link>
          </Button>
        </div>

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

        {loading ? (
          <SkeletonList count={4} />
        ) : templates.length === 0 ? (
          <EmptyTemplates
            searchActive={!!search}
            onCreate={handleCreateTemplate}
          />
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <Card key={template.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Link
                      className="font-semibold hover:text-primary"
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
                      <button
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        data-id={template.id}
                        onClick={handleDeleteClick}
                        title="Delete template"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <Link
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        to="/templates/$id/edit"
                        params={{ id: template.id }}
                        title="Edit template"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        data-id={template.id}
                        onClick={handleDeleteClick}
                        title="Delete template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

    </>
  );
}

export const Route = createFileRoute('/templates/_index')({
  component: Templates,
});
