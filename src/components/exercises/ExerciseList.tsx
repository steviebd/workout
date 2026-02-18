import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Pencil, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '~/lib/cn';

interface ExerciseListItem {
  id: string;
  name: string;
  muscleGroup: string | null;
  description: string | null;
  libraryId?: string | null;
}

interface SwipeState {
  id: string | null;
  offset: number;
  direction: 'left' | 'right' | null;
}

export interface ExerciseListProps {
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
  const [swipeState] = useState<SwipeState>({ id: null, offset: 0, direction: null });
  const dragOverIndexRef = useRef<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const dropIndicatorRef = useRef<HTMLDivElement>(null);

  // Add drop indicator element
  useEffect(() => {
    if (!listRef.current) return;

    // Create drop indicator if it doesn't exist
    if (!dropIndicatorRef.current) {
      const indicator = document.createElement('div');
      indicator.className = 'absolute left-0 right-0 h-0 border-t-2 border-primary pointer-events-none z-10';
      indicator.style.display = 'none';
      listRef.current.appendChild(indicator);
      dropIndicatorRef.current = indicator;
    }
  }, []);

  const getSwipeStyles = (id: string) => {
    if (swipeState.id !== id) return {};
    const offset = swipeState.offset;
    return {
      transform: `translateX(-${offset}px)`,
      transition: offset === 0 ? 'none' : undefined,
    };
  };

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
    
    if (target) {
      target.classList.add('opacity-50', 'shadow-xl', 'scale-[1.02]', 'z-20');
    }
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
        
        if (dropIndicatorRef.current) {
          const rect = listItem.getBoundingClientRect();
          const listRect = listRef.current?.getBoundingClientRect();
          if (listRect) {
            dropIndicatorRef.current.style.display = 'block';
            dropIndicatorRef.current.style.top = `${rect.top - listRect.top + 2}px`;
            dropIndicatorRef.current.style.left = '0px';
            dropIndicatorRef.current.style.width = '100%';
          }
        }
      }
    }
  }, [draggedIndex]);

  const handleTouchEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndexRef.current !== null && draggedIndex !== dragOverIndexRef.current) {
      onReorder(draggedIndex, dragOverIndexRef.current);
    }
    setDraggedIndex(null);
    dragOverIndexRef.current = null;
    
    const allItems = Array.from(listRef.current?.children ?? []);
    allItems.forEach(item => {
      item.classList.remove('opacity-50', 'shadow-xl', 'scale-[1.02]', 'z-20');
    });
    
    if (dropIndicatorRef.current) {
      dropIndicatorRef.current.style.display = 'none';
    }
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
    <ul className="space-y-2 relative" ref={listRef}>
      {/* Drop indicator for touch drag operations */}
      <div
        ref={dropIndicatorRef}
        className="absolute left-0 right-0 h-0.5 bg-primary pointer-events-none z-10"
        style={{ display: 'none' }}
      />
      {exercises.map((exercise, index) => (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <li
          key={exercise.id}
          ref={(el) => {
            if (el) itemRefs.current.set(exercise.id, el);
            else itemRefs.current.delete(exercise.id);
          }}
          className={`exercise-item flex items-center gap-3 p-3.5 bg-secondary/50 rounded-lg border border-border/60 transition-all duration-200 hover:bg-secondary hover:border-border hover:shadow-sm touch-manipulation relative ${draggedIndex === index ? 'opacity-50 shadow-xl scale-[1.02] z-20 border-primary' : ''} ${dragOverIndexRef.current === index ? 'border-primary border-2' : ''}`}
          draggable={draggedIndex === null}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onTouchStart={(e) => handleTouchStart(e, index)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={getSwipeStyles(exercise.id)}
        >
          <div
            className={cn(
              'absolute inset-y-0 right-0 flex items-center pr-3 invisible opacity-0 transition-all duration-200',
              swipeState.id === exercise.id && swipeState.offset > 20 ? 'visible opacity-100' : ''
            )}
          >
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/20"
              onClick={() => onRemove(exercise.id)}
              type="button"
            >
              <Trash2 size={18} />
            </Button>
          </div>
          <span className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-xs font-semibold rounded shrink-0">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-sm">{exercise.name}</p>
            {exercise.muscleGroup !== null && exercise.muscleGroup !== undefined && (
              <p className="text-xs text-muted-foreground mt-0.5">{exercise.muscleGroup}</p>
            )}
          </div>
          <div className="flex items-center gap-1 group">
            {onMoveUp !== null && onMoveUp !== undefined && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onMoveUp?.(index)}
                disabled={index === 0}
                aria-label={`Move ${exercise.name} up`}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 invisible group-hover:visible focus:visible transition-opacity duration-150"
              >
                <ChevronUp size={20} />
              </Button>
            )}
            {onMoveDown !== null && onMoveDown !== undefined && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onMoveDown?.(index)}
                disabled={index === exercises.length - 1}
                aria-label={`Move ${exercise.name} down`}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 invisible group-hover:visible focus:visible transition-opacity duration-150"
              >
                <ChevronDown size={20} />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(exercise.id)}
              type="button"
            >
              <Pencil size={18} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(exercise.id)}
              type="button"
            >
              <Trash2 size={18} />
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
      className={`flex items-center gap-3 p-3.5 bg-secondary/50 rounded-lg border border-border/60 transition-all duration-200 hover:bg-secondary hover:shadow-sm ${
        isDragging ? 'opacity-50 shadow-xl scale-[1.02] z-20 border-primary' : ''
      }`}
    >
      <span className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-xs font-semibold rounded shrink-0">
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm">{exercise.name}</p>
        {exercise.muscleGroup !== null && exercise.muscleGroup !== undefined && (
          <p className="text-xs text-muted-foreground mt-0.5">{exercise.muscleGroup}</p>
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
