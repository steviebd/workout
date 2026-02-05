import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronRight, Dumbbell, Plus, Search, Trophy } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useAuth } from './__root';
import { Button } from '~/components/ui/Button';
import { Card, CardContent } from '~/components/ui/Card';
import { Input } from '~/components/ui/Input';
import { PullToRefresh } from '@/components/PullToRefresh';
import { EmptyTemplates, EmptyExercises } from '@/components/ui/EmptyState';
import { SkeletonWorkoutsPage } from '~/components/ui/Skeleton';
import { PageLayout } from '~/components/ui/PageLayout';
import { SectionHeader } from '~/components/ui/SectionHeader';

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

interface ProgramCycle {
  id: string;
  name: string;
  programSlug: string;
  currentWeek: number | null;
  currentSession: number | null;
  totalSessionsCompleted: number;
  totalSessionsPlanned: number;
  status: string | null;
  isComplete: boolean;
}

function WorkoutsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [exerciseSearch, setExerciseSearch] = useState('');

  const { data: templates = [], isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
    enabled: !!auth.user,
  });

  const { data: exercises = [], isLoading: exercisesLoading } = useQuery<Exercise[]>({
    queryKey: ['exercises', exerciseSearch],
    queryFn: async () => {
      const url = exerciseSearch
        ? `/api/exercises?search=${encodeURIComponent(exerciseSearch)}`
        : '/api/exercises';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch exercises');
      return res.json();
    },
    enabled: !!auth.user,
    staleTime: 30 * 1000,
  });

  const { data: activePrograms = [], isLoading: programsLoading } = useQuery<ProgramCycle[]>({
    queryKey: ['program-cycles', 'active'],
    queryFn: async () => {
      const res = await fetch('/api/program-cycles?active=true', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch programs');
      return res.json();
    },
    enabled: !!auth.user,
  });

  const loading = auth.loading || templatesLoading || exercisesLoading || programsLoading;

  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['templates'] });
    await queryClient.invalidateQueries({ queryKey: ['exercises'] });
    await queryClient.invalidateQueries({ queryKey: ['program-cycles', 'active'] });
  }, [queryClient]);

  const handleExerciseSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExerciseSearch(e.target.value);
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6 touch-pan-y" style={{ touchAction: 'pan-y' }}>
        <SkeletonWorkoutsPage />
      </main>
    );
  }

  return (
    <PageLayout title="Workouts">
      <PullToRefresh onRefresh={refreshAll}>
          {activePrograms.length > 0 ? (
            <section className="mb-8">
              <SectionHeader title="Active Programs" />
              <div className="space-y-3">
                {activePrograms.map((program) => (
                  <Link
                    key={program.id}
                    to="/programs/cycle/$cycleId"
                    params={{ cycleId: program.id }}
                    className="block"
                  >
                    <Card className="hover:border-primary/50 transition-colors touch-manipulation">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                              <Trophy className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{program.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Week {program.currentWeek ?? 1} • Session {(program.totalSessionsCompleted ?? 0) + 1} of {program.totalSessionsPlanned}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mb-8">
            <SectionHeader
              title="Your Templates"
              action={
                <Button asChild={true} variant="outline" size="sm">
                  <Link to="/templates/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Link>
                </Button>
              }
            />

            {templates.length === 0 ? (
              <EmptyTemplates
                onCreate={() => { window.location.href = '/templates/new'; }}
              />
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <Link
                    key={template.id}
                    to="/workouts/start/$templateId"
                    params={{ templateId: template.id }}
                    className="block"
                  >
                    <Card className="hover:border-primary/50 transition-colors touch-manipulation">
                      <CardContent className="p-4">
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
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mb-8">
            <SectionHeader
              title="Your Exercises"
              action={
                <Button asChild={true} variant="outline" size="sm">
                  <Link to="/exercises/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Exercise
                  </Link>
                </Button>
              }
            />

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
              <EmptyExercises onCreate={() => { window.location.href = '/exercises/new'; }} />
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {exercises.slice(0, 6).map((exercise) => (
                  <Link
                    key={exercise.id}
                    to="/exercises/$id"
                    params={{ id: exercise.id }}
                  >
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer touch-manipulation">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{exercise.name}</h3>
                            {exercise.muscleGroup ? (
                              <p className="text-xs text-muted-foreground">{exercise.muscleGroup}</p>
                            ) : null}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
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
            <h2 className="text-lg font-semibold mb-4">Create Your Own Workout</h2>
            <Button asChild={true} className="w-full">
              <Link to="/workouts">
                <Plus className="h-4 w-4 mr-2" />
                Build Custom Workout
              </Link>
            </Button>
          </section>
      </PullToRefresh>
    </PageLayout>
  );
}

export const Route = createFileRoute('/workouts/_index')({
  component: WorkoutsPage,
});
