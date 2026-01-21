import { createFileRoute } from '@tanstack/react-router';
import { BookOpen, Loader2, Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type ExerciseLibraryItem, exerciseLibrary, searchLibraryExercises } from '../lib/exercise-library';
import { useAuth } from './__root';
import { trackEvent } from '@/lib/posthog';
import { useToast } from '@/components/ToastProvider';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';

const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Core',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Full Body',
  'Cardio',
  'Other',
] as const;

type MuscleGroup = typeof MUSCLE_GROUPS[number];

function NewExercise() {
  const auth = useAuth();
  const toast = useToast();
  const [redirecting, setRedirecting] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup | ''>('');
  const [formData, setFormData] = useState({
    name: '',
    customMuscleGroup: '',
    description: '',
  });
  const [errors, setErrors] = useState<{ name?: string; muscleGroup?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
  }, []);

  const handleMuscleGroupChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMuscleGroup(e.target.value as MuscleGroup);
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, description: e.target.value }));
  }, []);

  const handleCloseLibrary = useCallback(() => {
    setShowLibrary(false);
    setLibrarySearch('');
  }, []);

  const handleLibrarySearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLibrarySearch(e.target.value);
  }, []);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      setRedirecting(true);
      window.location.href = '/auth/signin';
    }
  }, [auth.loading, auth.user]);

  const filteredLibrary = useMemo(() => {
    if (!librarySearch.trim()) return exerciseLibrary;
    return searchLibraryExercises(librarySearch);
  }, [librarySearch]);

  const handleSelectFromLibrary = useCallback((item: ExerciseLibraryItem) => {
    setFormData({
      name: item.name,
      customMuscleGroup: '',
      description: item.description,
    });
    if (MUSCLE_GROUPS.includes(item.muscleGroup as MuscleGroup)) {
      setSelectedMuscleGroup(item.muscleGroup as MuscleGroup);
    } else {
      setSelectedMuscleGroup('Other');
      setFormData(prev => ({ ...prev, customMuscleGroup: item.muscleGroup }));
    }
    setShowLibrary(false);
    setLibrarySearch('');
  }, []);

  const handleSelectFromLibraryById = useCallback((e: React.MouseEvent) => {
    const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
    if (id) {
      const item = filteredLibrary.find(lib => lib.id === id);
      if (item) handleSelectFromLibrary(item);
    }
  }, [filteredLibrary, handleSelectFromLibrary]);

  const handleLibraryButtonClick = useCallback(() => {
    setShowLibrary(true);
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: { name?: string; muscleGroup?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!selectedMuscleGroup) {
      newErrors.muscleGroup = 'Muscle group is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.name, selectedMuscleGroup]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const muscleGroup = selectedMuscleGroup === 'Other' ? formData.customMuscleGroup : selectedMuscleGroup;

      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          muscleGroup,
          description: formData.description,
        }),
      });

      if (!response.ok) {
        const data: { message?: string } = await response.json();
        throw new Error(data.message ?? 'Failed to create exercise');
      }

      const data: { id: string } = await response.json();
      void trackEvent('exercise_created', {
        exercise_id: data.id,
        exercise_name: formData.name,
      });
      toast.success('Exercise created successfully!');
      setTimeout(() => {
        window.location.href = `/exercises/${data.id}`;
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [formData.name, formData.customMuscleGroup, formData.description, selectedMuscleGroup, validateForm, toast]);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmit(e);
  }, [handleSubmit]);

  if (auth.loading || redirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Create Exercise</h1>
          <Button
            variant="outline"
            onClick={handleLibraryButtonClick}
          >
            <BookOpen size={18} />
            Choose from Library
          </Button>
        </div>

        {error !== null && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleFormSubmit}>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor={'name'}>
              Name *
            </label>
            <Input
              id={'name'}
              onChange={handleNameChange}
              placeholder="Enter exercise name"
              type="text"
              value={formData.name}
            />
            {errors.name ? <p className="mt-1 text-sm text-destructive">{errors.name}</p> : null}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor={'muscleGroup'}>
              Muscle Group *
            </label>
            <select
              className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow text-base ${
                errors.muscleGroup ? 'border-destructive' : 'border-input'
              }`}
              id={'muscleGroup'}
              onChange={handleMuscleGroupChange}
              value={selectedMuscleGroup}
            >
              <option value="">Select muscle group</option>
              {MUSCLE_GROUPS.map((mg) => (
                <option key={mg} value={mg}>
                  {mg}
                </option>
              ))}
            </select>
            {errors.muscleGroup ? <p className="mt-1 text-sm text-destructive">{errors.muscleGroup}</p> : null}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor={'description'}>
              Description
            </label>
            <textarea
              className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow text-base resize-none"
              id={'description'}
              onChange={handleDescriptionChange}
              placeholder="Enter exercise description (optional)"
              rows={3}
              value={formData.description}
            />
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Exercise
                </>
              )}
            </Button>
          </div>
        </form>
      </main>

      {showLibrary ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Exercise Library</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseLibrary}
              >
                <X size={20} />
              </Button>
            </div>

            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  autoFocus={true}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  onChange={handleLibrarySearchChange}
                  placeholder="Search exercises..."
                  type="text"
                  value={librarySearch}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredLibrary.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No exercises found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLibrary.map((item) => (
                    <button
                      className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-colors"
                      data-id={item.id}
                      key={item.id}
                      onClick={handleSelectFromLibraryById}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-primary bg-primary/10 rounded-full">
                            {item.muscleGroup}
                          </span>
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        </div>
                        <Plus className="text-primary flex-shrink-0 ml-4" size={18} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export const Route = createFileRoute('/exercises/new')({
  component: NewExercise,
});
