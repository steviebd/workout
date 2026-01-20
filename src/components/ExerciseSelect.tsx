import { ChevronDown, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Exercise } from '@/lib/db/schema';

const ExerciseOption = ({ exercise, selectedId, onSelect }: { readonly exercise: Exercise; readonly selectedId?: string; readonly onSelect: (id: string) => void }) => (
  <button
    className={`w-full px-4 py-2 text-left hover:bg-gray-100 cursor-pointer transition-colors ${
      selectedId === exercise.id ? 'bg-blue-50 text-blue-900' : ''
    }`}
    // eslint-disable-next-line react/jsx-no-bind
    onClick={() => onSelect(exercise.id)}
    type="button"
  >
    <div className="font-medium text-sm">{exercise.name}</div>
    {exercise.muscleGroup ? (
      <div className="text-xs text-gray-500">{exercise.muscleGroup}</div>
    ) : null}
  </button>
);

interface ExerciseSelectProps {
  readonly selectedId?: string;
  readonly onChange: (id: string | null) => void;
}

export function ExerciseSelect({ selectedId, onChange }: ExerciseSelectProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(`/api/exercises?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setExercises(data as Exercise[]);
      }
    } catch (err) {
      console.error('Failed to fetch exercises:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void fetchExercises();
  }, [fetchExercises]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      onChange(id);
      setIsOpen(false);
    },
    [onChange]
  );

  const selectedExercise = exercises.find((e) => e.id === selectedId);

  const filteredExercises = search
    ? exercises.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          (e.muscleGroup?.toLowerCase() ?? '').includes(search.toLowerCase())
      )
    : exercises;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="inline-flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow w-full"
        onClick={handleToggle}
        type="button"
      >
        <span className={selectedExercise ? 'text-gray-900' : 'text-gray-500'}>
          {selectedExercise?.name ?? 'Select exercise...'}
        </span>
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
        ) : (
          <ChevronDown size={20} />
        )}
      </button>

      {isOpen ? (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              className="w-full pl-10 pr-4 py-2 border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleSearchChange}
              placeholder="Search exercises..."
              type="text"
              value={search}
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {loading && exercises.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                {search ? 'No exercises found' : 'No exercises available'}
              </div>
            ) : (
              filteredExercises.map((exercise) => (
                <ExerciseOption
                  key={exercise.id}
                  exercise={exercise}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
