/* eslint-disable react/prop-types */
import { useState, useMemo, useCallback } from 'react';
import { Search, Plus, AlertCircle } from 'lucide-react';
import { DuplicateWarning } from './ui/DuplicateWarning';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { exerciseLibrary, type ExerciseLibraryItem } from '@/lib/exercise-library';
import { findSimilarLibraryExercise, type FuzzyMatchResult } from '@/lib/fuzzy-match';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  libraryId?: string | null;
}

interface ExerciseSearchProps {
  selectedIds: string[];
  onSelect: (exercise: Exercise | LibraryItem) => void;
  onDeselect?: (exerciseId: string) => void;
  onCreateInline: (name: string, muscleGroup: string, description: string) => void;
  userExercises?: Exercise[];
}

interface LibraryItem extends ExerciseLibraryItem {
  isLibrary: true;
}

interface SearchResult {
  type: 'user' | 'library';
  item: Exercise | LibraryItem;
  isSelected: boolean;
  matchScore?: number;
};

const EMPTY_EXERCISES: Exercise[] = [];

export function ExerciseSearch({
  selectedIds,
  onSelect,
  onDeselect,
  onCreateInline,
  userExercises = EMPTY_EXERCISES,
}: ExerciseSearchProps) {
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', muscleGroup: '', description: '' });
  const [duplicateWarning, setDuplicateWarning] = useState<{ show: boolean; existingName: string; item: Exercise | LibraryItem } | null>(null);
  const [fuzzyMatchWarning, setFuzzyMatchWarning] = useState<{ show: boolean; exerciseName: string; suggestedName: string; suggestedMuscleGroup: string } | null>(null);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setShowCreateForm(false);
  }, []);

  const filteredResults = useMemo(() => {
    if (!search.trim()) {
      return {
        user: userExercises.slice(0, 50).map(e => ({
          type: 'user' as const,
          item: e,
          isSelected: selectedIds.includes(e.id),
        })),
        library: exerciseLibrary.slice(0, 50).map(e => ({
          type: 'library' as const,
          item: { ...e, isLibrary: true } as LibraryItem,
          isSelected: selectedIds.some(id => {
            const found = userExercises.find(ex => ex.id === id);
            return found?.libraryId === e.id || (found?.name === e.name && found?.muscleGroup === e.muscleGroup);
          }),
        })),
        fuzzyMatch: null,
      };
    }

    const term = search.toLowerCase().trim();

    const userMatches = userExercises
      .filter(e => e.name.toLowerCase().includes(term))
      .slice(0, 5)
      .map(e => ({
        type: 'user' as const,
        item: e,
        isSelected: selectedIds.includes(e.id),
      }));

    const libraryMatches = exerciseLibrary
      .filter(e =>
        e.name.toLowerCase().includes(term) ||
        e.muscleGroup.toLowerCase().includes(term)
      )
      .slice(0, 5)
      .map(e => ({
        type: 'library' as const,
        item: { ...e, isLibrary: true } as LibraryItem,
        isSelected: selectedIds.some(id => {
          const found = userExercises.find(ex => ex.id === id);
          return found?.libraryId === e.id || (found?.name === e.name && found?.muscleGroup === e.muscleGroup);
        }),
      }));

    let fuzzyMatch: FuzzyMatchResult | null = null;
    if (userMatches.length === 0 && libraryMatches.length === 0) {
      fuzzyMatch = findSimilarLibraryExercise(search, '', exerciseLibrary, 0.70);
      if (fuzzyMatch.isMatch && fuzzyMatch.matchedItem) {
        const matchedLibraryId = fuzzyMatch.matchedItem.id;
        const isAlreadyInTemplate = selectedIds.some(id => {
          const found = userExercises.find(ex => ex.id === id);
          return found?.libraryId === matchedLibraryId;
        });
        if (isAlreadyInTemplate) {
          fuzzyMatch = { score: fuzzyMatch.score, isMatch: false };
        }
      }
    }

    return { user: userMatches, library: libraryMatches, fuzzyMatch };
  }, [search, userExercises, selectedIds]);

  const handleSelect = useCallback((result: SearchResult) => {
    if (result.isSelected) {
      if (onDeselect && result.type === 'library') {
        const userExercise = userExercises.find(ex => ex.libraryId === result.item.id);
        if (userExercise) {
          onDeselect(userExercise.id);
        }
      } else if (onDeselect) {
        onDeselect(result.item.id);
      }
      return;
    }
    onSelect(result.item);
    setSearch('');
  }, [onSelect, onDeselect, userExercises]);

  const handleUseExisting = useCallback(() => {
    if (duplicateWarning?.item) {
      onSelect(duplicateWarning.item);
      setSearch('');
    }
    setDuplicateWarning(null);
  }, [duplicateWarning, onSelect]);

  const handleCreateNew = useCallback(() => {
    setDuplicateWarning(null);
    setShowCreateForm(true);
  }, []);

  const handleFuzzyMatchSelect = useCallback(() => {
    if (fuzzyMatchWarning && filteredResults.fuzzyMatch?.matchedItem) {
      const item = { ...filteredResults.fuzzyMatch.matchedItem, isLibrary: true } as LibraryItem;
      onSelect(item);
      setSearch('');
    }
    setFuzzyMatchWarning(null);
  }, [fuzzyMatchWarning, filteredResults.fuzzyMatch, onSelect]);

  const handleFuzzyMatchCreate = useCallback(() => {
    setFuzzyMatchWarning(null);
    setNewExercise({
      name: fuzzyMatchWarning?.exerciseName ?? '',
      muscleGroup: fuzzyMatchWarning?.suggestedMuscleGroup ?? '',
      description: '',
    });
    setShowCreateForm(true);
  }, [fuzzyMatchWarning]);

  const handleFuzzyMatchCancel = useCallback(() => {
    setFuzzyMatchWarning(null);
  }, []);

  const handleCreateClick = useCallback(() => {
    setShowCreateForm(true);
  }, []);

  const handleCreateSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (newExercise.name.trim() && newExercise.muscleGroup.trim()) {
      const similarMatch = findSimilarLibraryExercise(newExercise.name, newExercise.muscleGroup, exerciseLibrary, 0.70);
      if (similarMatch.isMatch && similarMatch.matchedItem) {
        const matchedLibraryId = similarMatch.matchedItem.id;
        const isAlreadyInTemplate = selectedIds.some(id => {
          const found = userExercises.find(ex => ex.id === id);
          return found?.libraryId === matchedLibraryId;
        });
        if (isAlreadyInTemplate) {
          setDuplicateWarning({
            show: true,
            existingName: similarMatch.matchedItem.name,
            item: { ...similarMatch.matchedItem, isLibrary: true } as LibraryItem,
          });
        } else {
          setFuzzyMatchWarning({
            show: true,
            exerciseName: newExercise.name,
            suggestedName: similarMatch.matchedItem.name,
            suggestedMuscleGroup: similarMatch.matchedItem.muscleGroup,
          });
        }
        return;
      }
      onCreateInline(newExercise.name, newExercise.muscleGroup, newExercise.description);
      setNewExercise({ name: '', muscleGroup: '', description: '' });
      setShowCreateForm(false);
      setSearch('');
    }
  }, [newExercise, userExercises, selectedIds, onCreateInline]);

  interface ResultRowProps {
    result: SearchResult;
    onClick: () => void;
  }

  function ResultRow({ result, onClick }: ResultRowProps) {
    return (
      <button
        className={`w-full text-left p-3 rounded-lg border transition-colors ${
          result.isSelected
            ? 'bg-muted border-muted-foreground/20 hover:bg-muted/80'
            : 'border-border hover:border-primary hover:bg-primary/5'
        }`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{result.item.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                result.type === 'library'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
              >
                {result.type === 'library' ? 'Library' : 'Your Exercise'}
              </span>
            </div>
            {result.item.muscleGroup ? <p className="text-sm text-muted-foreground mt-0.5">{result.item.muscleGroup}</p> : null}
          </div>
          {result.isSelected ? (
            <span className="text-sm text-muted-foreground font-medium">Remove</span>
          ) : (
            <Plus size={18} className="text-muted-foreground" />
          )}
        </div>
      </button>
    );
  }

  const MUSCLE_GROUPS = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
    'Core', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Full Body', 'Cardio', 'Other'
  ] as const;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          className="pl-10"
          onChange={handleSearchChange}
          placeholder="Search exercises..."
          type="text"
          value={search}
        />
      </div>

      {showCreateForm ? (
        <form onSubmit={handleCreateSubmit} className="p-4 bg-secondary rounded-lg space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Plus size={18} className="text-primary" />
            <span className="font-medium">Create New Exercise</span>
          </div>

          <div>
            <label htmlFor="exercise-name" className="block text-sm font-medium mb-1">Name *</label>
            <Input
              id="exercise-name"
              autoFocus={true}
              value={newExercise.name}
              onChange={e => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Exercise name"
            />
          </div>

          <div>
            <label htmlFor="muscle-group" className="block text-sm font-medium mb-1">Muscle Group *</label>
            <select
              id="muscle-group"
              className="w-full px-3 py-2 border border-input rounded-lg bg-background"
              value={newExercise.muscleGroup}
              onChange={e => setNewExercise(prev => ({ ...prev, muscleGroup: e.target.value }))}
            >
              <option value="">Select muscle group</option>
              {MUSCLE_GROUPS.map(mg => (
                <option key={mg} value={mg}>{mg}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="exercise-description" className="block text-sm font-medium mb-1">Description</label>
            <textarea
              id="exercise-description"
              className="w-full px-3 py-2 border border-input rounded-lg bg-background resize-none"
              rows={2}
              value={newExercise.description}
              onChange={e => setNewExercise(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!newExercise.name.trim() || !newExercise.muscleGroup.trim()}>
              Create
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Your Exercises</p>
            {filteredResults.user.length > 0 ? (
              <div className="space-y-2">
                {filteredResults.user.map(result => (
                  <ResultRow
                    key={`user-${result.item.id}`}
                    result={result}
                    onClick={() => handleSelect(result)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No exercises found</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Exercise Library</p>
            {filteredResults.library.length > 0 ? (
              <div className="space-y-2">
                {filteredResults.library.map(result => (
                  <ResultRow
                    key={`library-${result.item.id}`}
                    result={result}
                    onClick={() => handleSelect(result)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No exercises found</p>
            )}
          </div>

          {filteredResults.fuzzyMatch !== null && filteredResults.fuzzyMatch.isMatch && filteredResults.fuzzyMatch.matchedItem !== null ? (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-primary" />
                <span className="text-sm font-medium">Similar exercise found</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Did you mean <strong>{filteredResults.fuzzyMatch.matchedItem?.name ?? ''}</strong> ({filteredResults.fuzzyMatch.matchedItem?.muscleGroup ?? ''})?
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleFuzzyMatchSelect}
              >
                Add from Library
              </Button>
            </div>
          ) : null}

          {filteredResults.user.length === 0 && filteredResults.library.length === 0 && !filteredResults.fuzzyMatch?.isMatch && (
            <button
              className="w-full p-4 border-2 border-dashed border-border rounded-lg text-left hover:border-primary hover:bg-primary/5 transition-colors"
              onClick={handleCreateClick}
            >
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-muted-foreground" />
                <span className="font-medium">Create "{search}"</span>
              </div>
            </button>
          )}
        </div>
      )}

      {duplicateWarning ? <DuplicateWarning
          existingName={duplicateWarning.existingName}
          onUseExisting={handleUseExisting}
          onCreateNew={handleCreateNew}
          onCancel={() => setDuplicateWarning(null)}
      /> : null}

      {fuzzyMatchWarning ? <DuplicateWarning
          existingName={fuzzyMatchWarning.suggestedName}
          onUseExisting={handleFuzzyMatchSelect}
          onCreateNew={handleFuzzyMatchCreate}
          onCancel={handleFuzzyMatchCancel}
      /> : null}
    </div>
  );
}
