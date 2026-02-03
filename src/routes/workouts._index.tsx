import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronRight, Dumbbell, Plus, Search, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { Button } from '~/components/ui/Button';
import { Card, CardContent } from '~/components/ui/Card';
import { Input } from '~/components/ui/Input';
import { PullToRefresh } from '@/components/PullToRefresh';
import { EmptyTemplates, EmptyExercises } from '@/components/ui/EmptyState';

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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activePrograms, setActivePrograms] = useState<ProgramCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [exerciseSearch, setExerciseSearch] = useState('');

  const fetchAllData = useCallback(async () => {
    if (!auth.user) return;

    try {
      setLoading(true);
      const [templatesRes, exercisesRes, programsRes] = await Promise.all([
        fetch('/api/templates', { credentials: 'include' }),
        fetch(`/api/exercises?${exerciseSearch ? `search=${encodeURIComponent(exerciseSearch)}` : ''}`, { credentials: 'include' }),
        fetch('/api/program-cycles?active=true', { credentials: 'include' }),
      ]);

      if (templatesRes.ok) {
        const data: Template[] = await templatesRes.json();
        setTemplates(data);
      }

      if (exercisesRes.ok) {
        const data: Exercise[] = await exercisesRes.json();
        setExercises(data);
      }

      if (programsRes.ok) {
        const data: ProgramCycle[] = await programsRes.json();
        setActivePrograms(data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [auth.user, exerciseSearch]);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.href = '/auth/signin';
      return;
    }

    if (auth.user) {
      void fetchAllData();
    }
  }, [auth.loading, auth.user, fetchAllData]);

  useEffect(() => {
    if (auth.user) {
      const delayDebounceFn = setTimeout(() => {
        void fetchAllData();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [exerciseSearch, auth.user, fetchAllData]);

  const handleExerciseSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExerciseSearch(e.target.value);
  }, []);

  if (auth.loading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
            <div className="relative w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          </div>
          <p className="text-muted-foreground">Loading your workouts...</p>
        </div>
      </div>
    );
  }

  const refreshAll = async () => {
    await fetchAllData();
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-6 touch-pan-y" style={{ touchAction: 'pan-y' }}>
        <h1 className="text-2xl font-bold mb-6">Workouts</h1>

        <PullToRefresh onRefresh={refreshAll}>
          {activePrograms.length > 0 ? (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Active Programs</h2>
              </div>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Templates</h2>
              <Button asChild={true} variant="outline" size="sm">
                <Link to="/templates/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Link>
              </Button>
            </div>

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
    </main>
  );
}

export const Route = createFileRoute('/workouts/_index')({
  component: WorkoutsPage,
});
