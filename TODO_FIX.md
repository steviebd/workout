# TODO_FIX.md - Implementation Plan

**Last Updated**: January 30, 2026
**Research Complete** - All dependencies verified

---

## Key Decisions

| Item | Decision |
|------|----------|
| Exercise Search UI | **Drawer** (bottom sheet) for both mobile and desktop |
| DuplicateWarning | Handles **both** duplicate + fuzzy match cases |
| Start Workout | **Direct link** to `/workouts/start/$templateId` |
| Fuzzy Match | Warning shown **before** inline creation |
| Drawer Behavior | **Stays open** for multiple selections |
| DuplicateWarning API | Use existing `existingName` prop (no rename) |

---

## 🔴 P0 - Critical Bugs

### 1. Undo/Redo Does Not Update UI State

**Files**: `src/components/TemplateEditor.tsx`

**Required Changes**:
- Create `handleUndo` and `handleRedo` callbacks that apply returned state
- Update button `onClick` from `undo` → `handleUndo` and `redo` → `handleRedo`

```typescript
const handleUndo = useCallback(() => {
  const previousState = undo();
  if (previousState) {
    if (previousState.name !== undefined) {
      setFormData(prev => ({ ...prev, ...previousState }));
    }
    if (previousState.exercises) {
      setSelectedExercises(previousState.exercises as SelectedExercise[]);
    }
  }
}, [undo]);

const handleRedo = useCallback(() => {
  const nextState = redo();
  if (nextState) {
    if (nextState.name !== undefined) {
      setFormData(prev => ({ ...prev, ...nextState }));
    }
    if (nextState.exercises) {
      setSelectedExercises(nextState.exercises as SelectedExercise[]);
    }
  }
}, [redo]);
```

**Acceptance Criteria**:
- [ ] Ctrl+Z reverts the last change
- [ ] Ctrl+Y / Cmd+Shift+Z redoes the change
- [ ] Undo/Redo buttons visually update disabled state

---

### 2. Library Exercises Not Persisted to Database

**Files**: `src/components/TemplateEditor.tsx`

**API already supports**: `/api/exercises` accepts `libraryId`
**Schema already supports**: `exercises.libraryId` column

**Required Changes**:
- `handleAddExercise` must call `/api/exercises` with `libraryId` for library items
- Check for existing exercise by `libraryId` to avoid duplicates
- Update `SelectedExercise` interface to include `libraryId`
- Ensure `Exercise` type from fetched data includes `libraryId` (it does - from schema)

```typescript
const handleAddExercise = useCallback(async (exercise: Exercise | LibraryItem) => {
  // Check if already selected in template
  if (selectedExercises.some(se => se.name === exercise.name)) {
    toast.warning('Exercise already added to template');
    return;
  }

  let exerciseId = exercise.id;
  let libraryId: string | undefined;

  // If from library, check if already exists in user's exercises or create new
  if ('isLibrary' in exercise && exercise.isLibrary) {
    // First check if user already has this library exercise
    const existing = exercises.find(e => e.libraryId === exercise.id);
    if (existing) {
      exerciseId = existing.id;
      libraryId = exercise.id;
    } else {
      // Create new exercise from library
      try {
        const response = await fetch('/api/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            description: exercise.description,
            libraryId: exercise.id,
          }),
        });

        if (!response.ok) throw new Error('Failed to create exercise');

        const created = await response.json();
        exerciseId = created.id;
        libraryId = exercise.id;
        fetchExercises();
      } catch (err) {
        toast.error('Failed to add library exercise');
        return;
      }
    }
  }

  const newExercise: SelectedExercise = {
    id: crypto.randomUUID(),
    exerciseId,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    description: exercise.description ?? null,
    libraryId,
  };

  pushUndo({
    description: `Add ${exercise.name}`,
    before: { exercises: [...selectedExercises] },
    after: { exercises: [...selectedExercises, newExercise] },
  }, { ...formData, exercises: [...selectedExercises] });

  setSelectedExercises(prev => [...prev, newExercise]);
  autoSave.scheduleSave();
}, [selectedExercises, exercises, pushUndo, formData, toast, autoSave, fetchExercises]);
```

**Important**: The API (`/api/exercises` POST) accepts `libraryId` but does NOT check for duplicates. Either:
- Add duplicate check in API: query by `libraryId` + `userId` before insert, return existing if found
- Or check client-side before POST (simpler, shown above with `exercises.find(e => e.libraryId === exercise.id)`)

