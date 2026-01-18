import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from './__root';
import { exerciseLibrary, searchLibraryExercises, type ExerciseLibraryItem } from '../lib/exercise-library';
import { BookOpen, X, Search, Plus, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/exercises/new')({
  component: NewExercise,
});

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

  const handleSelectFromLibrary = (item: ExerciseLibraryItem) => {
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
  };

  const validateForm = () => {
    const newErrors: { name?: string; muscleGroup?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!selectedMuscleGroup) {
      newErrors.muscleGroup = 'Muscle group is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        const data = await response.json();
        throw new Error(data.message || 'Failed to create exercise');
      }

      const data = await response.json();
      window.location.href = `/exercises/${data.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (auth.loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Create Exercise</h1>
            <button
              type="button"
              onClick={() => setShowLibrary(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <BookOpen size={18} />
              Choose from Library
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter exercise name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="muscleGroup" className="block text-sm font-medium text-gray-700 mb-1">
                Muscle Group *
              </label>
              <select
                id="muscleGroup"
                value={selectedMuscleGroup}
                onChange={(e) => setSelectedMuscleGroup(e.target.value as MuscleGroup)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.muscleGroup ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select muscle group</option>
                {MUSCLE_GROUPS.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
              {errors.muscleGroup && <p className="mt-1 text-sm text-red-500">{errors.muscleGroup}</p>}
            </div>

            {selectedMuscleGroup === 'Other' && (
              <div>
                <label htmlFor="customMuscleGroup" className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Muscle Group
                </label>
                <input
                  type="text"
                  id="customMuscleGroup"
                  value={formData.customMuscleGroup}
                  onChange={(e) => setFormData(prev => ({ ...prev, customMuscleGroup: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter custom muscle group"
                />
              </div>
            )}

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Describe the exercise..."
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Create Exercise
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showLibrary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Exercise Library</h2>
              <button
                onClick={() => {
                  setShowLibrary(false);
                  setLibrarySearch('');
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
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search exercises..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredLibrary.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No exercises found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLibrary.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectFromLibrary(item)}
                      className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                            {item.muscleGroup}
                          </span>
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{item.description}</p>
                        </div>
                        <Plus size={18} className="text-blue-500 flex-shrink-0 ml-4" />
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
