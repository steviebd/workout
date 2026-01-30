import { useState, useCallback, useRef } from 'react';
import { X, Pencil, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';

interface ExerciseListItem {
  id: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  libraryId?: string | null;
}

interface ExerciseListProps {
  exercises: ExerciseListItem[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}

export function ExerciseList({
  exercises,
  onReorder,
  onRemove,
  onEdit,
  onMoveUp,
  onMoveDown,
}: ExerciseListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget) {
      e.currentTarget.classList.add('opacity-50');
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedIndex(null);
    dragOverIndexRef.current = null;
    if (e.currentTarget) {
      e.currentTarget.classList.remove('opacity-50');
    }
    itemRefs.current.forEach(el => {
      el.classList.remove('opacity-50', 'border-primary');
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverIndexRef.current = index;

    itemRefs.current.forEach((el, id) => {
      const itemIndex = exercises.findIndex(ex => ex.id === id);
      if (itemIndex === index && draggedIndex !== null && itemIndex !== draggedIndex) {
        el.classList.add('border-primary');
      } else {
        el.classList.remove('border-primary');
      }
    });
  }, [draggedIndex, exercises]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget as Node)) {
      e.currentTarget.classList.remove('border-primary');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onReorder(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    dragOverIndexRef.current = null;
    itemRefs.current.forEach(el => {
      el.classList.remove('opacity-50', 'border-primary');
    });
  }, [draggedIndex, onReorder]);

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    const target = e.currentTarget;
    target.setPointerCapture(touch.identifier);
    setDraggedIndex(index);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (draggedIndex === null) return;

    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const listItem = elements.find(el => el.classList.contains('exercise-item'));

    if (listItem) {
      const allItems = Array.from(listRef.current?.children ?? []);
      const index = allItems.indexOf(listItem);
      if (index !== -1 && index !== draggedIndex) {
        dragOverIndexRef.current = index;
      }
    }
  }, [draggedIndex]);

  const handleTouchEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndexRef.current !== null && draggedIndex !== dragOverIndexRef.current) {
      onReorder(draggedIndex, dragOverIndexRef.current);
    }
    setDraggedIndex(null);
    dragOverIndexRef.current = null;
  }, [draggedIndex, onReorder]);

  if (exercises.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No exercises added yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Search and add exercises above
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" ref={listRef}>
      {exercises.map((exercise, index) => (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <li
          key={exercise.id}
          ref={(el) => {
            if (el) itemRefs.current.set(exercise.id, el);
            else itemRefs.current.delete(exercise.id);
          }}
          className={`exercise-item flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border touch-none ${
            draggedIndex === index ? 'opacity-50' : ''
          }`}
          draggable={draggedIndex === null}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onTouchStart={(e) => handleTouchStart(e, index)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-sm font-medium rounded">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{exercise.name}</p>
            {exercise.muscleGroup !== null && exercise.muscleGroup !== undefined && (
              <p className="text-sm text-muted-foreground">{exercise.muscleGroup}</p>
            )}
          </div>
          <div className="flex items-center gap-1 group">
            {onMoveUp !== null && onMoveUp !== undefined && (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onMoveUp?.(index)}
                disabled={index === 0}
                aria-label={`Move ${exercise.name} up`}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <ChevronUp size={16} />
              </Button>
            )}
            {onMoveDown !== null && onMoveDown !== undefined && (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onMoveDown?.(index)}
                disabled={index === exercises.length - 1}
                aria-label={`Move ${exercise.name} down`}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <ChevronDown size={16} />
              </Button>
            )}
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(exercise.id)}
              type="button"
            >
              <Pencil size={16} />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(exercise.id)}
              type="button"
            >
              <X size={18} />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface ExerciseListRowProps {
  exercise: ExerciseListItem;
  index: number;
  isDragging: boolean;
  onRemove: () => void;
  onEdit: () => void;
}

export function ExerciseListRow({
  exercise,
  index,
  isDragging,
  onRemove,
  onEdit,
}: ExerciseListRowProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <span className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-sm font-medium rounded">
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{exercise.name}</p>
        {exercise.muscleGroup !== null && exercise.muscleGroup !== undefined && (
          <p className="text-sm text-muted-foreground">{exercise.muscleGroup}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          type="button"
        >
          <Pencil size={16} />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          type="button"
        >
          <X size={18} />
        </Button>
      </div>
    </div>
  );
}