**Acceptance Criteria**:
- [ ] Selecting library exercise creates DB record with `libraryId`
- [ ] No duplicate if same library item added twice (check existing by libraryId)
- [ ] Toast shows success/failure

---

### 3. Inline Exercise Creation Uses Fake IDs

**Files**: `src/components/TemplateEditor.tsx`

**Required Changes**:
- `onCreateInline` callback must call `/api/exercises` before adding
- Use returned real ID instead of `new-${Date.now()}`
- Call `fetchExercises()` to refresh list

```typescript
onCreateInline={async (name, muscleGroup, description) => {
  try {
    const response = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, muscleGroup, description }),
    });

    if (!response.ok) throw new Error('Failed to create exercise');

    const created = await response.json();

    handleAddExercise({
      id: created.id,
      name: created.name,
      muscleGroup: created.muscleGroup,
      description: created.description,
    });

    toast.success(`Created "${name}"`);
    fetchExercises();
  } catch (err) {
    toast.error('Failed to create exercise');
  }
}}
```

**Acceptance Criteria**:
- [ ] Inline-created exercise persists to database
- [ ] Template can be saved with inline-created exercises

---

### 4. Auto-save Does Not Include Exercise Changes

**Files**: `src/components/TemplateEditor.tsx`

**Required Changes**:
- Update `useAutoSave` `onSave` to call `syncExercises(templateId)`
- Add `autoSave.scheduleSave()` after exercise add/remove/reorder
- Form fields: only save on blur (remove `scheduleSave` from `onChange`)

```typescript
const autoSave = useAutoSave({
  data: {
    ...formData,
    exerciseCount: selectedExercises.length,
    exerciseIds: selectedExercises.map(e => e.exerciseId).join(','),
  },
  onSave: async () => {
    if (mode === 'edit' && templateId) {
      await saveTemplate();
      await syncExercises(templateId);
    }
  },
  enabled: mode === 'edit',
  delay: 1500,
  onSuccess: () => console.log('Auto-saved'),
  onError: (error) => {
    console.error('Auto-save failed:', error);
    toast.error('Failed to auto-save');
  },
});
```

**Acceptance Criteria**:
- [ ] Exercise changes auto-save in edit mode
- [ ] "Saving..." / "Saved" indicators work correctly

---

## 🟠 P1 - High Priority

### 5. DuplicateWarning Component Integration

**Files**: `src/components/ui/DuplicateWarning.tsx`, `src/components/ExerciseSearch.tsx`

**Current API** (no changes needed):
```typescript
interface DuplicateWarningProps {
  existingName: string;  // Keep as-is, matches current implementation
  onUseExisting: () => void;
  onCreateNew: () => void;
  onCancel: () => void;
}
```

**Note**: The component already exists with `existingName` prop. No rename needed - just use it as-is.

**Integration in ExerciseSearch.tsx**:

1. **Duplicate case** (exercise already in template):
   - Show warning when `result.isSelected === true`

2. **Fuzzy match case** (before inline creation):
   - Check `findSimilarLibraryExercise(name, muscleGroup, exerciseLibrary, 0.70)`
   - If `isMatch`, show warning BEFORE creating
   - **Also check if matched library item is already in template** - if so, show duplicate warning instead

```typescript
// Fuzzy match warning before inline creation
const similarMatch = findSimilarLibraryExercise(name, muscleGroup, exerciseLibrary, 0.70);
if (similarMatch.isMatch && similarMatch.matchedItem) {
  // Check if matched item is already in template
  const matchedLibraryId = similarMatch.matchedItem.id;
  if (selectedIds.includes(matchedLibraryId) || selectedExercises.some(se => se.libraryId === matchedLibraryId)) {
    // Already in template - show duplicate warning instead
    setDuplicateWarning({
      show: true,
      exerciseName: name,
      existingName: similarMatch.matchedItem.name,
    });
  } else {
    // Similar but not in template - show fuzzy match warning
    setFuzzyMatchWarning({
      show: true,
      exerciseName: name,
      suggestedName: similarMatch.matchedItem.name,
      suggestedMuscleGroup: similarMatch.matchedItem.muscleGroup,
    });
  }
  return;
}
```

**Acceptance Criteria**:
- [ ] Warning shown for duplicates
- [ ] Warning shown for similar library items (before creation)
- [ ] User can choose library version or create new
- [ ] Drawer stays open after warning dismissed

---

### 6. "Start Workout" Button After Template Creation

**Files**: `src/components/TemplateEditor.tsx`, `src/routes/templates.new.tsx`

**Route exists**: `/workouts/start/$templateId`

**Required Changes**:

