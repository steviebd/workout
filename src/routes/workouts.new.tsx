import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuth } from './__root';
import { ArrowLeft, Plus, X, Search, Dumbbell, History, FilePlus, Loader2, ChevronRight } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  exerciseCount: number;
}

export const Route = createFileRoute('/workouts/new')({
  component: NewWorkout,
});

type StartMode = 'templates' | 'recent' | 'blank';

function NewWorkout() {
  const auth = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [mode, setMode] = useState<StartMode>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    window.addEventListener('error', (e) => {
      console.error('Window error:', e.error);
    });
  }, []);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      fetchData();
    }
  }, [auth.loading, auth.user]);

  async function fetchData() {
    try {
      setLoading(true);

      const [templatesRes, exercisesRes] = await Promise.all([
        fetch('/api/templates', { credentials: 'include' }),
        fetch('/api/exercises', { credentials: 'include' }),
      ]);

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data as Template[]);
      }

      if (exercisesRes.ok) {
        const data = await exercisesRes.json();
        setExercises(data as Exercise[]);
      }

      const historyRes = await fetch('/api/workouts?sortBy=startedAt&sortOrder=DESC&limit=5', {
        credentials: 'include',
      });

      if (historyRes.ok) {
        const data = await historyRes.json();
        setRecentWorkouts(data as any[]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const handleAddExercise = (exercise: Exercise) => {
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
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter((e) => e.id !== exerciseId));
  };

  const handleStartFromTemplate = async (template: Template) => {
    setSelectedTemplate(template);
    setMode('blank');
    setWorkoutName(template.name);

    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        credentials: 'include',
      });

      if (res.ok) {
        await res.json();
        const templateExercisesRes = await fetch(`/api/templates/${template.id}/exercises`, {
          credentials: 'include',
        });

        if (templateExercisesRes.ok) {
          const templateExercises = await templateExercisesRes.json() as any[];
          const exerciseIds = templateExercises.map((te) => te.exerciseId);

          const exerciseDetails = exercises.filter((e) => exerciseIds.includes(e.id));
          setSelectedExercises(exerciseDetails);
        }
      }
    } catch (err) {
      console.error('Failed to load template details:', err);
    }
  };

  const handleCopyFromRecent = (workout: any) => {
    setMode('blank');
    setWorkoutName(`${workout.name} (Copy)`);
  };

  const handleStartWorkout = async () => {
    if (!workoutName.trim()) {
      setError('Workout name is required');
      return;
    }

    if (selectedExercises.length === 0) {
      setError('Add at least one exercise to the workout');
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const workoutRes = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: workoutName,
          templateId: selectedTemplate?.id,
        }),
      });

      if (!workoutRes.ok) {
        const data = await workoutRes.json();
        throw new Error((data as any).message || 'Failed to create workout');
      }

      const workout = await workoutRes.json() as { id: string };

      for (let i = 0; i < selectedExercises.length; i++) {
        await fetch(`/api/workouts/${workout.id}/exercises`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            exerciseId: selectedExercises[i].id,
            orderIndex: i,
          }),
        });
      }

      window.location.href = `/workouts/${workout.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setStarting(false);
    }
  };

  if (auth.loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Redirecting to sign in...</p>
      </div>
    );
  }

  if (mode === 'templates') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to dashboard
            </a>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Start Workout</h1>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Dumbbell size={20} className="text-blue-600" />
                  Start from Template
                </h2>
                <p className="text-gray-600 mb-4">Choose a pre-built workout template</p>

                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No templates yet</p>
                    <a
                      href="/templates/new"
                      className="text-blue-600 hover:text-blue-700 mt-2 inline-block"
                    >
                      Create your first template
                    </a>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleStartFromTemplate(template)}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{template.name}</p>
                          <p className="text-sm text-gray-500">
                            {template.exerciseCount} exercises
                            {template.description && ` • ${template.description}`}
                          </p>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <History size={20} className="text-blue-600" />
                  Copy Recent Workout
                </h2>
                <p className="text-gray-600 mb-4">Start from one of your recent workouts</p>

                {recentWorkouts.filter((w) => w.completedAt).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No completed workouts yet</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {recentWorkouts
                      .filter((w) => w.completedAt)
                      .map((workout) => (
                        <button
                          key={workout.id}
                          onClick={() => handleCopyFromRecent(workout)}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{workout.name}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(workout.startedAt).toLocaleDateString()}
                              {workout.completedAt && ' • Completed'}
                            </p>
                          </div>
                          <ChevronRight size={20} className="text-gray-400" />
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FilePlus size={20} className="text-blue-600" />
                  Build Your Own
                </h2>
                <p className="text-gray-600 mb-4">Select exercises to create a custom workout</p>

                {selectedExercises.length === 0 ? (
                  <button
                    onClick={() => setMode('blank')}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    Start with blank workout
                  </button>
                ) : (
                  <div className="space-y-3">
                    {selectedExercises.map((exercise, index) => (
                      <div
                        key={exercise.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-sm font-medium rounded">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{exercise.name}</p>
                          {exercise.muscleGroup && (
                            <p className="text-sm text-gray-500">{exercise.muscleGroup}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveExercise(exercise.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setShowExerciseSelector(true)}
                      className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Add more exercises
                    </button>
                    <button
                      onClick={handleStartWorkout}
                      disabled={starting}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400"
                    >
                      {starting ? 'Starting...' : 'Start Workout'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showExerciseSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Add Exercise</h2>
                <button
                  onClick={() => {
                    setShowExerciseSelector(false);
                    setExerciseSearch('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    placeholder="Search exercises..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={32} className="animate-spin text-blue-600" />
                  </div>
                ) : filteredExercises.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No exercises found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredExercises.map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => handleAddExercise(exercise)}
                        disabled={selectedExercises.some((se) => se.id === exercise.id)}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{exercise.name}</h3>
                            {exercise.muscleGroup && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                                {exercise.muscleGroup}
                              </span>
                            )}
                          </div>
                          {selectedExercises.some((se) => se.id === exercise.id) && (
                            <span className="text-green-600 text-sm font-medium">Added</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => setMode('templates')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to options
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Build Your Workout</h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Workout Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                placeholder="e.g., Upper Body Workout"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Exercises <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowExerciseSelector(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus size={16} />
                  Add Exercise
                </button>
              </div>

              {selectedExercises.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <p className="text-gray-500">No exercises added yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Click "Add Exercise" to add exercises to this workout
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedExercises.map((exercise, index) => (
                    <div
                      key={exercise.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-sm font-medium rounded">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{exercise.name}</p>
                        {exercise.muscleGroup && (
                          <p className="text-sm text-gray-500">{exercise.muscleGroup}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(exercise.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setMode('templates')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartWorkout}
                disabled={starting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400"
              >
                {starting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
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
      </div>

      {showExerciseSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Add Exercise</h2>
              <button
                onClick={() => {
                  setShowExerciseSelector(false);
                  setExerciseSearch('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder="Search exercises..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={32} className="animate-spin text-blue-600" />
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No exercises found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => handleAddExercise(exercise)}
                      disabled={selectedExercises.some((se) => se.id === exercise.id)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{exercise.name}</h3>
                          {exercise.muscleGroup && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                              {exercise.muscleGroup}
                            </span>
                          )}
                        </div>
                        {selectedExercises.some((se) => se.id === exercise.id) && (
                          <span className="text-green-600 text-sm font-medium">Added</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
