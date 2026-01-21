import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronRight, Dumbbell, Plus, FileText, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { Button } from '~/components/ui/Button';
import { Spinner } from '~/components/ui/Spinner';
import { Card } from '~/components/ui/Card';
import { Input } from '~/components/ui/Input';

interface Template {
  id: string;
  name: string;
  description: string | null;
  exerciseCount: number;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
}

function WorkoutsPage() {
  const auth = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates', {
        credentials: 'include',
      });

      if (response.ok) {
        const data: Template[] = await response.json();
        setTemplates(data);
      } else {
        setError('Failed to load templates');
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExercises = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (exerciseSearch) params.set('search', exerciseSearch);
      
      const response = await fetch(`/api/exercises?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data: Exercise[] = await response.json();
        setExercises(data);
      }
    } catch (err) {
      console.error('Failed to fetch exercises:', err);
    }
  }, [exerciseSearch]);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.href = '/auth/signin';
      return;
    }

    if (auth.user) {
      void fetchTemplates();
      void fetchExercises();
    }
  }, [auth.loading, auth.user, fetchTemplates, fetchExercises]);

  useEffect(() => {
    if (auth.user) {
      const delayDebounceFn = setTimeout(() => {
        void fetchExercises();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [exerciseSearch, auth.user, fetchExercises]);

  const handleExerciseSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExerciseSearch(e.target.value);
  }, []);

  if (auth.loading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive p-4">{error}</div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Workouts</h1>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Templates</h2>
            <Button asChild={true} variant="outline">
              <Link to="/templates/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Link>
            </Button>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No templates yet</p>
              <Button asChild={true}>
                <Link to="/templates/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Template
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <Link
                  key={template.id}
                  to="/workouts/start/$templateId"
                  params={{ templateId: template.id }}
                  className="block"
                >
                  <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Dumbbell className="h-3 w-3" />
                            {template.exerciseCount} {template.exerciseCount === 1 ? 'exercise' : 'exercises'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Exercises</h2>
            <Button asChild={true} variant="outline" size="sm">
              <Link to="/exercises/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Exercise
              </Link>
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10"
              onChange={handleExerciseSearchChange}
              placeholder="Search exercises..."
              type="text"
              value={exerciseSearch}
            />
          </div>

          {exercises.length === 0 ? (
            <div className="text-center py-8 bg-card border border-border rounded-lg">
              <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No exercises found</p>
              <Button asChild={true} size="sm">
                <Link to="/exercises/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Exercise
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {exercises.slice(0, 6).map((exercise) => (
                <Link
                  key={exercise.id}
                  to="/exercises/$id"
                  params={{ id: exercise.id }}
                >
                  <Card className="p-3 hover:border-primary/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{exercise.name}</h3>
                        {exercise.muscleGroup ? (
                          <p className="text-xs text-muted-foreground">{exercise.muscleGroup}</p>
                        ) : null}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              ))}
              {exercises.length > 6 && (
                <Button asChild={true} variant="ghost" className="w-full">
                  <Link to="/exercises">
                    View all {exercises.length} exercises
                  </Link>
                </Button>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Create Your Own</h2>
          <Button asChild={true} className="w-full">
            <Link to="/workouts/new">
              <Plus className="h-4 w-4 mr-2" />
              Build Custom Workout
            </Link>
          </Button>
        </section>
    </main>
  );
}

export const Route = createFileRoute('/workouts/_index')({
  component: WorkoutsPage,
});