1. `TemplateEditor.tsx`:
```typescript
const [createdTemplate, setCreatedTemplate] = useState<Template | null>(null);

// In handleSubmit create mode:
toast.success('Template created!');
setCreatedTemplate(template);

// Add post-creation UI:
{createdTemplate && (
  <div className="mt-6 p-4 bg-green-50 rounded-lg border">
    <h3 className="font-semibold mb-2">Template Created!</h3>
    <p className="text-sm mb-4">Your template "{createdTemplate.name}" is ready.</p>
    <div className="flex gap-3">
      <Button asChild>
        <a href={`/workouts/start/${createdTemplate.id}`}>Start Workout</a>
      </Button>
      <Button variant="outline" asChild>
        <a href={`/templates/${createdTemplate.id}`}>View Template</a>
      </Button>
    </div>
  </div>
)}
```

2. `templates.new.tsx` - Remove auto-navigate:
```typescript
const handleSaved = useCallback((template: Template) => {
  // REMOVE: setTimeout navigation
  // Let TemplateEditor show Start Workout UI
}, []);
```

**Acceptance Criteria**:
- [ ] "Start Workout" button appears after creation
- [ ] User stays on page until they choose action
- [ ] Both buttons work correctly

---

## 🟡 P2 - Medium Priority

### 7. Replace Modal with Drawer (Mobile-First)

**Files**: `src/components/TemplateEditor.tsx`

**Component exists**: `src/components/ui/Drawer.tsx` (uses `vaul` library)

**Required Changes**:
```typescript
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose, DrawerTitle, DrawerHeader } from '@/components/ui/Drawer';

<Drawer open={showExerciseSelector} onOpenChange={setShowExerciseSelector}>
  <DrawerTrigger asChild>
    <Button onClick={() => setShowExerciseSelector(true)}>Add Exercise</Button>
  </DrawerTrigger>
  <DrawerContent className="max-w-2xl mx-auto">
    <DrawerHeader>
      <DrawerTitle>Add Exercise</DrawerTitle>
    </DrawerHeader>
    <ExerciseSearch
      selectedIds={selectedExercises.map(se => se.exerciseId)}
      onSelect={handleAddExercise}
      onCreateInline={/* inline creation logic */}
      userExercises={exercises}
    />
    <DrawerClose asChild>
      <Button variant="outline" className="mx-4 mb-4">Done</Button>
    </DrawerClose>
  </DrawerContent>
</Drawer>
```

**Key behavior**: Drawer stays open for multiple selections (don't close on select)

**Acceptance Criteria**:
- [ ] Exercise search uses Drawer (bottom sheet)
- [ ] Drawer stays open after selecting exercise
- [ ] "Done" or backdrop click closes drawer
- [ ] Works on both mobile and desktop

---

### 8. Touch Targets 44x44px Minimum

**Files**: `src/components/ui/Button.tsx`

**Current value**: `'icon-sm': 'size-8'` (32x32px - too small)

**Required Changes**:
```typescript
'icon-sm': 'size-8 min-h-[44px] min-w-[44px]',  // Add min touch target
```

**Alternative** - create a new size for touch-friendly icons:
```typescript
'icon-touch': 'size-11',  // 44x44px native
```

**Files to audit**:
- `src/components/TemplateEditor.tsx` - Undo/Redo buttons
- `src/components/ExerciseList.tsx` - Edit/Remove buttons
- `src/components/InlineEditExercise.tsx` - Cancel/Save buttons

**Acceptance Criteria**:
- [ ] All icon buttons meet 44x44px minimum
- [ ] No accidental taps on adjacent buttons

---

### 9. Modal/Drawer Accessibility

**Files**: `src/components/TemplateEditor.tsx`

- Drawer from `vaul` handles focus trap and escape key
- Add `aria-label` to close button

**Acceptance Criteria**:
- [ ] Escape key closes drawer
- [ ] Focus managed properly
- [ ] Close button has aria-label

---

### 10. Keyboard Accessible Drag-and-Drop

**Files**: `src/components/ExerciseList.tsx`, `src/components/TemplateEditor.tsx`

**Required Changes**:

1. **ExerciseList.tsx** - Add move up/down buttons:
```typescript
import { ChevronUp, ChevronDown } from 'lucide-react';

// Add to each exercise item buttons:
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
```

2. **TemplateEditor.tsx** - Add handlers:
```typescript
const handleMoveUp = useCallback((index: number) => {
  if (index === 0) return;
  handleReorder(index, index - 1);
}, [handleReorder]);

const handleMoveDown = useCallback((index: number) => {
  if (index === selectedExercises.length - 1) return;
  handleReorder(index, index + 1);
}, [handleReorder, selectedExercises.length]);
```

**Acceptance Criteria**:
- [ ] Move up/down buttons visible on hover/focus
- [ ] Keyboard navigation works
- [ ] First item can't move up, last can't move down

---

## 🟢 P3 - Code Quality

### 11. User-Facing Error Handling

**Files**: `src/components/TemplateEditor.tsx`

**Required Changes**:
- Add `error` state with user-friendly message
- Show error banner with retry button
- Call `toast.error()` for important errors

**Acceptance Criteria**:
- [ ] Network errors show user-friendly message
- [ ] Retry option available
- [ ] Error clears on successful retry

---

### 12. Parallel Exercise Saves

**Files**: `src/components/TemplateEditor.tsx:200-210`

**Required Changes**:
```typescript
// Change from:
for (let i = 0; i < selectedExercises.length; i++) {
  await fetch(...);
}

// To:
await Promise.all(
  selectedExercises.map((exercise, index) =>
    fetch(`/api/templates/${template.id}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        exerciseId: exercise.exerciseId,
        orderIndex: index,
      }),
    })
  )
);
```

**Acceptance Criteria**:
- [ ] Template with 10 exercises saves quickly
- [ ] All exercises have correct orderIndex

---

### 13. Remove DOM Query Antipattern

**Files**: `src/components/ExerciseList.tsx:44,54,76`

**Required Changes**:
- Use React refs instead of `document.querySelectorAll('.exercise-item')`

```typescript
const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

