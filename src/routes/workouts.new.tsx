import { createFileRoute } from '@tanstack/react-router';
import { ArrowLeft, ChevronRight, Dumbbell, FilePlus, History, Loader2, Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { trackEvent } from '@/lib/posthog';
import { useDateFormat } from '@/lib/context/DateFormatContext';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
}

interface TemplateWithExercises {
  id: string;
  name: string;
  description: string | null;
  exerciseCount: number;
  exercises: TemplateExercise[];
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  exerciseCount: number;
}

interface TemplateExercise {
  exerciseId: string;
  orderIndex?: number;
  name: string;
  muscleGroup: string | null;
}

interface TemplateWithExercises {
  id: string;
  name: string;
  description: string | null;
  exerciseCount: number;
  exercises: TemplateExercise[];
}

interface Workout {
  id: string;
  name: string;
  startedAt: string;
  completedAt?: string;
}



type StartMode = 'blank' | 'recent' | 'templates';

function NewWorkout() {
  const auth = useAuth();
  const { formatDate } = useDateFormat();
  const [redirecting, _setRedirecting] = useState(false);
  const [mode, setMode] = useState<StartMode>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('');

    const _handleAddExercise = useCallback((exercise: Exercise) => {
     console.log('handleAddExercise called:', exercise);
     if (!selectedExercises.some((se) => se.id === exercise.id)) {
       console.log('Adding exercise to selectedExercises');
       setSelectedExercises([...selectedExercises, exercise]);
     } else {
       console.log('Exercise already in selectedExercises');
     }
     console.log('Closing modal, current selectedExercises:', selectedExercises);
     setShowExerciseSelector(false);
     setExerciseSearch('');
   }, [selectedExercises]);

    const handleRemoveExercise = useCallback((exerciseId: string) => {
     setSelectedExercises(selectedExercises.filter((e) => e.id !== exerciseId));
   }, [selectedExercises]);

    const _handleStartWorkout = useCallback(async () => {
     if (!workoutName.trim()) {
       setError('Workout name is required');
       return;
     }

     if (selectedExercises.length === 0) {
       setError('Add at least one exercise to the workout');
       return;
     }

     setStarting(true);

      try {
        const res = await fetch('/api/workouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: workoutName,
            exerciseIds: selectedExercises.map((e) => e.id),
            templateId: selectedTemplate?.id,
          }),
        });

        if (res.ok) {
          const workout: Workout = await res.json();
          void trackEvent('workout_started', {
            workout_id: workout.id,
            workout_name: workout.name,
            exercise_count: selectedExercises.length,
            from_template: !!selectedTemplate,
            template_id: selectedTemplate?.id,
          });
          window.location.href = `/workouts/${workout.id}`;
        }
     } catch (err) {
       console.error('Failed to start workout:', err);
       setError('Failed to start workout');
     } finally {
       setStarting(false);
     }
      }, [workoutName, selectedExercises, selectedTemplate]);








   useEffect(() => {
     window.addEventListener('error', (e) => {
       console.error('Window error:', e.error);
     });
   }, []);

   async function _fetchData() {
     try {
       setLoading(true);

       const [templatesRes, exercisesRes] = await Promise.all([
         fetch('/api/templates', { credentials: 'include' }),
         fetch('/api/exercises', { credentials: 'include' }),
       ]);

         if (templatesRes.ok) {
           const data: Template[] = await templatesRes.json();
           setTemplates(data);
         }

         if (exercisesRes.ok) {
           const data: Exercise[] = await exercisesRes.json();
           setExercises(data);
         }

       const historyRes = await fetch('/api/workouts?sortBy=startedAt&sortOrder=DESC&limit=5', {
         credentials: 'include',
       });

         if (historyRes.ok) {
           const data: Workout[] = await historyRes.json();
           setRecentWorkouts(data);
         }
     } catch (err) {
       console.error('Failed to fetch data:', err);
     } finally {
       setLoading(false);
     }
   }

    useEffect(() => {
      if (!auth.loading && auth.user) {
        void _fetchData();
      }
    }, [auth.loading, auth.user]);




    const handleCopyFromRecent = useCallback((workout: Workout) => {
      setMode('blank');
      setWorkoutName(`${workout.name} (Copy)`);
    }, []);

      const handleStartFromTemplate = useCallback(async (template: Template) => {
        setMode('blank');
        setSelectedTemplate(template);
        setWorkoutName(template.name);

        try {
          const res = await fetch(`/api/templates/${template.id}`, {
            credentials: 'include',
          });

          if (res.ok) {
            const data: TemplateWithExercises = await res.json();
            const templateExercises: TemplateExercise[] = data.exercises;
            const exerciseDetails = templateExercises.map((te) => ({
              id: te.exerciseId,
              name: te.name,
              muscleGroup: te.muscleGroup,
            }));
            setSelectedExercises(exerciseDetails);
          }
        } catch (err) {
          console.error('Failed to load template details:', err);
        }
      }, []);

    const _handleStartFromTemplateClick = useCallback((e: React.MouseEvent) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-template-id');
      const template = templates.find(t => t.id === id);
      if (template) {
        void handleStartFromTemplate(template);
      }
    }, [templates, handleStartFromTemplate]);

   const _handleCopyFromRecentClick = useCallback((e: React.MouseEvent) => {
     const id = (e.currentTarget as HTMLElement).getAttribute('data-workout-id');
     const workout = recentWorkouts.find(w => w.id === id);
     if (workout) {
       handleCopyFromRecent(workout);
     }
   }, [recentWorkouts, handleCopyFromRecent]);

   const handleStartBlankClick = useCallback(() => {
     setMode('blank');
   }, []);

   const handleRemoveExerciseClick = useCallback((e: React.MouseEvent) => {
     const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
     if (id) {
       handleRemoveExercise(id);
     }
   }, [handleRemoveExercise]);

    const handleWorkoutNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setWorkoutName(e.target.value);
    }, []);

    const filteredExercises = exercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      (exercise.muscleGroup?.toLowerCase().includes(exerciseSearch.toLowerCase()))
    );

    const handleAddExerciseClick = useCallback(() => {
      setShowExerciseSelector(true);
    }, []);

    const handleCloseExerciseSelector = useCallback(() => {
      setShowExerciseSelector(false);
      setExerciseSearch('');
    }, []);

    const handleExerciseSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setExerciseSearch(e.target.value);
    }, []);

    const handleStartWorkoutWrapper = useCallback(() => {
      void _handleStartWorkout();
    }, [_handleStartWorkout]);

    const handleModeChange = useCallback(() => {
      setMode('templates');
    }, []);

    const handleRemoveExerciseClickShared = useCallback((e: React.MouseEvent) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) {
        handleRemoveExercise(id);
      }
    }, [handleRemoveExercise]);

    const _handleAddExerciseClickShared = useCallback((e: React.MouseEvent) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const exercise = exercises.find((ex) => ex.id === id);
      if (exercise) {
        _handleAddExercise(exercise);
      }
    }, [exercises, _handleAddExercise]);




    if (auth.loading || redirecting) {
      return (
        <main className="mx-auto max-w-lg px-4 py-6">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Redirecting to sign in...</p>
          </div>
        </main>
      );
    }

    if (mode === 'templates') {
      return (
        <main className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-6">
            <a
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              href="/"
            >
              <ArrowLeft size={20} />
              Back to dashboard
            </a>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold">Start Workout</h1>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Dumbbell className="text-primary" size={20} />
                  Start from Template
                </h2>
                <p className="text-muted-foreground mb-4">Choose a pre-built workout template</p>

                {templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No templates yet</p>
                    <a
                      className="text-primary hover:text-primary mt-2 inline-block"
                      href="/templates/new"
                    >
                      Create your first template
                    </a>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {templates.map((templateItem) => (
                      <button
                        className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary transition-colors text-left"
                        data-template-id={templateItem.id}
                        key={templateItem.id}
                        onClick={_handleStartFromTemplateClick}
                      >
                        <div>
                          <p className="font-medium">{templateItem.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {templateItem.exerciseCount} exercises
                            {templateItem.description ? ` • ${templateItem.description}` : null}
                          </p>
                        </div>
                        <ChevronRight className="text-muted-foreground/70" size={20} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <History className="text-primary" size={20} />
                  Copy Recent Workout
                </h2>
                <p className="text-muted-foreground mb-4">Start from one of your recent workouts</p>

                {recentWorkouts.filter((w) => w.completedAt).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No completed workouts yet</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {recentWorkouts
                      .filter((w) => w.completedAt)
                      .map((workoutItem) => (
                        <button
                          className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary transition-colors text-left"
                          data-workout-id={workoutItem.id}
                          key={workoutItem.id}
                          onClick={_handleCopyFromRecentClick}
                        >
                          <div>
                            <p className="font-medium">{workoutItem.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(workoutItem.startedAt)}
                              {workoutItem.completedAt ? ' • Completed' : null}
                            </p>
                          </div>
                          <ChevronRight className="text-muted-foreground/70" size={20} />
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FilePlus className="text-primary" size={20} />
                  Build Your Own
                </h2>
                <p className="text-muted-foreground mb-4">Select exercises to create a custom workout</p>

                {selectedExercises.length === 0 ? (
                  <button
                    className="w-full p-4 border-2 border-dashed border-input rounded-lg text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                    onClick={handleStartBlankClick}
                  >
                    Start with blank workout
                  </button>
                ) : (
                  <div className="space-y-3">
                    {selectedExercises.map((exercise, index) => (
                      <div
                        className="flex items-center gap-3 p-3 bg-secondary rounded-lg"
                        key={exercise.id}
                      >
                        <span className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-sm font-medium rounded">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{exercise.name}</p>
                          {exercise.muscleGroup ? <p className="text-sm text-muted-foreground">{exercise.muscleGroup}</p> : null}
                        </div>
                        <button
                          className="p-1 text-muted-foreground/70 hover:text-destructive"
                          data-id={exercise.id}
                          onClick={handleRemoveExerciseClick}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                    <button
                      className="w-full p-3 border-2 border-dashed border-input rounded-lg text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2"
                      onClick={handleAddExerciseClick}
                    >
                      <Plus size={18} />
                      Add more exercises
                    </button>
                    <button
                      className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:bg-primary/50"
                      disabled={starting}
                      onClick={handleStartWorkoutWrapper}
                    >
                      {starting ? 'Starting...' : 'Start Workout'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {showExerciseSelector ? (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold">Add Exercise</h2>
                  <button
                    className="p-2 text-muted-foreground/70 hover:text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
                    onClick={handleCloseExerciseSelector}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={18} />
                    <input
                      autoFocus={true}
                      className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      onChange={handleExerciseSearchChange}
                      placeholder="Search exercises..."
                      type="text"
                      value={exerciseSearch}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                  ) : filteredExercises.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No exercises found
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredExercises.map((exercise) => (
                        <button
                          className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          data-id={exercise.id}
                          disabled={selectedExercises.some((se) => se.id === exercise.id)}
                          key={exercise.id}
                          onClick={_handleAddExerciseClickShared}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">{exercise.name}</h3>
                              {exercise.muscleGroup ? (
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-primary bg-primary/10 rounded-full">
                                  {exercise.muscleGroup}
                                </span>
                              ) : null}
                            </div>
                            {selectedExercises.some((se) => se.id === exercise.id) ? (
                              <span className="text-green-600 text-sm font-medium">Added</span>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6">
          <button
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleModeChange}
          >
            <ArrowLeft size={20} />
            Back to options
          </button>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h1 className="text-2xl font-bold mb-6">Build Your Workout</h1>

          {error ? (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : null}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="name">
                Workout Name <span className="text-destructive">*</span>
              </label>
              <input
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow"
                id="name"
                onChange={handleWorkoutNameChange}
                placeholder="e.g., Upper Body Workout"
                type="text"
                value={workoutName}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="block text-sm font-medium text-muted-foreground">
                  Exercises <span className="text-destructive">*</span>
                </span>
                <button
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                  onClick={handleAddExerciseClick}
                  type="button"
                >
                  <Plus size={16} />
                  Add Exercise
                </button>
              </div>

              {selectedExercises.length === 0 ? (
                <div className="border-2 border-dashed border-input rounded-lg p-8 text-center">
                  <p className="text-muted-foreground">No exercises added yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Click "Add Exercise" to add exercises to this workout
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedExercises.map((exercise, index) => (
                    <div
                      className="flex items-center gap-3 p-3 bg-secondary rounded-lg"
                      key={exercise.id}
                    >
                      <span className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-sm font-medium rounded">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{exercise.name}</p>
                        {exercise.muscleGroup ? <p className="text-sm text-muted-foreground">{exercise.muscleGroup}</p> : null}
                      </div>
                      <button
                        className="p-1 text-muted-foreground/70 hover:text-destructive"
                        data-id={exercise.id}
                        onClick={handleRemoveExerciseClickShared}
                        type="button"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleModeChange}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:bg-primary/50"
                disabled={starting}
                onClick={handleStartWorkoutWrapper}
              >
                {starting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Starting...
                  </>
                ) : (
                  <>
                    <Dumbbell size={18} />
                    Start Workout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {showExerciseSelector ? (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Add Exercise</h2>
                <button
                  className="p-2 text-muted-foreground/70 hover:text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
                  onClick={handleCloseExerciseSelector}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={18} />
                  <input
                    autoFocus={true}
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    onChange={handleExerciseSearchChange}
                    placeholder="Search exercises..."
                    type="text"
                    value={exerciseSearch}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-primary" size={32} />
                  </div>
                ) : filteredExercises.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No exercises found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredExercises.map((exercise) => (
                      <button
                        className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        data-id={exercise.id}
                        disabled={selectedExercises.some((se) => se.id === exercise.id)}
                        key={exercise.id}
                        onClick={_handleAddExerciseClickShared}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{exercise.name}</h3>
                            {exercise.muscleGroup ? (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-primary bg-primary/10 rounded-full">
                                {exercise.muscleGroup}
                              </span>
                            ) : null}
                          </div>
                          {selectedExercises.some((se) => se.id === exercise.id) ? (
                            <span className="text-green-600 text-sm font-medium">Added</span>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    );
 }

export const Route = createFileRoute('/workouts/new')({
  component: NewWorkout,
});
