import { ChevronDown, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/routes/__root';
import { type Exercise } from '@/lib/db/schema';

const ExerciseOption = ({ exercise, selectedId, onSelect }: { readonly exercise: Exercise; readonly selectedId?: string; readonly onSelect: (id: string) => void }) => (
  <button
    className={`w-full px-4 py-2 text-left hover:bg-secondary cursor-pointer transition-colors ${
      selectedId === exercise.id ? 'bg-primary/10 text-primary' : ''
    }`}
    onClick={() => onSelect(exercise.id)}
    type="button"
  >
    <div className="font-medium text-sm">{exercise.name}</div>
    {exercise.muscleGroup ? (
      <div className="text-xs text-muted-foreground">{exercise.muscleGroup}</div>
    ) : null}
  </button>
);

interface ExerciseSelectProps {
  readonly selectedId?: string;
  readonly onChange: (id: string | null) => void;
}

export function ExerciseSelect({ selectedId, onChange }: ExerciseSelectProps) {
  const auth = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: exercises = [], isLoading: loading } = useQuery<Exercise[]>({
    queryKey: ['exercises', debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/exercises?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch exercises');
      return res.json();
    },
    enabled: !!auth.user,
    staleTime: 30 * 1000,
  });

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
    setSearchInput(e.target.value);
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

  const filteredExercises = searchInput
    ? exercises.filter(
        (e) =>
          e.name.toLowerCase().includes(searchInput.toLowerCase()) ||
          (e.muscleGroup?.toLowerCase() ?? '').includes(searchInput.toLowerCase())
      )
    : exercises;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="inline-flex items-center justify-between gap-2 px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow w-full"
        onClick={handleToggle}
        type="button"
      >
        <span className={selectedExercise ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedExercise?.name ?? 'Select exercise...'}
        </span>
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground" />
        ) : (
          <ChevronDown size={20} />
        )}
      </button>

      {isOpen ? (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              className="w-full pl-10 pr-4 py-2 border-b border-border focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={handleSearchChange}
              placeholder="Search exercises..."
              type="text"
              value={searchInput}
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {loading && exercises.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                {searchInput ? 'No exercises found' : 'No exercises available'}
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