// In the map:
<div
  ref={(el) => {
    if (el) itemRefs.current.set(exercise.id, el);
    else itemRefs.current.delete(exercise.id);
  }}
  // ...
>

// In handleDragOver - use refs instead of querySelectorAll
itemRefs.current.forEach((el, id) => {
  const itemIndex = exercises.findIndex(ex => ex.id === id);
  if (itemIndex === index && draggedIndex !== null && itemIndex !== draggedIndex) {
    el.classList.add('border-primary');
  } else {
    el.classList.remove('border-primary');
  }
});
```

**Acceptance Criteria**:
- [ ] No `document.querySelectorAll` in drag handlers
- [ ] Performance improved for large lists

---

## Summary Checklist

### P0 - Critical
- [ ] 1. Undo/Redo updates UI state
- [ ] 2. Library exercises create DB record with libraryId
- [ ] 3. Inline creation persists to database
- [ ] 4. Auto-save includes exercise changes

### P1 - High
- [ ] 5. DuplicateWarning integrated (duplicate + fuzzy match cases)
- [ ] 6. "Start Workout" button after template creation

### P2 - Medium
- [ ] 7. Drawer for exercise search (mobile-first, stays open)
- [ ] 8. Touch targets 44x44px minimum
- [ ] 9. Drawer accessibility (escape, focus, ARIA)
- [ ] 10. Keyboard accessible reordering

### P3 - Low
- [ ] 11. User-facing error handling with retry
- [ ] 12. Parallel exercise saves
- [ ] 13. Remove DOM query antipattern

---

## Testing Commands

```bash
bun run typecheck
bun run lint
bun run test
bun run test:e2e
```

---

## Existing Components (Verified)

| Component | Path | Status |
|-----------|------|--------|
| Drawer | `src/components/ui/Drawer.tsx` | ✅ Exists (vaul) |
| DuplicateWarning | `src/components/ui/DuplicateWarning.tsx` | ✅ Exists (unused) |
| Start Workout Page | `src/routes/workouts.start.$templateId.tsx` | ✅ Exists |
| Fuzzy Match | `src/lib/fuzzy-match.ts` | ✅ Exists |
| Exercise API | `src/routes/api/exercises.ts` | ✅ Supports libraryId |
| Schema | `src/lib/db/schema.ts` | ✅ Has libraryId column |

---

## Implementation Order

1. **P0-4** (Auto-save exercises) - Foundation
2. **P0-2** (Library exercises) - Pre-requisite for P0-3
3. **P0-3** (Inline creation) - Uses P0-2 logic
4. **P0-1** (Undo/Redo) - UI state management
5. **P1-5** (DuplicateWarning) - Uses fuzzy match
6. **P1-6** (Start Workout) - Simple UI addition
7. **P2-7** (Drawer) - Major UI change
8. **P2-8** (Touch targets) - Quick fix
9. **P2-9** (A11y) - Handled by Drawer
10. **P2-10** (Keyboard DnD) - Component update
11. **P3-11,12,13** - Code quality
